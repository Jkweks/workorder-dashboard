import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dayjs from 'dayjs';
import { query, tx } from './db.js';
import { workOrderPdf } from './pdf.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Helper: generate WO number WO-YYYYMMDD-###
async function generateWorkOrderNumber() {
  const prefix = `WO-${dayjs().format('YYYYMMDD')}-`;
  const { rows } = await query(
    `SELECT work_order_number FROM work_orders WHERE work_order_number LIKE $1`,
    [prefix + '%']
  );
  const nums = rows
    .map((r) => Number(r.work_order_number.split('-').pop()))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) + 1 : 1).toString().padStart(3, '0');
  return prefix + next;
}

// List/search
app.get('/api/work-orders', async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = [];
    const params = [];
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(job_number ILIKE $${params.length} OR job_name ILIKE $${params.length} OR job_pm ILIKE $${params.length} OR job_address ILIKE $${params.length} OR work_order_number ILIKE $${params.length})`);
    }
    const sql = `SELECT * FROM work_orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// Create
app.post('/api/work-orders', async (req, res, next) => {
  try {
    const b = req.body || {};
    const woNo = await generateWorkOrderNumber();

    const result = await tx(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO work_orders (
          job_number, job_name, job_pm, job_address, job_superintendent,
          date_issued, work_order_number, material_delivery_date, requested_completion_dates, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
        [
          b.jobNumber, b.jobName, b.jobPM || null, b.jobAddress || null, b.jobSuperintendent || null,
          b.dateIssued, woNo, b.materialDeliveryDate || null, b.requestedCompletionDates || [], b.status || 'Draft'
        ]
      );
      const order = rows[0];

      // items
      for (const it of b.items || []) {
        const { rows: itemRows } = await client.query(
          `INSERT INTO work_order_items (work_order_id, type, elevation, quantity)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [order.id, it.type, it.elevation || null, it.quantity || 0]
        );
        const item = itemRows[0];
        for (const d of it.completionDates || []) {
          await client.query(
            `INSERT INTO work_order_item_completion_dates (item_id, completion_date) VALUES ($1,$2)`,
            [item.id, d]
          );
        }
      }
      return order;
    });

    res.status(201).json(result);
  } catch (e) { next(e); }
});

// Read single (with items)
app.get('/api/work-orders/:id', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM work_orders WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const order = rows[0];
    const itemsRes = await query(
      `SELECT i.*, COALESCE(json_agg(row_to_json(c)) FILTER (WHERE c.id IS NOT NULL), '[]') AS completion_dates
       FROM work_order_items i
       LEFT JOIN work_order_item_completion_dates c ON c.item_id = i.id
       WHERE i.work_order_id = $1
       GROUP BY i.id
       ORDER BY i.id`,
      [order.id]
    );
    res.json({ order, items: itemsRes.rows });
  } catch (e) { next(e); }
});

// Update (summary + status + items wholesale replace for simplicity)
app.put('/api/work-orders/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    const updated = await tx(async (client) => {
      const { rows } = await client.query(
        `UPDATE work_orders SET
          job_number=$1, job_name=$2, job_pm=$3, job_address=$4, job_superintendent=$5,
          date_issued=$6, material_delivery_date=$7, requested_completion_dates=$8, status=$9, updated_at=now()
         WHERE id=$10 RETURNING *`,
        [
          b.jobNumber, b.jobName, b.jobPM || null, b.jobAddress || null, b.jobSuperintendent || null,
          b.dateIssued, b.materialDeliveryDate || null, b.requestedCompletionDates || [], b.status || 'Draft', req.params.id
        ]
      );
      const order = rows[0];
      if (!order) return null;

      // replace items
      await client.query('DELETE FROM work_order_item_completion_dates USING work_order_items i WHERE work_order_item_completion_dates.item_id = i.id AND i.work_order_id = $1', [order.id]);
      await client.query('DELETE FROM work_order_items WHERE work_order_id = $1', [order.id]);

      for (const it of b.items || []) {
        const { rows: itemRows } = await client.query(
          `INSERT INTO work_order_items (work_order_id, type, elevation, quantity)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [order.id, it.type, it.elevation || null, it.quantity || 0]
        );
        const item = itemRows[0];
        for (const d of it.completionDates || []) {
          await client.query(
            `INSERT INTO work_order_item_completion_dates (item_id, completion_date) VALUES ($1,$2)`,
            [item.id, d]
          );
        }
      }
      return order;
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) { next(e); }
});

// Delete
app.delete('/api/work-orders/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM work_orders WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

// PDF
app.get('/api/work-orders/:id/pdf', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM work_orders WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const order = rows[0];
    const itemsRes = await query(
      `SELECT i.*, COALESCE(json_agg(row_to_json(c)) FILTER (WHERE c.id IS NOT NULL), '[]') AS completion_dates
       FROM work_order_items i
       LEFT JOIN work_order_item_completion_dates c ON c.item_id = i.id
       WHERE i.work_order_id = $1
       GROUP BY i.id
       ORDER BY i.id`,
      [order.id]
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${order.work_order_number}.pdf"`);
    const pdfStream = workOrderPdf(order, itemsRes.rows);
    pdfStream.pipe(res);
  } catch (e) { next(e); }
});

// Errors
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));

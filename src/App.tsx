import React, { useEffect, useMemo, useState } from "react";

// ======================
// API helper (inline)
// ======================
const API_URL = (import.meta as any).env?.VITE_API_URL || "http://192.168.4.251:4000";

async function apiListWorkOrders(params: { q?: string; status?: string } = {}) {
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_URL}/api/work-orders${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to list work orders");
  return (await res.json()) as any[];
}
async function apiCreateWorkOrder(payload: any) {
  const res = await fetch(`${API_URL}/api/work-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create work order");
  return await res.json();
}
async function apiUpdateWorkOrder(id: string, payload: any) {
  const res = await fetch(`${API_URL}/api/work-orders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update work order");
  return await res.json();
}
async function apiDeleteWorkOrder(id: string) {
  const res = await fetch(`${API_URL}/api/work-orders/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete work order");
}
async function apiGetWorkOrder(id: string) {
  const res = await fetch(`${API_URL}/api/work-orders/${id}`);
  if (!res.ok) throw new Error("Not found");
  return await res.json();
}
function apiPdfUrl(id: string) {
  return `${API_URL}/api/work-orders/${id}/pdf`;
}

// ======================
// Types / constants
// ======================
const ITEM_TYPES = ["Door", "Storefront", "Curtainwall", "Window wall"] as const;
const STATUSES = ["Draft", "Issued", "In Progress", "On Hold", "Complete"] as const;
const ITEM_STATUSES = ["In Progress", "On Hold", "Complete"] as const;
const HOLD_REASONS = [
  "Material Issues",
  "Short Material",
  "Waiting on Answers",
  "PM/Super Requested",
] as const;

type ItemType = typeof ITEM_TYPES[number];
type Status = typeof STATUSES[number];
type ItemStatus = typeof ITEM_STATUSES[number];
type HoldReason = typeof HOLD_REASONS[number];

type WorkOrderItem = {
  id: string;
  type: ItemType;
  elevation: string;
  quantity: number;
  completionDates: string[]; // ISO dates, one or many
  status: ItemStatus;
  holdReason?: HoldReason | "";
};

type WorkOrder = {
  id: string;
  // Summary fields
  jobNumber: string;
  jobName: string;
  jobPM: string;
  jobAddress: string;
  jobSuperintendent: string;
  dateIssued: string; // ISO date
  workOrderNumber: string; // system generated
  materialDeliveryDate: string; // ISO date
  requestedCompletionDates: string[]; // supports multiple
  // Content
  items: WorkOrderItem[];
  status: Status;
  createdAt: number | string;
  updatedAt: number | string;
};

// ---- Utilities ----
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

function statusColor(status: string) {
  switch (status) {
    case "Draft":
      return "bg-slate-700";
    case "Issued":
      return "bg-green-700";
    case "In Progress":
      return "bg-blue-700";
    case "On Hold":
      return "bg-orange-600";
    case "Complete":
      return "bg-green-900";
    default:
      return "bg-slate-900";
  }
}

function saveLocal(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ======================
// Root App
// ======================
export default function App() {
  const [orders, setOrders] = useState<WorkOrder[]>(() => loadLocal("wo:data", []));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from API on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiListWorkOrders();
        // Map API fields -> UI fields if needed
        const mapped: WorkOrder[] = data.map((o: any) => ({
          id: o.id,
          jobNumber: o.job_number,
          jobName: o.job_name,
          jobPM: o.job_pm || "",
          jobAddress: o.job_address || "",
          jobSuperintendent: o.job_superintendent || "",
          dateIssued: o.date_issued,
          workOrderNumber: o.work_order_number,
          materialDeliveryDate: o.material_delivery_date || "",
          requestedCompletionDates: o.requested_completion_dates || [],
          items: [],
          status: (o.status || "Draft") as Status,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        }));
        setOrders(mapped);
        setApiOk(true);
        setError(null);
      } catch (e: any) {
        console.warn("API unavailable; falling back to localStorage.", e);
        setApiOk(false);
        setError("API not reachable — using browser storage only.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    saveLocal("wo:data", orders);
  }, [orders]);

  const onCreate = async (o: WorkOrder) => {
    if (apiOk) {
      try {
        const payload = {
          jobNumber: o.jobNumber,
          jobName: o.jobName,
          jobPM: o.jobPM,
          jobAddress: o.jobAddress,
          jobSuperintendent: o.jobSuperintendent,
          dateIssued: o.dateIssued,
          materialDeliveryDate: o.materialDeliveryDate || null,
          requestedCompletionDates: o.requestedCompletionDates || [],
          status: o.status,
          items: o.items.map((it) => ({
            type: it.type,
            elevation: it.elevation,
            quantity: it.quantity,
            completionDates: it.completionDates || [],
            status: it.status,
            holdReason: it.holdReason || null,
          })),
        };
        const created = await apiCreateWorkOrder(payload);
        const mapped: WorkOrder = {
          id: created.id,
          jobNumber: created.job_number,
          jobName: created.job_name,
          jobPM: created.job_pm || "",
          jobAddress: created.job_address || "",
          jobSuperintendent: created.job_superintendent || "",
          dateIssued: created.date_issued,
          workOrderNumber: created.work_order_number,
          materialDeliveryDate: created.material_delivery_date || "",
          requestedCompletionDates: created.requested_completion_dates || [],
          items: [],
          status: (created.status || "Draft") as Status,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
        };
        setOrders((prev) => [mapped, ...prev]);
        return;
      } catch (e) {
        console.error(e);
      }
    }
    // Fallback local create (no server WO#)
    setOrders((prev) => [o, ...prev]);
  };

  const onUpdate = async (id: string, patch: Partial<WorkOrder>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    if (apiOk) {
      try {
        const merged = orders.find((o) => o.id === id);
        const finalObj = { ...(merged as any), ...patch } as WorkOrder;
        const payload = {
          jobNumber: finalObj.jobNumber,
          jobName: finalObj.jobName,
          jobPM: finalObj.jobPM,
          jobAddress: finalObj.jobAddress,
          jobSuperintendent: finalObj.jobSuperintendent,
          dateIssued: finalObj.dateIssued,
          materialDeliveryDate: finalObj.materialDeliveryDate || null,
          requestedCompletionDates: finalObj.requestedCompletionDates || [],
          status: finalObj.status,
          items: (finalObj.items || []).map((it) => ({
            type: it.type,
            elevation: it.elevation,
            quantity: it.quantity,
            completionDates: it.completionDates || [],
            status: it.status,
            holdReason: it.holdReason || null,
          })),
        };
        await apiUpdateWorkOrder(id, payload);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const onDelete = async (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    if (apiOk) {
      try { await apiDeleteWorkOrder(id); } catch (e) { console.error(e); }
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "All" ? true : o.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchesQ = q
        ? [
            o.jobNumber,
            o.jobName,
            o.jobPM,
            o.jobAddress,
            o.jobSuperintendent,
            o.workOrderNumber,
          ]
            .filter(Boolean)
            .some((s) => s.toLowerCase().includes(q))
        : true;
      return matchesStatus && matchesQ;
    });
  }, [orders, query, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 sticky top-0 bg-slate-950/80 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="text-2xl font-semibold tracking-tight">Work Orders</div>
          <span className="text-xs text-slate-400">Dashboard & Form</span>
          {loading && <span className="ml-2 text-xs text-sky-400">Loading…</span>}
          {error && <span className="ml-2 text-xs text-amber-400">{error}</span>}
          <div className="ml-auto flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search job, WO #, PM…"
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status | "All")}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700"
            >
              <option value="All">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700"
            >
              {viewMode === 'cards' ? 'Table View' : 'Card View'}
            </button>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-medium"
            >
              {showForm ? "Close Form" : "New Work Order"}
            </button>
            <ExportButton orders={orders} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {showForm && (
          <div className="mb-6">
            <WorkOrderForm onCreate={onCreate} />
          </div>
        )}

        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((o) => (
              <WorkOrderCard key={o.id} order={o} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
            {filtered.length === 0 && (
              <div className="text-slate-400">No work orders found. Create one to get started.</div>
            )}
          </div>
        ) : (
          <WorkOrderTable orders={filtered} onUpdate={onUpdate} onDelete={onDelete} />
        )}
      </main>
    </div>
  );
}

// ======================
// Form (client-side only; API create handled in parent)
// ======================
function WorkOrderForm({ onCreate }: { onCreate: (o: WorkOrder) => void }) {
  const [summary, setSummary] = useState({
    jobNumber: "",
    jobName: "",
    jobPM: "",
    jobAddress: "",
    jobSuperintendent: "",
    dateIssued: todayISO(),
    materialDeliveryDate: "",
    requestedCompletionDates: [] as string[],
  });

  const [items, setItems] = useState<WorkOrderItem[]>([]);

  useEffect(() => {
    if (items.length === 0) addItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        type: "Door",
        elevation: "",
        quantity: 1,
        completionDates: [],
        status: "In Progress",
        holdReason: "",
      },
    ]);

  const updateItem = (id: string, patch: Partial<WorkOrderItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const addRequestedDate = (d: string) => {
    if (!d) return;
    setSummary((s) => ({
      ...s,
      requestedCompletionDates: Array.from(new Set([...(s.requestedCompletionDates || []), d])),
    }));
  };
  const removeRequestedDate = (d: string) =>
    setSummary((s) => ({
      ...s,
      requestedCompletionDates: (s.requestedCompletionDates || []).filter((x) => x !== d),
    }));

  const create = () => {
    const workOrder: WorkOrder = {
      id: uid(),
      jobNumber: summary.jobNumber.trim(),
      jobName: summary.jobName.trim(),
      jobPM: summary.jobPM.trim(),
      jobAddress: summary.jobAddress.trim(),
      jobSuperintendent: summary.jobSuperintendent.trim(),
      dateIssued: summary.dateIssued || todayISO(),
      workOrderNumber: "(pending)", // API will generate the real value
      materialDeliveryDate: summary.materialDeliveryDate || "",
      requestedCompletionDates: summary.requestedCompletionDates || [],
      items: items.map((it) => ({ ...it, quantity: Number(it.quantity) || 0 })),
      status: "Draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreate(workOrder);
    // reset
    setSummary({
      jobNumber: "",
      jobName: "",
      jobPM: "",
      jobAddress: "",
      jobSuperintendent: "",
      dateIssued: todayISO(),
      materialDeliveryDate: "",
      requestedCompletionDates: [],
    });
    setItems([]);
    addItem();
  };

  const valid = summary.jobNumber && summary.jobName && items.length > 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow">
      <div className="text-lg font-semibold mb-3">New Work Order</div>

      {/* Summary fields */}
      <div className="grid md:grid-cols-2 gap-3">
        <TextField
          label="Job Number"
          value={summary.jobNumber}
          onChange={(v) => setSummary({ ...summary, jobNumber: v })}
          required
        />
        <TextField
          label="Job Name"
          value={summary.jobName}
          onChange={(v) => setSummary({ ...summary, jobName: v })}
          required
        />
        <TextField
          label="Project Manager"
          value={summary.jobPM}
          onChange={(v) => setSummary({ ...summary, jobPM: v })}
        />
        <TextField
          label="Job Address"
          value={summary.jobAddress}
          onChange={(v) => setSummary({ ...summary, jobAddress: v })}
        />
        <TextField
          label="Superintendent"
          value={summary.jobSuperintendent}
          onChange={(v) => setSummary({ ...summary, jobSuperintendent: v })}
        />
        <DateField
          label="Date Issued"
          value={summary.dateIssued}
          onChange={(v) => setSummary({ ...summary, dateIssued: v })}
        />
        <DateField
          label="Material Delivery Date"
          value={summary.materialDeliveryDate}
          onChange={(v) => setSummary({ ...summary, materialDeliveryDate: v })}
        />

        {/* Requested completion dates (support multiple) */}
        <div>
          <label className="block text-sm text-slate-300 mb-1">Requested Completion Dates</label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700"
              onChange={(e) => {
                const val = e.target.value;
                if (val.length === 10) {
                  addRequestedDate(val);
                  e.target.value = "";
                }
              }}
            />
            <span className="text-xs text-slate-400">Add multiple as needed</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(summary.requestedCompletionDates || []).map((d) => (
              <Chip key={d} onRemove={() => removeRequestedDate(d)}>
                {d}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="mt-5">
        <div className="font-medium mb-2">Items</div>
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-xl border border-slate-800 bg-slate-950 p-3"
            >
              <div className="grid md:grid-cols-4 gap-3">
                <SelectField
                  label="Type"
                  value={it.type}
                  options={ITEM_TYPES}
                  onChange={(v) => updateItem(it.id, { type: v as ItemType })}
                />
                <TextField
                  label="Elevation"
                  value={it.elevation}
                  onChange={(v) => updateItem(it.id, { elevation: v })}
                  placeholder="e.g., A1, North, Lobby"
                />
                <NumberField
                  label="Quantity"
                  value={it.quantity}
                  min={0}
                  onChange={(v) => updateItem(it.id, { quantity: v })}
                />
                <SelectField
                  label="Status"
                  value={it.status}
                  options={ITEM_STATUSES}
                  onChange={(v) =>
                    updateItem(it.id, {
                      status: v as ItemStatus,
                      holdReason:
                        v === "On Hold" ? it.holdReason || HOLD_REASONS[0] : "",
                    })
                  }
                />
              </div>
              {it.status === "On Hold" && (
                <div className="mt-3">
                  <SelectField
                    label="Hold Reason"
                    value={it.holdReason || HOLD_REASONS[0]}
                    options={HOLD_REASONS}
                    onChange={(v) =>
                      updateItem(it.id, { holdReason: v as HoldReason })
                    }
                  />
                </div>
              )}
              {/* Per-item completion dates (multiple) */}
              <div className="mt-3">
                <label className="block text-sm text-slate-300 mb-1">Completion Dates</label>
                <input
                  type="date"
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 w-full"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length === 10) {
                      updateItem(it.id, {
                        completionDates: Array.from(
                          new Set([...(it.completionDates || []), val])
                        ),
                      });
                      e.target.value = "";
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {(it.completionDates || []).map((d) => (
                    <Chip
                      key={d}
                      onRemove={() =>
                        updateItem(it.id, {
                          completionDates: (it.completionDates || []).filter(
                            (x) => x !== d
                          ),
                        })
                      }
                    >
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-right">
                <button
                  onClick={() => removeItem(it.id)}
                  className="text-sm px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500"
                >
                  Remove Item
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={addItem}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700"
          >
            + Add Item
          </button>
          <button
            onClick={create}
            disabled={!summary.jobNumber || !summary.jobName || items.length === 0}
            className={
              "px-4 py-2 rounded-xl font-medium " +
              (summary.jobNumber && summary.jobName && items.length > 0
                ? "bg-indigo-600 hover:bg-indigo-500"
                : "bg-slate-700 text-slate-400 cursor-not-allowed")
            }
          >
            Create Work Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================
// Table view
// ======================
function WorkOrderTable({
  orders,
  onUpdate,
  onDelete,
}: {
  orders: WorkOrder[];
  onUpdate: (id: string, patch: Partial<WorkOrder>) => void;
  onDelete: (id: string) => void;
}) {
  if (orders.length === 0)
    return (
      <div className="text-slate-400">No work orders found. Create one to get started.</div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left bg-slate-900">
            <th className="p-2">Job Name</th>
            <th className="p-2">WO #</th>
            <th className="p-2">Job #</th>
            <th className="p-2">PM</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr
              key={o.id}
              className={`border-b border-slate-800 ${statusColor(o.status)} text-white`}
            >
              <td className="p-2">{o.jobName}</td>
              <td className="p-2">{o.workOrderNumber}</td>
              <td className="p-2">{o.jobNumber}</td>
              <td className="p-2">{o.jobPM || "—"}</td>
              <td className="p-2">
                <select
                  value={o.status}
                  onChange={(e) => onUpdate(o.id, { status: e.target.value as Status })}
                  className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-2 space-x-2">
                <a
                  href={apiPdfUrl(o.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
                >
                  PDF
                </a>
                <button
                  onClick={() => onDelete(o.id)}
                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ======================
// Card (now fetches items on expand and adds PDF button)
// ======================
function WorkOrderCard({
  order,
  onUpdate,
  onDelete,
}: {
  order: WorkOrder;
  onUpdate: (id: string, patch: Partial<WorkOrder>) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WorkOrderItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function ensureItems() {
    if (items) return;
    try {
      setLoading(true);
      const data = await apiGetWorkOrder(order.id);
      const mapped: WorkOrderItem[] = (data.items || []).map((it: any) => ({
        id: it.id,
        type: (it.type || "Door") as ItemType,
        elevation: it.elevation || "",
        quantity: it.quantity || 0,
        completionDates: (it.completion_dates || []).map(
          (c: any) => c.completion_date
        ),
        status: (it.status || "In Progress") as ItemStatus,
        holdReason: it.hold_reason || "",
      }));
      setItems(mapped);
    } catch (e) {
      // ignore; leave null
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) ensureItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const markComplete = (itemId: string) => {
    const date = todayISO();
    setItems((prev) => {
      const updated = (prev || []).map((it) =>
        it.id === itemId
          ? {
              ...it,
              completionDates: Array.from(
                new Set([...(it.completionDates || []), date])
              ),
              status: "Complete" as ItemStatus,
              holdReason: "" as HoldReason | "",
            }
          : it
      );
      onUpdate(order.id, { items: updated });
      return updated;
    });
  };

  const updateItem = (id: string, patch: Partial<WorkOrderItem>) => {
    setItems((prev) => {
      const updated = (prev || []).map((it) =>
        it.id === id ? { ...it, ...patch } : it
      );
      onUpdate(order.id, { items: updated });
      return updated;
    });
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 p-4 text-white ${statusColor(order.status)}`}
    >
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setOpen((s) => !s)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold truncate">{order.jobName}</div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
              {order.workOrderNumber}
            </span>
          </div>
          <div className="text-sm text-slate-300 truncate">
            #{order.jobNumber} • PM: {order.jobPM || "—"} • Issued {order.dateIssued}
          </div>
          <div className="text-xs text-slate-400 truncate">{order.jobAddress || "—"}</div>
        </div>
        <select
          value={order.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate(order.id, { status: e.target.value as Status })}
          className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Dates summary */}
      <div className="mt-3 flex flex-wrap gap-2">
        {order.materialDeliveryDate && (
          <Badge>Material: {order.materialDeliveryDate}</Badge>
        )}
        {(order.requestedCompletionDates || []).map((d) => (
          <Badge key={d}>Requested: {d}</Badge>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setOpen((s) => !s)}
          className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          {open ? "Hide Items" : `View Items`}
        </button>
        <a
          href={apiPdfUrl(order.id)}
          target="_blank"
          rel="noreferrer"
          className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500"
        >
          Download PDF
        </a>
        <button
          onClick={() => onDelete(order.id)}
          className="text-sm px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500"
        >
          Delete
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {loading && <div className="text-slate-400 text-sm">Loading items…</div>}
          {!loading &&
            items &&
            items.map((it) => (
              <div
                key={it.id}
                className={`rounded-xl border border-slate-800 p-3 ${statusColor(
                  it.status
                )}`}
              >
                <div className="text-sm font-medium">
                  {it.type} • Elevation: {it.elevation || "—"} • Qty: {it.quantity}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={it.status}
                    onChange={(e) =>
                      updateItem(it.id, {
                        status: e.target.value as ItemStatus,
                        holdReason:
                          e.target.value === "On Hold" ? it.holdReason : "",
                      })
                    }
                    className="px-2 py-1 rounded bg-slate-950 border border-slate-700"
                  >
                    {ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {it.status === "On Hold" && (
                    <select
                      value={it.holdReason || ""}
                      onChange={(e) =>
                        updateItem(it.id, {
                          holdReason: e.target.value as HoldReason,
                        })
                      }
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-700"
                    >
                      <option value="">Select reason</option>
                      {HOLD_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                  {it.status !== "Complete" && (
                    <button
                      onClick={() => markComplete(it.id)}
                      className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-300 flex flex-wrap gap-2">
                  {(it.completionDates || []).map((d) => (
                    <Badge key={d}>Complete: {d}</Badge>
                  ))}
                  {(!it.completionDates || it.completionDates.length === 0) && (
                    <span className="text-slate-500">No completion dates</span>
                  )}
                </div>
              </div>
            ))}
          {!loading && !items && (
            <div className="text-slate-500 text-sm">No items loaded.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Small UI primitives ----
function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 w-full outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 w-full"
      />
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 w-full"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 w-full"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
      {children}
      <button
        onClick={onRemove}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 hover:bg-slate-600"
        title="Remove"
      >
        ×
      </button>
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
      {children}
    </span>
  );
}

function ExportButton({ orders }: { orders: WorkOrder[] }) {
  const download = () => {
    const blob = new Blob([JSON.stringify(orders, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work_orders_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={download} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700">
      Export JSON
    </button>
  );
}

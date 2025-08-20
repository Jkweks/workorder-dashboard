import React, { useEffect, useState } from "react";
import {
  WorkOrder,
  WorkOrderItem,
  ItemType,
  ItemStatus,
  HoldReason,
  Status,
  STATUSES,
  ITEM_STATUSES,
  HOLD_REASONS,
  Scope,
} from "../types";
import { todayISO, statusColor } from "../utils";
import { apiGetWorkOrder, apiPdfUrl } from "../api";
import Badge from "./Badge";

type Props = {
  order: WorkOrder;
  onUpdate: (id: string, patch: Partial<WorkOrder>) => void;
  onDelete: (id: string) => void;
  onEdit: (order: WorkOrder) => void;
};

export default function WorkOrderCard({ order, onUpdate, onDelete, onEdit }: Props) {
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
        scope: (it.scope || "Kit") as Scope,
        type: (it.type || "Door") as ItemType,
        elevation: it.elevation || "",
        quantity: it.quantity || 0,
        completionDates: (it.completion_dates || []).map((c: any) => c.completion_date),
        status: (it.status || "In Progress") as ItemStatus,
        holdReason: it.hold_reason || "",
      }));
      setItems(mapped);
    } catch {
      // ignore
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
              completionDates: Array.from(new Set([...(it.completionDates || []), date])),
              status: "Complete" as ItemStatus,
              holdReason: "" as HoldReason | "",
            }
          : it
      );
      const allDates = updated.flatMap((i) => i.completionDates || []);
      const uniq = Array.from(new Set(allDates));
      const completionDate = uniq.sort().slice(-1)[0] || "";
      const completionVaries = uniq.length > 1;
      onUpdate(order.id, { items: updated, completionDate, completionVaries });
      return updated;
    });
  };

  const updateItem = (id: string, patch: Partial<WorkOrderItem>) => {
    setItems((prev) => {
      const updated = (prev || []).map((it) => (it.id === id ? { ...it, ...patch } : it));
      const allDates = updated.flatMap((i) => i.completionDates || []);
      const uniq = Array.from(new Set(allDates));
      const completionDate = uniq.sort().slice(-1)[0] || "";
      const completionVaries = uniq.length > 1;
      onUpdate(order.id, { items: updated, completionDate, completionVaries });
      return updated;
    });
  };

  return (
    <div className={`rounded-2xl border border-slate-800 p-4 text-white ${statusColor(order.status)}`}>
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setOpen((s) => !s)}>
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
        {order.materialDeliveryDate && <Badge>Material: {order.materialDeliveryDate}</Badge>}
        {order.completionVaries ? (
          <Badge>Completion: Varies</Badge>
        ) : (
          order.completionDate && <Badge>Completion: {order.completionDate}</Badge>
        )}
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
          onClick={() => onEdit({ ...order, items: items || [] })}
          className="text-sm px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600"
        >
          Edit
        </button>
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
              <div key={it.id} className={`rounded-xl border border-slate-800 p-3 ${statusColor(it.status)}`}>
                <div className="text-sm font-medium">
                  {it.type} • Elevation: {it.elevation || "—"} • Qty: {it.quantity}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={it.status}
                    onChange={(e) =>
                      updateItem(it.id, {
                        status: e.target.value as ItemStatus,
                        holdReason: e.target.value === "On Hold" ? it.holdReason : "",
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

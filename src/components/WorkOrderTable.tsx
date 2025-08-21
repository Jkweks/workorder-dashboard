import React from "react";
import { WorkOrder, Status, STATUSES } from "../types";
import { statusColor } from "../utils";
import { apiPdfUrl } from "../api";

type Props = {
  orders: WorkOrder[];
  onUpdate: (id: string, patch: Partial<WorkOrder>) => void;
  onDelete: (id: string) => void;
  onOpen: (o: WorkOrder) => void;
  onEdit: (o: WorkOrder) => void;
};

export default function WorkOrderTable({ orders, onUpdate, onDelete, onOpen, onEdit }: Props) {
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
            <th className="p-2">Completion</th>
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
                {o.completionVaries ? "Varies" : o.completionDate || "—"}
              </td>
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
                <button
                  onClick={() => onOpen(o)}
                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                >
                  Open
                </button>
                <a
                  href={apiPdfUrl(o.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
                >
                  PDF
                </a>
                <button
                  onClick={() => onEdit(o)}
                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                >
                  Edit
                </button>
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

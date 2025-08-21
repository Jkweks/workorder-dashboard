import React, { useEffect, useMemo, useState } from "react";
import {
  WorkOrder,
  Status,
  STATUSES,
  ROLES,
  Role,
} from "./types";
import {
  apiListWorkOrders,
  apiCreateWorkOrder,
  apiUpdateWorkOrder,
  apiDeleteWorkOrder,
} from "./api";
import { loadLocal, saveLocal } from "./utils";
import WorkOrderForm from "./components/WorkOrderForm";
import WorkOrderTable from "./components/WorkOrderTable";
import ExportButton from "./components/ExportButton";

export default function App() {
  const ALL_STATUSES = STATUSES as unknown as Status[];
  const ROLE_CONFIG: Record<
    Role,
    { visible: Status[]; editable: Status[]; canCreate: boolean; canDelete: boolean }
  > = {
    Manager: {
      visible: ALL_STATUSES,
      editable: ALL_STATUSES,
      canCreate: true,
      canDelete: true,
    },
    "Project Manager": {
      visible: ALL_STATUSES,
      editable: ["Draft", "Submitted for Review"],
      canCreate: true,
      canDelete: false,
    },
    "Fab Manager": {
      visible: ALL_STATUSES,
      editable: ["Submitted for Review", "Released to Fab", "Completed"],
      canCreate: false,
      canDelete: false,
    },
    Fabricator: {
      visible: ["Submitted for Review", "Released to Fab", "Completed"],
      editable: ["Released to Fab", "Completed"],
      canCreate: false,
      canDelete: false,
    },
  };

  const [orders, setOrders] = useState<WorkOrder[]>(() =>
    loadLocal<WorkOrder[]>("wo:data", []).map((o) => ({
      ...o,
      completionDate: o.completionDate || "",
      completionVaries: o.completionVaries || false,
      division: o.division || "",
      system: o.system || "",
      notes: o.notes || "",
    }))
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [role, setRole] = useState<Role>("Manager");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [viewing, setViewing] = useState<WorkOrder | null>(null);
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
          division: o.division || "",
          jobName: o.job_name,
          jobPM: o.job_pm || "",
          jobAddress: o.job_address || "",
          jobSuperintendent: o.job_superintendent || "",
          system: o.system || "",
          notes: o.notes || "",
          dateIssued: o.date_issued,
          workOrderNumber: o.work_order_number,
          materialDeliveryDate: o.material_delivery_date || "",
          completionDate: o.completion_date || "",
          completionVaries: o.completion_varies || false,
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
          division: o.division,
          jobName: o.jobName,
          jobPM: o.jobPM,
          jobAddress: o.jobAddress,
          jobSuperintendent: o.jobSuperintendent,
          system: o.system,
          notes: o.notes,
          dateIssued: o.dateIssued,
          materialDeliveryDate: o.materialDeliveryDate || null,
          completionDate: o.completionDate || null,
          completionVaries: o.completionVaries || false,
          status: o.status,
          items: o.items.map((it) => ({
            type: it.type,
            scope: it.scope,
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
          division: created.division || o.division,
          jobName: created.job_name,
          jobPM: created.job_pm || "",
          jobAddress: created.job_address || "",
          jobSuperintendent: created.job_superintendent || "",
          system: created.system || o.system,
          notes: created.notes || o.notes,
          dateIssued: created.date_issued,
          workOrderNumber: created.work_order_number,
          materialDeliveryDate: created.material_delivery_date || "",
          completionDate: created.completion_date || "",
          completionVaries: created.completion_varies || false,
          items: o.items,
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
          division: finalObj.division,
          jobName: finalObj.jobName,
          jobPM: finalObj.jobPM,
          jobAddress: finalObj.jobAddress,
          jobSuperintendent: finalObj.jobSuperintendent,
          system: finalObj.system,
          notes: finalObj.notes,
          dateIssued: finalObj.dateIssued,
          materialDeliveryDate: finalObj.materialDeliveryDate || null,
          completionDate: finalObj.completionDate || null,
          completionVaries: finalObj.completionVaries || false,
          status: finalObj.status,
          items: (finalObj.items || []).map((it) => ({
            type: it.type,
            scope: it.scope,
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
      try {
        await apiDeleteWorkOrder(id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filtered = useMemo(() => {
    const config = ROLE_CONFIG[role];
    return orders.filter((o) => {
      const visible = config.visible.includes(o.status);
      const matchesStatus = statusFilter === "All" ? true : o.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchesQ = q
        ? [o.jobNumber, o.jobName, o.jobPM, o.jobAddress, o.jobSuperintendent, o.workOrderNumber]
            .filter(Boolean)
            .some((s) => s.toLowerCase().includes(q))
        : true;
      return visible && matchesStatus && matchesQ;
    });
  }, [orders, query, statusFilter, role]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 sticky top-0 bg-slate-950/80 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="text-2xl font-semibold tracking-tight">Work Orders</div>
          <span className="text-xs text-slate-400">Dashboard & Form</span>
          {loading && <span className="ml-2 text-xs text-sky-400">Loading…</span>}
          {error && <span className="ml-2 text-xs text-amber-400">{error}</span>}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as Role);
                setStatusFilter("All");
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
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
              {ROLE_CONFIG[role].visible.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {ROLE_CONFIG[role].canCreate && (
              <button
                onClick={() => setShowForm((s) => !s)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-medium"
              >
                {showForm ? "Close Form" : "New Work Order"}
              </button>
            )}
            <ExportButton orders={orders} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {(showForm || editing) && (
          <div className="mb-6">
            <WorkOrderForm
              initial={editing || undefined}
              onSubmit={(o) => {
                if (editing) {
                  onUpdate(o.id, o);
                  setEditing(null);
                } else {
                  onCreate(o);
                }
              }}
              onCancel={() => {
                if (editing) setEditing(null);
                else setShowForm(false);
              }}
            />
          </div>
        )}
        {viewing && (
          <div className="mb-6">
            <WorkOrderForm initial={viewing} readOnly onSubmit={() => {}} onCancel={() => setViewing(null)} />
          </div>
        )}

        <WorkOrderTable
          orders={filtered}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onOpen={(o) => setViewing(o)}
          onEdit={(o) => setEditing(o)}
          editableStatuses={ROLE_CONFIG[role].editable}
          canDelete={ROLE_CONFIG[role].canDelete}
        />
      </main>
    </div>
  );
}

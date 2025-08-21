import React, { useEffect, useState } from "react";
import {
  WorkOrder,
  WorkOrderItem,
  ItemType,
  ItemStatus,
  HoldReason,
  ITEM_TYPES,
  ITEM_STATUSES,
  HOLD_REASONS,
  System,
  Scope,
  SYSTEMS,
  SCOPES,
} from "../types";
import { uid, todayISO } from "../utils";
import { apiGetWorkOrder } from "../api";
import TextField from "./TextField";
import NumberField from "./NumberField";
import DateField from "./DateField";
import SelectField from "./SelectField";
import Chip from "./Chip";
import TextAreaField from "./TextAreaField";

type Props = {
  initial?: WorkOrder;
  onSubmit: (o: WorkOrder) => void;
  onCancel: () => void;
  readOnly?: boolean;
};

export default function WorkOrderForm({ initial, onSubmit, onCancel, readOnly = false }: Props) {
  const [summary, setSummary] = useState({
    jobNumber: initial?.jobNumber || "",
    system: initial?.system || SYSTEMS[0],
    jobName: initial?.jobName || "",
    jobPM: initial?.jobPM || "",
    jobAddress: initial?.jobAddress || "",
    jobSuperintendent: initial?.jobSuperintendent || "",
    dateIssued: initial?.dateIssued || todayISO(),
    materialDeliveryDate: initial?.materialDeliveryDate || "",
    completionDate: initial?.completionDate || "",
    notes: initial?.notes || "",
  });

  const [items, setItems] = useState<WorkOrderItem[]>(initial?.items || []);

  useEffect(() => {
    if (!initial && !readOnly) addItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initial && initial.id && (!initial.items || initial.items.length === 0)) {
      (async () => {
        try {
          const data = await apiGetWorkOrder(initial.id);
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
        }
      })();
    }
  }, [initial]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        scope: "Kit",
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

  const save = () => {
    let preparedItems = items.map((it) => ({ ...it, quantity: Number(it.quantity) || 0 }));
    let completionDate = summary.completionDate;
    let completionVaries = false;
    if (summary.completionDate) {
      preparedItems = preparedItems.map((it) => ({
        ...it,
        completionDates: [summary.completionDate],
      }));
    } else {
      const allDates = preparedItems.flatMap((it) => it.completionDates || []);
      const uniq = Array.from(new Set(allDates));
      completionDate = uniq.sort().slice(-1)[0] || "";
      completionVaries = uniq.length > 1;
    }

    const division = summary.jobNumber.trim().charAt(0) || "";
    const base: WorkOrder = {
      id: initial?.id || uid(),
      workOrderNumber: initial?.workOrderNumber || uid().slice(0, 6).toUpperCase(),
      createdAt: initial?.createdAt || Date.now(),
      updatedAt: Date.now(),
      status: initial?.status || "Draft",
      ...summary,
      division,
      items: preparedItems,
      completionDate,
      completionVaries,
    };

    onSubmit(base);
  };

  const valid =
    summary.jobNumber &&
    summary.jobName &&
    summary.jobPM &&
    items.length > 0 &&
    items.every((it) => it.type && it.elevation && it.quantity > 0);

  return (
    <div className="rounded-2xl border border-slate-800 p-6 bg-slate-900/50">
      <h2 className="text-xl font-semibold mb-4">Work Order</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="Job Number" value={summary.jobNumber} onChange={(v) => setSummary((s) => ({ ...s, jobNumber: v }))} required disabled={readOnly} />
          <TextField label="Job Name" value={summary.jobName} onChange={(v) => setSummary((s) => ({ ...s, jobName: v }))} required disabled={readOnly} />
          <TextField label="Project Manager" value={summary.jobPM} onChange={(v) => setSummary((s) => ({ ...s, jobPM: v }))} required disabled={readOnly} />
          <TextField label="Job Address" value={summary.jobAddress} onChange={(v) => setSummary((s) => ({ ...s, jobAddress: v }))} disabled={readOnly} />
          <TextField label="Superintendent" value={summary.jobSuperintendent} onChange={(v) => setSummary((s) => ({ ...s, jobSuperintendent: v }))} disabled={readOnly} />
          <SelectField label="System" value={summary.system} options={SYSTEMS} onChange={(v) => setSummary((s) => ({ ...s, system: v as System }))} disabled={readOnly} />
          <DateField label="Date Issued" value={summary.dateIssued} onChange={(v) => setSummary((s) => ({ ...s, dateIssued: v }))} disabled={readOnly} />
          <DateField label="Material Delivery" value={summary.materialDeliveryDate} onChange={(v) => setSummary((s) => ({ ...s, materialDeliveryDate: v }))} disabled={readOnly} />
          <DateField label="Completion Date" value={summary.completionDate} onChange={(v) => setSummary((s) => ({ ...s, completionDate: v }))} disabled={readOnly} />
          <div className="md:col-span-2">
            <TextAreaField label="Notes" value={summary.notes} onChange={(v) => setSummary((s) => ({ ...s, notes: v }))} disabled={readOnly} />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-slate-800 p-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <SelectField label="Scope" value={it.scope} options={SCOPES} onChange={(v) => updateItem(it.id, { scope: v as Scope })} disabled={readOnly} />
                <SelectField label="Item Type" value={it.type} options={ITEM_TYPES} onChange={(v) => updateItem(it.id, { type: v as ItemType })} disabled={readOnly} />
                <TextField label="Elevation" value={it.elevation} onChange={(v) => updateItem(it.id, { elevation: v })} disabled={readOnly} />
                <NumberField label="Quantity" value={it.quantity} min={0} onChange={(v) => updateItem(it.id, { quantity: v })} disabled={readOnly} />
                <SelectField
                  label="Status"
                  value={it.status}
                  options={ITEM_STATUSES}
                  onChange={(v) =>
                    updateItem(it.id, {
                      status: v as ItemStatus,
                      holdReason: v === "On Hold" ? it.holdReason || HOLD_REASONS[0] : "",
                    })
                  }
                  disabled={readOnly}
                />
              </div>
              {it.status === "On Hold" && (
                <div className="mt-3">
                  <SelectField
                    label="Hold Reason"
                    value={it.holdReason || HOLD_REASONS[0]}
                    options={HOLD_REASONS}
                    onChange={(v) => updateItem(it.id, { holdReason: v as HoldReason })}
                    disabled={readOnly}
                  />
                </div>
              )}
              {/* Per-item completion dates (multiple) */}
              <div className="mt-3">
                <label className="block text-sm text-slate-300 mb-1">Completion Dates</label>
                {!readOnly && (
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
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(it.completionDates || []).map((d) => (
                    <Chip
                      key={d}
                      onRemove={
                        readOnly
                          ? undefined
                          : () =>
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
              {!readOnly && (
                <div className="mt-2 text-right">
                  <button
                    onClick={() => removeItem(it.id)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500"
                  >
                    Remove Item
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={addItem}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700"
            >
              + Add Item
            </button>
          )}
          {!readOnly && (
            <button
              onClick={save}
              disabled={!valid}
              className={
                "px-4 py-2 rounded-xl font-medium " +
                (valid
                  ? "bg-indigo-600 hover:bg-indigo-500"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed")
              }
            >
              {initial ? "Save Changes" : "Create Work Order"}
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600"
          >
            {readOnly ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

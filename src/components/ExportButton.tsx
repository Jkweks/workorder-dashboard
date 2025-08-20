import React from "react";
import { WorkOrder } from "../types";

export default function ExportButton({ orders }: { orders: WorkOrder[] }) {
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

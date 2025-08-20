import React from "react";

export default function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
      {children}
    </span>
  );
}

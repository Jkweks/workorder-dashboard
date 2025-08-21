import React from "react";

export default function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 hover:bg-slate-600"
          title="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}

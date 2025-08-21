import React from "react";

export default function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 w-full disabled:opacity-50"
      />
    </div>
  );
}

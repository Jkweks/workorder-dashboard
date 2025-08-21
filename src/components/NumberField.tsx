import React from "react";

export default function NumberField({
  label,
  value,
  onChange,
  min,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 w-full disabled:opacity-50"
      />
    </div>
  );
}

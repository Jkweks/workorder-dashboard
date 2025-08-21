import React from "react";

export default function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
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
        disabled={disabled}
        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 w-full outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
      />
    </div>
  );
}

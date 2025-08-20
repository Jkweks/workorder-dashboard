export const uid = () => Math.random().toString(36).slice(2, 10);
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function statusColor(status: string) {
  switch (status) {
    case "Draft":
      return "bg-slate-700";
    case "Issued":
      return "bg-green-700";
    case "In Progress":
      return "bg-blue-700";
    case "On Hold":
      return "bg-orange-600";
    case "Complete":
      return "bg-green-900";
    default:
      return "bg-slate-900";
  }
}

export function saveLocal(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

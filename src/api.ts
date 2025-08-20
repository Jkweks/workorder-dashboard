const API_URL = (import.meta as any).env?.VITE_API_URL || "http://192.168.4.251:4000";

export async function apiListWorkOrders(params: { q?: string; status?: string } = {}) {
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_URL}/api/work-orders${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to list work orders");
  return (await res.json()) as any[];
}

export async function apiCreateWorkOrder(payload: any) {
  const res = await fetch(`${API_URL}/api/work-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create work order");
  return await res.json();
}

export async function apiUpdateWorkOrder(id: string, payload: any) {
  const res = await fetch(`${API_URL}/api/work-orders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update work order");
  return await res.json();
}

export async function apiDeleteWorkOrder(id: string) {
  const res = await fetch(`${API_URL}/api/work-orders/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete work order");
}

export async function apiGetWorkOrder(id: string) {
  const res = await fetch(`${API_URL}/api/work-orders/${id}`);
  if (!res.ok) throw new Error("Not found");
  return await res.json();
}

export function apiPdfUrl(id: string) {
  return `${API_URL}/api/work-orders/${id}/pdf`;
}

export { API_URL };

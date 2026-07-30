import { authFetch } from "./auth";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}

export async function fetchOrders() {
  return unwrap(await authFetch("/api/orders"));
}

export async function fetchOrder(id) {
  return unwrap(await authFetch(`/api/orders/${id}`));
}

// Mock checkout — records a real order but never touches a real payment
// processor. No money moves anywhere in this call.
export async function placeOrder(address) {
  return unwrap(await authFetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  }));
}

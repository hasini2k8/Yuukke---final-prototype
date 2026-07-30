import { authFetch } from "./auth";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}

export async function fetchCart() {
  return unwrap(await authFetch("/api/cart"));
}

export async function addToCart(productId, quantity = 1) {
  return unwrap(await authFetch("/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity }),
  }));
}

export async function updateCartItem(productId, quantity) {
  return unwrap(await authFetch(`/api/cart/items/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  }));
}

export async function removeCartItem(productId) {
  return unwrap(await authFetch(`/api/cart/items/${productId}`, { method: "DELETE" }));
}

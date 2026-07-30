import { authFetch } from "./auth";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}

export async function fetchWishlist() {
  return unwrap(await authFetch("/api/wishlist"));
}

export async function toggleWishlist(productId) {
  return unwrap(await authFetch(`/api/wishlist/${productId}`, { method: "POST" }));
}

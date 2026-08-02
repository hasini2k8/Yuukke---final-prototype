// Talks to the local product catalog store (server/productStore.js) via the
// same /api proxy used for Tripo3D. Reading the catalog is public (the
// marketplace); creating/listing "my" products is scoped to the seller's
// anonymous id (src/lib/sellerId.js) — no login involved. Local dev only
// for now — see server/productStore.js for the production-persistence caveat.
import { sellerFetch } from "./sellerId";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchProducts() {
  const res = await fetch("/api/products");
  return unwrap(res);
}

export async function fetchMyProducts() {
  const res = await sellerFetch("/api/products/mine");
  return unwrap(res);
}

export async function fetchProduct(id) {
  const res = await fetch(`/api/products/${id}`);
  return unwrap(res);
}

export async function saveProduct(product) {
  const res = await sellerFetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return unwrap(res);
}

export async function updateProduct(id, patch) {
  const res = await sellerFetch(`/api/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return unwrap(res);
}

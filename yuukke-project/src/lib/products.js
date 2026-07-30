// Talks to the local product catalog store (server/productStore.js) via the
// same /api proxy used for Tripo3D. Local dev only for now — see
// server/productStore.js for the production-persistence caveat.
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

export async function fetchProduct(id) {
  const res = await fetch(`/api/products/${id}`);
  return unwrap(res);
}

export async function saveProduct(product) {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  return unwrap(res);
}

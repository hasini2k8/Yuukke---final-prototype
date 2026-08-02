// Talks to the AI-generated business website store (server/siteStore.js) via
// the same /api proxy used for products. Scoped per seller's anonymous id
// (src/lib/sellerId.js) — no login involved. Local dev only for now — see
// server/productStore.js for the production-persistence caveat.
import { sellerFetch } from "./sellerId";
import { apiUrl } from "./api";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchSite() {
  const res = await sellerFetch("/api/site");
  return unwrap(res);
}

export async function saveSite(patch) {
  const res = await sellerFetch("/api/site", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return unwrap(res);
}

export async function fetchPublicSite(slug) {
  const res = await fetch(apiUrl(`/api/site/public/${encodeURIComponent(slug)}`));
  return unwrap(res);
}

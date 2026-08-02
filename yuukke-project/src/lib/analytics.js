import { sellerFetch } from "./sellerId";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Analytics request failed (${response.status})`);
  return data;
}

export async function fetchAnalytics() {
  return unwrap(await sellerFetch("/api/analytics"));
}

export async function syncAnalytics() {
  return unwrap(await sellerFetch("/api/analytics/sync", { method: "POST" }));
}

// Selects Instagram/LinkedIn channels already connected in Postiz. All
// requests remain scoped to the authenticated Yuukke seller.
import { sellerFetch } from "./sellerId";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
}

// Returns a hosted login URL for one platform — open it in a new tab, the
// seller logs in the normal way on that platform's own site, and our
// server's /callback route stores the connection once they're done.
export async function connectPlatform(platform) {
  const res = await sellerFetch(`/api/social/${platform}/connect`, { method: "POST" });
  return unwrap(res);
}

export async function fetchConnections() {
  const res = await sellerFetch("/api/social/connections");
  return unwrap(res);
}

export async function disconnectPlatform(platform) {
  const res = await sellerFetch(`/api/social/${platform}/disconnect`, { method: "POST" });
  return unwrap(res);
}

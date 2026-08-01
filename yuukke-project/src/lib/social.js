// Talks to this app's Zernio-backed Instagram/LinkedIn connection
// (server/zernioClient.js) — Zernio owns the actual OAuth in its own hosted
// login page. Scoped per seller's anonymous id (src/lib/sellerId.js) — no
// login involved.
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
  const res = await sellerFetch(`/api/social/${platform}/connect`);
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

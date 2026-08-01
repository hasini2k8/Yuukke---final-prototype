// Talks to this app's own Instagram/LinkedIn/Pinterest OAuth (server/
// socialAuth.js) — replaces the old Zernio-hosted connection. Scoped per
// logged-in seller.
import { authFetch } from "./auth";

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
  const res = await authFetch(`/api/social/${platform}/connect`);
  return unwrap(res);
}

export async function fetchConnections() {
  const res = await authFetch("/api/social/connections");
  return unwrap(res);
}

export async function disconnectPlatform(platform) {
  const res = await authFetch(`/api/social/${platform}/disconnect`, { method: "POST" });
  return unwrap(res);
}

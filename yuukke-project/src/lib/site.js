// Talks to the AI-generated business website store (server/siteStore.js) via
// the same /api proxy used for products. Scoped per logged-in seller — every
// call here needs the auth token. Local dev only for now — see
// server/productStore.js for the production-persistence caveat.
import { authFetch } from "./auth";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchSite() {
  const res = await authFetch("/api/site");
  return unwrap(res);
}

export async function saveSite(patch) {
  const res = await authFetch("/api/site", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return unwrap(res);
}

export async function fetchPublicSite(slug) {
  const res = await fetch(`/api/site/public/${encodeURIComponent(slug)}`);
  return unwrap(res);
}

// Starts (or resumes) connecting one of the seller's social accounts via
// Zernio — returns a hosted login URL to open in a new tab for that
// specific platform. No tokens ever pass through this app.
export async function requestConnectUrl(platform = "instagram") {
  const res = await authFetch("/api/site/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform }),
  });
  return unwrap(res);
}

// Re-checks which platforms are actually linked after the seller returns
// from the hosted login page, and syncs our stored status to match.
export async function refreshConnectionStatus() {
  const res = await authFetch("/api/site/connect/status");
  return unwrap(res);
}

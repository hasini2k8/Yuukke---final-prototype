// Talks to the one-time "what do you want to sell" survey store
// (server/businessProfileStore.js). Scoped per logged-in seller.
import { authFetch } from "./auth";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchBusinessProfile() {
  const res = await authFetch("/api/business-profile");
  return unwrap(res);
}

export async function saveBusinessProfile(data) {
  const res = await authFetch("/api/business-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return unwrap(res);
}

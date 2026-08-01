// Talks to the social content calendar store (server/postStore.js) via the
// same /api proxy used for products. Scoped per logged-in seller. Local dev
// only for now — see server/productStore.js for the production-persistence
// caveat.
import { authFetch } from "./auth";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchPosts() {
  const res = await authFetch("/api/posts");
  return unwrap(res);
}

export async function createPost(data) {
  const res = await authFetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return unwrap(res);
}

export async function updatePost(id, patch) {
  const res = await authFetch(`/api/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return unwrap(res);
}

export async function deletePost(id) {
  const res = await authFetch(`/api/posts/${id}`, { method: "DELETE" });
  return unwrap(res);
}

// Posts are scheduled with Zernio automatically at creation time (see
// server/index.js's POST /api/posts) — this just asks Zernio what
// actually happened once a post's scheduled date has passed, so the UI
// reflects reality instead of assuming success.
export async function checkPostStatus(id) {
  const res = await authFetch(`/api/posts/${id}/status`);
  return unwrap(res);
}

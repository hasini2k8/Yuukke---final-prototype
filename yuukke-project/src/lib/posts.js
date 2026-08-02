// Talks to the social content calendar store (server/postStore.js) via the
// same /api proxy used for products. Scoped per seller's anonymous id
// (src/lib/sellerId.js) — no login involved. Local dev only for now — see
// server/productStore.js for the production-persistence caveat.
import { sellerFetch } from "./sellerId";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchPosts() {
  const res = await sellerFetch("/api/posts");
  return unwrap(res);
}

// Creates a draft — nothing is sent to any platform until confirmPost() is
// called (see server/index.js's POST /api/posts/:id/confirm).
export async function createPost(data) {
  const res = await sellerFetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return unwrap(res);
}

export async function updatePost(id, patch) {
  const res = await sellerFetch(`/api/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return unwrap(res);
}

// Turns a post's already-generated image into a short, AI-animated video
// reel via Google's Veo model (server/veoProxy.js) — blocking, and can
// take a few minutes while the render finishes.
export async function generateVideo(id) {
  const res = await sellerFetch(`/api/posts/${id}/video`, { method: "POST" });
  return unwrap(res);
}

// The seller's explicit "yes, post this" step — moves a draft to
// "scheduled" and publishes right away if its date+time has already arrived.
export async function confirmPost(id) {
  const res = await sellerFetch(`/api/posts/${id}/confirm`, { method: "POST" });
  return unwrap(res);
}

export async function confirmPosts(ids) {
  const res = await sellerFetch("/api/posts/confirm-many", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return unwrap(res);
}

export async function deletePost(id) {
  const res = await sellerFetch(`/api/posts/${id}`, { method: "DELETE" });
  return unwrap(res);
}

// This just asks the server what actually happened once a post's scheduled
// time has passed, so the UI reflects reality instead of assuming success.
export async function checkPostStatus(id) {
  const res = await sellerFetch(`/api/posts/${id}/status`);
  return unwrap(res);
}

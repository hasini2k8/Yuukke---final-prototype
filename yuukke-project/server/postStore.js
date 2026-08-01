// SQLite-backed store (server/db.js) for each seller's social content
// calendar — scoped per seller's anonymous id (src/lib/sellerId.js), not an
// account. See productStore.js for the production-persistence caveat.
//
// Posts are created as "draft" (topic/caption/image ready, nothing sent
// anywhere yet) and only move to "scheduled" once the seller explicitly
// confirms via POST /api/posts/:id/confirm (server/index.js) — see
// server/socialSchedule.js for what happens once a post is scheduled.
import crypto from "node:crypto";
import { get, all, run } from "./db.js";

function toPost(row) {
  if (!row) return null;
  return {
    id: row.id,
    sellerId: row.seller_id,
    platform: row.platform,
    topic: row.topic || "",
    caption: row.caption || "",
    imageDataUrl: row.image_data_url || "",
    videoUrl: row.video_url || "",
    scheduledFor: row.scheduled_for || "",
    scheduledTime: row.scheduled_time || "09:00",
    status: row.status,
    externalPostId: row.external_post_id || null,
    scheduleError: row.schedule_error || null,
    createdAt: row.created_at,
  };
}

export async function listPosts(sellerId) {
  return all("SELECT * FROM posts WHERE seller_id = ? ORDER BY created_at DESC", [sellerId]).map(toPost);
}

export async function getPost(sellerId, id) {
  return toPost(get("SELECT * FROM posts WHERE id = ? AND seller_id = ?", [id, sellerId]));
}

// Cross-seller lookup, keyed only by the post's own unguessable id — used
// for routes that can't carry a seller header, like the public image route
// an external service (JSON2Video, or a real platform's own API) fetches
// server-to-server (server/index.js's GET /api/posts/:id/image).
export async function getPostById(id) {
  return toPost(get("SELECT * FROM posts WHERE id = ?", [id]));
}

export async function createPost(sellerId, data) {
  const post = {
    id: crypto.randomUUID(),
    sellerId,
    platform: String(data.platform || "").trim(),
    topic: String(data.topic || "").trim(),
    caption: String(data.caption || "").trim(),
    imageDataUrl: data.imageDataUrl || "",
    videoUrl: "",
    scheduledFor: String(data.scheduledFor || "").trim(),
    scheduledTime: String(data.scheduledTime || "09:00").trim(),
    // "pending" = generated but not yet placed on the calendar (staged for
    // review in the storefront's generated-posts panel); anything else is
    // always a "draft" — the seller can't create a post directly as
    // "scheduled"/"posted" from here.
    status: data.status === "pending" ? "pending" : "draft",
    createdAt: new Date().toISOString(),
  };
  run(
    `INSERT INTO posts (id, seller_id, platform, topic, caption, image_data_url, scheduled_for, scheduled_time, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [post.id, post.sellerId, post.platform, post.topic, post.caption, post.imageDataUrl, post.scheduledFor, post.scheduledTime, post.status, post.createdAt]
  );
  return post;
}

export async function updatePost(sellerId, id, patch) {
  const existing = get("SELECT * FROM posts WHERE id = ? AND seller_id = ?", [id, sellerId]);
  if (!existing) return null;
  const merged = { ...toPost(existing), ...patch };
  run(
    `UPDATE posts SET platform = ?, topic = ?, caption = ?, image_data_url = ?, video_url = ?, scheduled_for = ?, scheduled_time = ?, status = ?, external_post_id = ?, schedule_error = ?
     WHERE id = ? AND seller_id = ?`,
    [merged.platform, merged.topic, merged.caption, merged.imageDataUrl, merged.videoUrl, merged.scheduledFor, merged.scheduledTime, merged.status, merged.externalPostId, merged.scheduleError, id, sellerId]
  );
  return toPost(get("SELECT * FROM posts WHERE id = ? AND seller_id = ?", [id, sellerId]));
}

export async function deletePost(sellerId, id) {
  const result = run("DELETE FROM posts WHERE id = ? AND seller_id = ?", [id, sellerId]);
  return result.changes > 0;
}

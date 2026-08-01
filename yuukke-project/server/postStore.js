// SQLite-backed store (server/db.js) for each seller's social content
// calendar — scoped per seller (was a shared singleton). See
// productStore.js for the production-persistence caveat.
import crypto from "node:crypto";
import { get, all, run } from "./db.js";

function toPost(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    caption: row.caption || "",
    imageDataUrl: row.image_data_url || "",
    scheduledFor: row.scheduled_for || "",
    status: row.status,
    zernioPostId: row.zernio_post_id || null,
    scheduleError: row.schedule_error || null,
    createdAt: row.created_at,
  };
}

export async function listPosts(userId) {
  return all("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC", [userId]).map(toPost);
}

export async function getPost(userId, id) {
  return toPost(get("SELECT * FROM posts WHERE id = ? AND user_id = ?", [id, userId]));
}

export async function createPost(userId, data) {
  const post = {
    id: crypto.randomUUID(),
    userId,
    platform: String(data.platform || "").trim(),
    caption: String(data.caption || "").trim(),
    imageDataUrl: data.imageDataUrl || "",
    scheduledFor: String(data.scheduledFor || "").trim(),
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };
  run(
    `INSERT INTO posts (id, user_id, platform, caption, image_data_url, scheduled_for, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [post.id, post.userId, post.platform, post.caption, post.imageDataUrl, post.scheduledFor, post.status, post.createdAt]
  );
  return post;
}

export async function updatePost(userId, id, patch) {
  const existing = get("SELECT * FROM posts WHERE id = ? AND user_id = ?", [id, userId]);
  if (!existing) return null;
  const merged = { ...toPost(existing), ...patch };
  run(
    `UPDATE posts SET platform = ?, caption = ?, image_data_url = ?, scheduled_for = ?, status = ?, zernio_post_id = ?, schedule_error = ?
     WHERE id = ? AND user_id = ?`,
    [merged.platform, merged.caption, merged.imageDataUrl, merged.scheduledFor, merged.status, merged.zernioPostId, merged.scheduleError, id, userId]
  );
  return toPost(get("SELECT * FROM posts WHERE id = ? AND user_id = ?", [id, userId]));
}

export async function deletePost(userId, id) {
  const result = run("DELETE FROM posts WHERE id = ? AND user_id = ?", [id, userId]);
  return result.changes > 0;
}

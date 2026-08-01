// Attempts to actually publish one post to its platform, using the
// seller's stored OAuth connection (server/socialConnectionStore.js) and
// server/socialPost.js. Called both right away (POST /api/posts, when the
// post is due today) and by the background poller (server/scheduler.js, for
// posts scheduled further out) — unlike Zernio, which had its own remote
// scheduling infrastructure, publishing here only happens when this
// function actually runs, so the future-dated case depends on the
// scheduler ticking while the server process is up.
import * as posts from "./postStore.js";
import * as connections from "./socialConnectionStore.js";
import { publishPost } from "./socialPost.js";

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  const [, mimeType, base64] = match;
  return { mimeType, buffer: Buffer.from(base64, "base64") };
}

function publicImageUrl(postId) {
  const base = process.env.PUBLIC_BASE_URL || "http://localhost:5173";
  return `${base}/api/posts/${postId}/image`;
}

export async function attemptPublish(userId, post) {
  const connection = await connections.getConnection(userId, post.platform);
  if (!connection) {
    return posts.updatePost(userId, post.id, {
      scheduleError: `${post.platform} isn't connected yet — connect it on the Storefront tab.`,
    });
  }
  try {
    const parsed = parseDataUrl(post.imageDataUrl);
    const result = await publishPost({
      platform: post.platform,
      connection,
      caption: post.caption,
      imageUrl: publicImageUrl(post.id),
      imageBuffer: parsed?.buffer,
      imageMimeType: parsed?.mimeType,
    });
    return posts.updatePost(userId, post.id, { status: "posted", externalPostId: result.externalPostId || null, scheduleError: null });
  } catch (e) {
    return posts.updatePost(userId, post.id, { status: "failed", scheduleError: e.message || "Couldn't publish that post." });
  }
}

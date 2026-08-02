// Hands a confirmed post to Postiz with
// scheduledFor set, so it fires on its own later — this is what makes
// posting genuinely automatic instead of needing a manual click or our own
// server to be running at that moment. Called once, right when a seller
// confirms a draft (see server/index.js's POST /api/posts/:id/confirm) —
// unlike the old direct-OAuth version, this doesn't need to gate on
// "is it due today," Postiz's own infrastructure holds the post until its
// scheduled time.
import * as posts from "./postStore.js";
import * as site from "./siteStore.js";
import { uploadMedia, schedulePost, getPostStatus } from "./postizClient.js";

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  const [, mimeType, base64] = match;
  return { mimeType, buffer: Buffer.from(base64, "base64") };
}

export async function attemptPublish(sellerId, post) {
  const currentSite = await site.getSite(sellerId);
  const connection = currentSite?.connections?.[post.platform];
  if (!connection?.connected || !connection?.accountId) {
    return posts.updatePost(sellerId, post.id, {
      scheduleError: `${post.platform} isn't connected yet — connect it on the Storefront tab.`,
    });
  }
  try {
    const parsed = parseDataUrl(post.imageDataUrl);
    const media = parsed ? await uploadMedia(parsed.buffer, parsed.mimeType) : null;
    const result = await schedulePost({
      platform: connection.provider || post.platform, integrationId: connection.accountId, caption: post.caption,
      media, scheduledFor: post.scheduledFor, scheduledTime: post.scheduledTime,
    });
    return posts.updatePost(sellerId, post.id, { externalPostId: result?.id || null, scheduleError: null });
  } catch (e) {
    return posts.updatePost(sellerId, post.id, { status: "failed", scheduleError: e.message || "Couldn't schedule that post." });
  }
}

// Best-effort refresh of what Postiz actually did with a previously-handed-
// off post — used by the on-demand /status endpoint rather than assuming
// success just because handoff succeeded.
export async function refreshStatus(sellerId, post) {
  if (!post.externalPostId) return post;
  try {
    const result = await getPostStatus(post.externalPostId, post.scheduledFor);
    return result.posted ? posts.updatePost(sellerId, post.id, { status: "posted", scheduleError: null }) : post;
  } catch (e) {
    return post;
  }
}

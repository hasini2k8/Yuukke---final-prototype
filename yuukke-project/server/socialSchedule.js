// Hands a confirmed post to Zernio (server/zernioClient.js) with
// scheduledFor set, so it fires on its own later — this is what makes
// posting genuinely automatic instead of needing a manual click or our own
// server to be running at that moment. Called once, right when a seller
// confirms a draft (see server/index.js's POST /api/posts/:id/confirm) —
// unlike the old direct-OAuth version, this doesn't need to gate on
// "is it due today," Zernio's own infrastructure holds the post until its
// scheduled time.
import * as posts from "./postStore.js";
import * as site from "./siteStore.js";
import { uploadMedia, createPost as createZernioPost, getPostStatus } from "./zernioClient.js";

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
    const mediaPublicUrl = parsed ? await uploadMedia(parsed.buffer, parsed.mimeType) : null;
    const result = await createZernioPost({
      platform: post.platform, accountId: connection.accountId, caption: post.caption,
      mediaPublicUrl, scheduledFor: post.scheduledFor, scheduledTime: post.scheduledTime,
    });
    return posts.updatePost(sellerId, post.id, { externalPostId: result?._id || null, scheduleError: null });
  } catch (e) {
    return posts.updatePost(sellerId, post.id, { status: "failed", scheduleError: e.message || "Couldn't schedule that post." });
  }
}

// Best-effort refresh of what Zernio actually did with a previously-handed-
// off post — used by the on-demand /status endpoint rather than assuming
// success just because handoff succeeded.
export async function refreshStatus(sellerId, post) {
  if (!post.externalPostId) return post;
  try {
    const result = await getPostStatus(post.externalPostId);
    const platformResult = result?.platformResults?.find((p) => p.platform === post.platform);
    if (!platformResult) return post;
    const status = platformResult.success === true ? "posted" : platformResult.success === false ? "failed" : post.status;
    return posts.updatePost(sellerId, post.id, { status, scheduleError: platformResult.success === false ? platformResult.error : null });
  } catch (e) {
    return post;
  }
}

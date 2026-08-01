// Publishes one post directly to Instagram/LinkedIn/Pinterest using the
// seller's own stored OAuth connection (server/socialConnectionStore.js) —
// replaces Zernio's posting API. No remote scheduling infrastructure to lean
// on here (that was Zernio's own servers) — see server/scheduler.js, which
// polls for due posts and calls publishPost at the right time instead.

async function publishInstagram({ connection, caption, imageUrl }) {
  if (!imageUrl) {
    throw new Error("Instagram needs a publicly reachable image URL to publish — set PUBLIC_BASE_URL to your deployed app's URL (localhost only works for connecting, not for the actual publish call).");
  }
  const createRes = await fetch(`https://graph.facebook.com/v19.0/${connection.accountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: connection.accessToken }),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(createData?.error?.message || "Instagram couldn't create that post.");

  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${connection.accountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createData.id, access_token: connection.accessToken }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok) throw new Error(publishData?.error?.message || "Instagram couldn't publish that post.");
  return { externalPostId: publishData.id };
}

async function publishLinkedIn({ connection, caption, imageBuffer, imageMimeType }) {
  const authorUrn = `urn:li:person:${connection.accountId}`;

  const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn,
        serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
      },
    }),
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) throw new Error(registerData?.message || "LinkedIn couldn't start the image upload.");
  const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const asset = registerData.value.asset;

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${connection.accessToken}`, "Content-Type": imageMimeType || "image/png" },
    body: imageBuffer,
  });
  if (!uploadRes.ok) throw new Error(`LinkedIn image upload failed (${uploadRes.status}).`);

  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: caption },
          shareMediaCategory: "IMAGE",
          media: [{ status: "READY", media: asset }],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  if (!postRes.ok) {
    const postData = await postRes.json().catch(() => null);
    throw new Error(postData?.message || "LinkedIn couldn't publish that post.");
  }
  // The UGC Posts API returns the new post's id in a response header, not the body.
  return { externalPostId: postRes.headers.get("x-restli-id") || null };
}

async function getOrCreatePinterestBoard(connection) {
  const listRes = await fetch("https://api.pinterest.com/v5/boards", { headers: { Authorization: `Bearer ${connection.accessToken}` } });
  const listData = await listRes.json();
  if (listRes.ok && listData.items?.length) return listData.items[0].id;

  const createRes = await fetch("https://api.pinterest.com/v5/boards", {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Yuukke Posts", description: "Posts scheduled from Yuukke" }),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(createData?.message || "Pinterest couldn't create a board to pin to.");
  return createData.id;
}

async function publishPinterest({ connection, caption, imageBuffer, imageMimeType }) {
  const boardId = await getOrCreatePinterestBoard(connection);
  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      board_id: boardId,
      description: caption,
      media_source: { source_type: "image_base64", content_type: imageMimeType || "image/png", data: imageBuffer.toString("base64") },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Pinterest couldn't publish that pin.");
  return { externalPostId: data.id };
}

// `imageUrl` only matters to Instagram (it fetches server-to-server);
// `imageBuffer`/`imageMimeType` are what LinkedIn and Pinterest need instead.
export async function publishPost({ platform, connection, caption, imageUrl, imageBuffer, imageMimeType }) {
  if (platform === "instagram") return publishInstagram({ connection, caption, imageUrl });
  if (platform === "linkedin") return publishLinkedIn({ connection, caption, imageBuffer, imageMimeType });
  if (platform === "pinterest") return publishPinterest({ connection, caption, imageBuffer, imageMimeType });
  throw new Error(`Unknown platform: ${platform}`);
}

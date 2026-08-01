// Thin wrapper around Zernio's API (https://zernio.com/api/v1) — used
// instead of calling Instagram/LinkedIn/Pinterest's own APIs directly so
// non-technical sellers can connect their accounts through one simple
// hosted login page instead of generating developer-console tokens
// themselves. Zernio already holds the platform approvals that would
// otherwise require Yuukke to register its own app with each network and
// go through review. Free for the first 2 connected accounts.
const BASE_URL = "https://zernio.com/api/v1";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Server is missing ${name}.`);
  return value;
}

async function zernioFetch(path, { method = "GET", body } = {}) {
  const apiKey = requireEnv("ZERNIO_API_KEY");
  const headers = { Authorization: `Bearer ${apiKey}` };
  const init = { method, headers };
  if (body) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${BASE_URL}${path}`, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Zernio request failed (${response.status})`);
  }
  return data;
}

// One profile per business — created once, the first time a seller connects.
export async function createProfile(name) {
  const data = await zernioFetch("/profiles", { method: "POST", body: { name } });
  return data.profile._id;
}

// Returns a hosted login URL for one specific platform — the seller visits
// it in a new tab and authorizes through that platform's own normal login
// screen, never touching a developer console or API key. Called separately
// per platform (unlike a single link-everything flow).
export async function generateAuthUrl(profileId, platform, redirectUrl) {
  const params = new URLSearchParams({ profileId, redirect_url: redirectUrl });
  const data = await zernioFetch(`/connect/${platform}?${params}`);
  return data.authUrl;
}

// Tells us which platforms a profile actually has linked, including the
// real connected username — so the UI can show real status (and a real
// handle) after the seller returns from the hosted login page.
export async function listConnectedAccounts(profileId) {
  const data = await zernioFetch(`/accounts?profileId=${encodeURIComponent(profileId)}`);
  return data.accounts || [];
}

// Uploads image bytes to Zernio's own storage and returns a publicUrl for
// use in a post — this runs server-to-server, so unlike an API that expects
// us to host the image at a public URL ourselves, this works fine even from
// local dev with no public deployment.
export async function uploadMedia(buffer, mimeType, filename = "post.png") {
  const presign = await zernioFetch("/media/presign", { method: "POST", body: { filename, contentType: mimeType } });
  const uploadRes = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": mimeType }, body: buffer });
  if (!uploadRes.ok) throw new Error(`Zernio media upload failed (${uploadRes.status})`);
  return presign.publicUrl;
}

// scheduledFor is a naive local date/time + timezone (not a UTC ISO string)
// — Zernio's own infrastructure fires the post later, so our server doesn't
// need to be running at that moment.
export async function createPost({ platform, accountId, caption, mediaPublicUrl, scheduledFor }) {
  const body = {
    content: caption,
    platforms: [{ platform, accountId }],
    mediaItems: mediaPublicUrl ? [{ type: "image", url: mediaPublicUrl }] : [],
  };
  if (scheduledFor) {
    body.scheduledFor = `${scheduledFor}T09:00:00`;
    body.timezone = "UTC";
  }
  const data = await zernioFetch("/posts", { method: "POST", body });
  return data.post;
}

// Best-effort status check for a previously-created (possibly still
// scheduled) post, used to refresh what really happened rather than
// assuming success.
export async function getPostStatus(postId) {
  const data = await zernioFetch(`/posts/${postId}`);
  return data.post;
}

const BASE_URL = (process.env.POSTIZ_API_URL || "https://api.postiz.com/public/v1").replace(/\/$/, "");

function requireApiKey() {
  const value = process.env.POSTIZ_API_KEY;
  if (!value) throw new Error("Server is missing POSTIZ_API_KEY.");
  return value;
}

async function postizFetch(path, { method = "GET", body } = {}) {
  const headers = { Authorization: requireApiKey() };
  const init = { method, headers };
  if (body) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${BASE_URL}${path}`, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error || `Postiz request failed (${response.status}).`);
  return data;
}

export async function listIntegrations() {
  const data = await postizFetch("/integrations");
  return (Array.isArray(data) ? data : data?.integrations || []).filter((item) => !item.disabled);
}

export async function uploadMedia(buffer, mimeType, filename = "yuukke-post.png") {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), filename);
  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: { Authorization: requireApiKey() },
    body: form,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error || `Postiz upload failed (${response.status}).`);
  return data;
}

function toUtcIso(date, time) {
  return new Date(`${date}T${time || "09:00"}:00+05:30`).toISOString();
}

export async function schedulePost({ platform, integrationId, caption, media, scheduledFor, scheduledTime }) {
  const settings = platform === "instagram" || platform === "instagram-standalone"
    ? { __type: platform, post_type: "post" }
    : { __type: platform };
  const data = await postizFetch("/posts", {
    method: "POST",
    body: {
      type: "schedule",
      date: toUtcIso(scheduledFor, scheduledTime),
      shortLink: false,
      tags: [],
      posts: [{
        integration: { id: integrationId },
        value: [{ content: caption, image: media ? [{ id: media.id, path: media.path }] : [] }],
        settings,
      }],
    },
  });
  const result = Array.isArray(data) ? data[0] : data;
  return { id: result?.postId || result?.id || null };
}

export async function getPostStatus(postId, scheduledFor) {
  const center = new Date(`${scheduledFor || new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const start = new Date(center); start.setUTCDate(start.getUTCDate() - 7);
  const end = new Date(center); end.setUTCDate(end.getUTCDate() + 30);
  const params = new URLSearchParams({ startDate: start.toISOString(), endDate: end.toISOString() });
  const data = await postizFetch(`/posts?${params}`);
  const found = (data?.posts || []).find((post) => post.id === postId || post.postId === postId);
  return { found: !!found, posted: !!found?.releaseURL, releaseUrl: found?.releaseURL || null };
}

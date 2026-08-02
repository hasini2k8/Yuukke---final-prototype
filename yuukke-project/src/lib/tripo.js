// Calls go through /api/tripo/* (see api/tripo/[...path].js) rather than
// Tripo3D directly — Tripo3D's API sends no CORS headers, so a browser can't
// call it cross-origin, and the API key must stay server-side.
const TRIPO_BASE = "/api/tripo";

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.code !== 0) {
    throw new Error(data?.message || `Tripo3D request failed (${response.status})`);
  }
  return data.data;
}

// A stalled connection (dropped wifi, a proxy that never responds) leaves a
// plain fetch() awaiting forever — since pollTask's overall timeout is only
// checked *between* polls, one hung request can freeze the whole loop with
// no way out. This caps each individual poll so a stall becomes a normal,
// retryable error instead of an infinite spinner.
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${TRIPO_BASE}/files`, { method: "POST", body: form });
  const { file_token } = await unwrap(res);
  return file_token;
}

async function createSplatTask(fileToken) {
  const res = await fetch(`${TRIPO_BASE}/generation/image-to-splat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: fileToken }),
  });
  const { task_id } = await unwrap(res);
  return task_id;
}

async function pollTask(taskId, onProgress, { intervalMs = 4000, timeoutMs = 6 * 60 * 1000, maxConsecutiveErrors = 4 } = {}) {
  const start = Date.now();
  let consecutiveErrors = 0;
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    let task;
    try {
      const res = await fetchWithTimeout(`${TRIPO_BASE}/tasks/${taskId}`, {}, 20000);
      task = await unwrap(res);
    } catch (e) {
      // A single flaky request shouldn't kill a ~4-minute generation — retry
      // a few times before giving up, since this loop makes dozens of calls.
      consecutiveErrors++;
      lastError = e;
      if (consecutiveErrors >= maxConsecutiveErrors) throw e;
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }
    consecutiveErrors = 0;
    onProgress?.(task.progress || 0);
    if (task.status === "success") return task.output;
    if (task.status === "failed" || task.status === "cancelled") {
      throw new Error(task.error_message || "3D model generation failed.");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw lastError || new Error("3D model generation timed out — try again with a clearer photo.");
}

// Uploads a product photo to Tripo3D and generates a rotatable Gaussian Splat
// (a point-based real-time 3D representation, not a textured mesh) from it.
// Returns { model_url, rendered_image_url } once the async task completes.
//
// model_url points at our own /api/tripo/model/:taskId proxy rather than
// Tripo's raw CDN link — Tripo enforces CORS on those links (a browser can't
// fetch them cross-origin) and they expire after ~5 minutes, so the proxy
// re-resolves a fresh one from the task on every request instead.
export async function generateSplatFromImage(file, onProgress) {
  const fileToken = await uploadImage(file);
  const taskId = await createSplatTask(fileToken);
  const output = await pollTask(taskId, onProgress);
  return { ...output, model_url: `${TRIPO_BASE}/model/${taskId}` };
}

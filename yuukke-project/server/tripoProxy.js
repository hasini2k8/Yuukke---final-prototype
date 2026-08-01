// Shared forwarding logic used by both the local dev proxy (server/index.js)
// and the Vercel serverless function (api/tripo/[...path].js), so the two
// environments stay in sync. Tripo3D's API sends no CORS headers and expects
// a server-side API key, so nothing here can run in the browser.
export async function proxyTripo({ method, path, contentType, body }) {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) {
    return {
      status: 500,
      contentType: "application/json",
      text: JSON.stringify({ code: -1, message: "Server is missing TRIPO_API_KEY." }),
    };
  }

  const url = `https://openapi.tripo3d.ai/v3/${path}`;
  const headers = { Authorization: `Bearer ${apiKey}` };
  if (contentType) headers["Content-Type"] = contentType;

  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") init.body = body;

  let upstream;
  try {
    upstream = await fetch(url, init);
  } catch (e) {
    return {
      status: 502,
      contentType: "application/json",
      text: JSON.stringify({ code: -1, message: `Couldn't reach Tripo3D: ${e.message}` }),
    };
  }

  const text = await upstream.text();
  return {
    status: upstream.status,
    contentType: upstream.headers.get("content-type") || "application/json",
    text,
  };
}

// Tripo now enforces CORS on its generated-file CDN links, so a browser can
// no longer fetch a task's model_url directly (see
// https://www.tripo3d.ai/blog/how-to-use-generated-file-download-links) —
// it must be downloaded server-side and re-served same-origin. This looks up
// the task fresh (rather than trusting a client-supplied URL) so it also
// sidesteps SSRF risk and naturally picks up a newly-signed link each time,
// which works around the ~5 minute expiry on Tripo's signed URLs too.
function jsonError(status, message) {
  return { status, contentType: "application/json", body: Buffer.from(JSON.stringify({ code: -1, message })) };
}

export async function proxyTripoModel(taskId) {
  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) return jsonError(500, "Server is missing TRIPO_API_KEY.");

  let taskRes;
  try {
    taskRes = await fetch(`https://openapi.tripo3d.ai/v3/tasks/${taskId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  } catch (e) {
    return jsonError(502, `Couldn't reach Tripo3D: ${e.message}`);
  }
  const taskData = await taskRes.json().catch(() => null);
  const modelUrl = taskData?.data?.output?.model_url;
  if (!taskRes.ok || !taskData || taskData.code !== 0) {
    return jsonError(taskRes.status || 502, taskData?.message || "Couldn't look up that 3D model.");
  }
  if (!modelUrl) return jsonError(409, "That 3D model isn't ready yet.");

  let assetRes;
  try {
    assetRes = await fetch(modelUrl);
  } catch (e) {
    return jsonError(502, `Couldn't download the 3D model: ${e.message}`);
  }
  if (!assetRes.ok) return jsonError(assetRes.status, "Couldn't download the 3D model from Tripo3D.");

  const body = Buffer.from(await assetRes.arrayBuffer());
  return { status: 200, contentType: assetRes.headers.get("content-type") || "application/octet-stream", body };
}

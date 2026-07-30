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

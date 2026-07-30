// Vercel serverless function — production equivalent of server/index.js
// (used for local dev). Both share the forwarding logic in
// server/tripoProxy.js so the two stay in sync.
import { proxyTripo } from "../../server/tripoProxy.js";

export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  const segments = req.query.path;
  const path = Array.isArray(segments) ? segments.join("/") : segments || "";
  const body = req.method !== "GET" && req.method !== "HEAD" ? await buffer(req) : undefined;

  const result = await proxyTripo({ method: req.method, path, contentType: req.headers["content-type"], body });
  res.status(result.status);
  res.setHeader("Content-Type", result.contentType);
  res.send(result.text);
}

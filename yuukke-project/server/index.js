// Standalone local dev server — run with `npm run server` (started
// automatically by `npm run dev`). Vite forwards /api requests here (see
// vite.config.js) so the frontend never needs to know it exists. Handles
// both the Tripo3D proxy and the local product catalog store.
import http from "node:http";
import { proxyTripo } from "./tripoProxy.js";
import { listProducts, getProduct, createProduct } from "./productStore.js";

const PORT = process.env.TRIPO_PROXY_PORT || 8791;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  const tripoMatch = url.pathname.match(/^\/api\/tripo\/(.+)$/);
  if (tripoMatch) {
    const path = tripoMatch[1];
    const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : undefined;
    const result = await proxyTripo({ method: req.method, path, contentType: req.headers["content-type"], body });
    res.writeHead(result.status, { "Content-Type": result.contentType });
    res.end(result.text);
    return;
  }

  if (url.pathname === "/api/products" && req.method === "GET") {
    sendJson(res, 200, await listProducts());
    return;
  }

  if (url.pathname === "/api/products" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString("utf8"));
      const product = await createProduct(data);
      sendJson(res, 201, product);
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't save product: ${e.message}` });
    }
    return;
  }

  const productMatch = url.pathname.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch && req.method === "GET") {
    const product = await getProduct(productMatch[1]);
    if (!product) {
      sendJson(res, 404, { message: "Product not found" });
      return;
    }
    sendJson(res, 200, product);
    return;
  }

  sendJson(res, 404, { code: -1, message: "Not found" });
});

server.listen(PORT, () => {
  console.log(`[dev-server] listening on http://localhost:${PORT}`);
  if (!process.env.TRIPO_API_KEY) {
    console.log("[dev-server] warning: TRIPO_API_KEY is not set — 3D preview requests will fail.");
  }
});

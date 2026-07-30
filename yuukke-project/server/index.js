// Standalone local dev server — run with `npm run server` (started
// automatically by `npm run dev`). Vite forwards /api requests here (see
// vite.config.js) so the frontend never needs to know it exists. Handles
// the Tripo3D proxy, the product catalog, and real auth/cart/wishlist/order
// storage (local file-based — see jsonStore.js for the production caveat).
import http from "node:http";
import { proxyTripo } from "./tripoProxy.js";
import { listProducts, getProduct, createProduct } from "./productStore.js";
import * as auth from "./authStore.js";
import * as cart from "./cartStore.js";
import * as wishlist from "./wishlistStore.js";
import * as orders from "./orderStore.js";

const PORT = process.env.TRIPO_PROXY_PORT || 8791;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const body = await readBody(req);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function getToken(req) {
  const header = req.headers["authorization"] || "";
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

async function requireUser(req, res) {
  const user = await auth.getUserByToken(getToken(req));
  if (!user) {
    sendJson(res, 401, { message: "Please log in to continue." });
    return null;
  }
  return user;
}

async function handleAuth(req, res, url) {
  if (url.pathname === "/api/auth/signup" && req.method === "POST") {
    try {
      const data = await readJson(req);
      const session = await auth.signup(data);
      sendJson(res, 201, session);
    } catch (e) {
      sendJson(res, 400, { message: e.message });
    }
    return true;
  }
  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const data = await readJson(req);
      const session = await auth.login(data);
      sendJson(res, 200, session);
    } catch (e) {
      sendJson(res, 401, { message: e.message });
    }
    return true;
  }
  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    await auth.logout(getToken(req));
    sendJson(res, 200, { ok: true });
    return true;
  }
  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    const user = await auth.getUserByToken(getToken(req));
    sendJson(res, 200, { user });
    return true;
  }
  return false;
}

async function handleCart(req, res, url) {
  if (!url.pathname.startsWith("/api/cart")) return false;
  const user = await requireUser(req, res);
  if (!user) return true;

  if (url.pathname === "/api/cart" && req.method === "GET") {
    sendJson(res, 200, await cart.getCart(user.id));
    return true;
  }
  if (url.pathname === "/api/cart/items" && req.method === "POST") {
    try {
      const { productId, quantity } = await readJson(req);
      sendJson(res, 200, await cart.addToCart(user.id, productId, Number(quantity) || 1));
    } catch (e) {
      sendJson(res, 400, { message: e.message });
    }
    return true;
  }
  const itemMatch = url.pathname.match(/^\/api\/cart\/items\/([^/]+)$/);
  if (itemMatch && req.method === "PATCH") {
    const { quantity } = await readJson(req);
    sendJson(res, 200, await cart.updateCartItem(user.id, itemMatch[1], Number(quantity)));
    return true;
  }
  if (itemMatch && req.method === "DELETE") {
    sendJson(res, 200, await cart.removeCartItem(user.id, itemMatch[1]));
    return true;
  }
  return false;
}

async function handleWishlist(req, res, url) {
  if (!url.pathname.startsWith("/api/wishlist")) return false;
  const user = await requireUser(req, res);
  if (!user) return true;

  if (url.pathname === "/api/wishlist" && req.method === "GET") {
    sendJson(res, 200, await wishlist.getWishlist(user.id));
    return true;
  }
  const match = url.pathname.match(/^\/api\/wishlist\/([^/]+)$/);
  if (match && req.method === "POST") {
    sendJson(res, 200, await wishlist.toggleWishlist(user.id, match[1]));
    return true;
  }
  return false;
}

async function handleOrders(req, res, url) {
  if (!url.pathname.startsWith("/api/orders")) return false;
  const user = await requireUser(req, res);
  if (!user) return true;

  if (url.pathname === "/api/orders" && req.method === "GET") {
    sendJson(res, 200, await orders.listOrders(user.id));
    return true;
  }
  if (url.pathname === "/api/orders" && req.method === "POST") {
    try {
      const { address } = await readJson(req);
      sendJson(res, 201, await orders.placeOrder(user.id, address));
    } catch (e) {
      sendJson(res, 400, { message: e.message });
    }
    return true;
  }
  const match = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (match && req.method === "GET") {
    const order = await orders.getOrder(user.id, match[1]);
    if (!order) { sendJson(res, 404, { message: "Order not found" }); return true; }
    sendJson(res, 200, order);
    return true;
  }
  return false;
}

async function handleProducts(req, res, url) {
  if (url.pathname === "/api/products" && req.method === "GET") {
    sendJson(res, 200, await listProducts());
    return true;
  }
  if (url.pathname === "/api/products" && req.method === "POST") {
    try {
      const data = await readJson(req);
      const product = await createProduct(data);
      sendJson(res, 201, product);
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't save product: ${e.message}` });
    }
    return true;
  }
  const match = url.pathname.match(/^\/api\/products\/([^/]+)$/);
  if (match && req.method === "GET") {
    const product = await getProduct(match[1]);
    if (!product) { sendJson(res, 404, { message: "Product not found" }); return true; }
    sendJson(res, 200, product);
    return true;
  }
  return false;
}

async function handleTripo(req, res, url) {
  const match = url.pathname.match(/^\/api\/tripo\/(.+)$/);
  if (!match) return false;
  const path = match[1];
  const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : undefined;
  const result = await proxyTripo({ method: req.method, path, contentType: req.headers["content-type"], body });
  res.writeHead(result.status, { "Content-Type": result.contentType });
  res.end(result.text);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (await handleTripo(req, res, url)) return;
    if (await handleAuth(req, res, url)) return;
    if (await handleCart(req, res, url)) return;
    if (await handleWishlist(req, res, url)) return;
    if (await handleOrders(req, res, url)) return;
    if (await handleProducts(req, res, url)) return;
    sendJson(res, 404, { code: -1, message: "Not found" });
  } catch (e) {
    sendJson(res, 500, { message: e.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`[dev-server] listening on http://localhost:${PORT}`);
  if (!process.env.TRIPO_API_KEY) {
    console.log("[dev-server] warning: TRIPO_API_KEY is not set — 3D preview requests will fail.");
  }
});

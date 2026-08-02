// Standalone local dev server — run with `npm run server` (started
// automatically by `npm run dev`). Vite forwards /api requests here (see
// vite.config.js) so the frontend never needs to know it exists. Handles
// the Tripo3D proxy, the product catalog, and real auth/cart/wishlist/order
// storage (SQLite via server/db.js — see productStore.js for the
// production-persistence caveat).
import http from "node:http";
import { proxyTripo, proxyTripoModel } from "./tripoProxy.js";
import { listProducts, listProductsBySeller, getProduct, createProduct, updateProduct } from "./productStore.js";
import * as auth from "./authStore.js";
import * as cart from "./cartStore.js";
import * as wishlist from "./wishlistStore.js";
import * as orders from "./orderStore.js";
import * as site from "./siteStore.js";
import * as posts from "./postStore.js";
import * as analytics from "./analyticsStore.js";
import * as posters from "./posterStore.js";
import { generateOpenAIImage } from "./openaiProxy.js";
import { askOpenAIText } from "./openaiText.js";
import { listIntegrations, getPostAnalytics } from "./postizClient.js";
import { attemptPublish, refreshStatus } from "./socialSchedule.js";
import { createVideo } from "./veoProxy.js";
import { get, run } from "./db.js";

const SOCIAL_PLATFORMS = new Set(["instagram", "linkedin"]);

const PORT = process.env.PORT || process.env.TRIPO_PROXY_PORT || 8792;
const FRONTEND_ORIGINS = new Set(String(process.env.FRONTEND_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173").split(",").map((value) => value.trim()).filter(Boolean));
const CORS_ROOT_DOMAIN = String(process.env.CORS_ROOT_DOMAIN || "").toLowerCase();

function allowCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;
  let allowed = FRONTEND_ORIGINS.has(origin);
  if (!allowed && CORS_ROOT_DOMAIN) {
    try { const host = new URL(origin).hostname.toLowerCase(); allowed = host === CORS_ROOT_DOMAIN || host.endsWith(`.${CORS_ROOT_DOMAIN}`); } catch (e) { allowed = false; }
  }
  if (!allowed) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Legacy-Seller-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
}

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

// The business platform (storefront/brand/marketing) has no login — a
// seller is just whatever anonymous id their browser generated and sends
// on every call (src/lib/sellerId.js). No lookup, no verification: this is
// intentionally not authentication, just an opaque scoping key, so the app
// stays account-free on this side. The buyer marketplace (cart/wishlist/
// orders/checkout) is unaffected and keeps real login via requireUser above.
function claimLegacySellerData(userId, legacyId) {
  if (!legacyId || legacyId === userId) return;
  run("UPDATE products SET seller_id = ? WHERE seller_id = ?", [userId, legacyId]);
  run("UPDATE posts SET seller_id = ? WHERE seller_id = ?", [userId, legacyId]);
  const accountSite = get("SELECT seller_id FROM sites WHERE seller_id = ?", [userId]);
  if (!accountSite) run("UPDATE sites SET seller_id = ? WHERE seller_id = ?", [userId, legacyId]);
}

async function requireSeller(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  claimLegacySellerData(user.id, req.headers["x-legacy-seller-id"]);
  return user.id;
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
  if (url.pathname === "/api/products/mine" && req.method === "GET") {
    const sellerId = await requireSeller(req, res);
    if (!sellerId) return true;
    sendJson(res, 200, await listProductsBySeller(sellerId));
    return true;
  }
  if (url.pathname === "/api/products" && req.method === "POST") {
    const sellerId = await requireSeller(req, res);
    if (!sellerId) return true;
    try {
      const data = await readJson(req);
      const product = await createProduct(data, sellerId);
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
  // Refreshes a listing already on the storefront as the seller keeps
  // talking to the listing chatbot (src/pages/ListProducts.jsx), rather
  // than creating a duplicate every time more detail comes out.
  if (match && req.method === "PATCH") {
    const sellerId = await requireSeller(req, res);
    if (!sellerId) return true;
    try {
      const patch = await readJson(req);
      const product = await updateProduct(match[1], sellerId, patch);
      if (!product) { sendJson(res, 404, { message: "Product not found" }); return true; }
      sendJson(res, 200, product);
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't update product: ${e.message}` });
    }
    return true;
  }
  return false;
}

async function handleSite(req, res, url) {
  // Public storefront page — no auth, this is what customers see.
  const publicMatch = url.pathname.match(/^\/api\/site\/public\/([^/]+)$/);
  if (publicMatch && req.method === "GET") {
    const record = await site.getSiteBySlug(publicMatch[1]);
    if (!record) { sendJson(res, 404, { message: "This storefront isn't public yet." }); return true; }
    analytics.recordWebsiteView(record.sellerId);
    analytics.refreshStrategy(record.sellerId);
    const storefrontProducts = await listProductsBySeller(record.sellerId);
    sendJson(res, 200, { ...record, products: storefrontProducts });
    return true;
  }

  if (!url.pathname.startsWith("/api/site")) return false;
  const sellerId = await requireSeller(req, res);
  if (!sellerId) return true;

  if (url.pathname === "/api/site" && req.method === "GET") {
    sendJson(res, 200, await site.getSite(sellerId));
    return true;
  }
  if (url.pathname === "/api/site" && req.method === "PUT") {
    try {
      const data = await readJson(req);
      sendJson(res, 200, await site.saveSite(sellerId, data));
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't save your storefront: ${e.message}` });
    }
    return true;
  }
  return false;
}

// Postiz owns the Instagram/LinkedIn connections. These endpoints select
// and verify channels from the subscribed Postiz workspace.
async function handleSocialAuth(req, res, url) {
  if (!url.pathname.startsWith("/api/social")) return false;

  const connectMatch = url.pathname.match(/^\/api\/social\/([^/]+)\/connect$/);
  if (connectMatch && req.method === "POST") {
    const platform = connectMatch[1];
    if (!SOCIAL_PLATFORMS.has(platform)) { sendJson(res, 404, { message: "Unknown platform." }); return true; }
    const sellerId = await requireSeller(req, res);
    if (!sellerId) return true;
    try {
      const integrations = await listIntegrations();
      const identifiers = platform === "instagram" ? new Set(["instagram", "instagram-standalone"]) : new Set(["linkedin", "linkedin-page"]);
      const integration = integrations.find((item) => identifiers.has(item.identifier));
      if (!integration) {
        sendJson(res, 404, { message: `Connect ${platform} inside Postiz first, then try again.` });
        return true;
      }
      const current = await site.getSite(sellerId);
      const connections = {
        ...current?.connections,
        [platform]: { connected: true, username: integration.profile || integration.name, accountId: integration.id, provider: integration.identifier },
      };
      await site.saveSite(sellerId, { connections });
      sendJson(res, 200, { platform, connected: true, username: integration.profile || integration.name, accountId: integration.id, provider: integration.identifier });
    } catch (e) {
      sendJson(res, 502, { message: e.message || "Couldn't connect that Postiz channel." });
    }
    return true;
  }

  if (url.pathname === "/api/social/connections" && req.method === "GET") {
    const sellerId = await requireSeller(req, res);
    if (!sellerId) return true;
    try {
      const current = await site.getSite(sellerId);
      const integrations = await listIntegrations();
      const connections = { ...current.connections };
      for (const platform of SOCIAL_PLATFORMS) {
        const selected = connections[platform];
        const integration = selected?.accountId && integrations.find((item) => item.id === selected.accountId);
        if (selected && !integration) delete connections[platform];
        if (integration) connections[platform] = { connected: true, username: integration.profile || integration.name, accountId: integration.id, provider: integration.identifier };
      }
      const saved = await site.saveSite(sellerId, { connections });
      const rows = [...SOCIAL_PLATFORMS].filter((p) => saved.connections?.[p]?.connected)
        .map((p) => ({ platform: p, connected: true, username: saved.connections[p].username, accountId: saved.connections[p].accountId, provider: saved.connections[p].provider }));
      sendJson(res, 200, rows);
    } catch (e) {
      sendJson(res, 502, { message: e.message || "Couldn't check connection status." });
    }
    return true;
  }

  // Disconnect from Yuukke only; the channel remains available in Postiz.
  const disconnectMatch = url.pathname.match(/^\/api\/social\/([^/]+)\/disconnect$/);
  if (disconnectMatch && req.method === "POST") {
    const sellerId = await requireSeller(req, res);
    if (!sellerId) return true;
    const current = await site.getSite(sellerId);
    const connections = { ...current?.connections };
    delete connections[disconnectMatch[1]];
    await site.saveSite(sellerId, { connections });
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

async function handlePosts(req, res, url) {
  if (!url.pathname.startsWith("/api/posts")) return false;

  const sellerId = await requireSeller(req, res);
  if (!sellerId) return true;

  if (url.pathname === "/api/posts" && req.method === "GET") {
    sendJson(res, 200, await posts.listPosts(sellerId));
    return true;
  }
  if (url.pathname === "/api/posts" && req.method === "POST") {
    try {
      const data = await readJson(req);
      // Always created as a draft (server/postStore.js) — nothing is sent
      // anywhere until the seller explicitly confirms below, so generating
      // a post is never itself the action that publishes it.
      const post = await posts.createPost(sellerId, data);
      sendJson(res, 201, post);
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't save that post: ${e.message}` });
    }
    return true;
  }

  // One explicit confirmation can hand a campaign's platform variants to
  // their respective connected accounts together. Results stay separate so
  // a failure on one network never hides a success on the other.
  if (url.pathname === "/api/posts/confirm-many" && req.method === "POST") {
    try {
      const { ids } = await readJson(req);
      const uniqueIds = [...new Set(Array.isArray(ids) ? ids : [])].slice(0, 10);
      if (!uniqueIds.length) { sendJson(res, 400, { message: "Choose at least one post." }); return true; }
      const selected = await Promise.all(uniqueIds.map((id) => posts.getPost(sellerId, id)));
      if (selected.some((post) => !post)) { sendJson(res, 404, { message: "One or more posts could not be found." }); return true; }
      if (selected.some((post) => post.status !== "draft")) { sendJson(res, 400, { message: "Only draft posts can be submitted." }); return true; }
      const results = await Promise.all(selected.map(async (post) => {
        const scheduled = await posts.updatePost(sellerId, post.id, { status: "scheduled", scheduleError: null });
        return attemptPublish(sellerId, scheduled);
      }));
      sendJson(res, 200, results);
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't schedule those posts: ${e.message}` });
    }
    return true;
  }

  // Video generation (server/veoProxy.js) — animates the post's own
  // already-generated image with Google's Veo model. Blocking: this app
  // has no job queue, so the request just waits for the render (see
  // veoProxy.js's MAX_WAIT_MS) rather than polling separately.
  const videoMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/video$/);
  if (videoMatch && req.method === "POST") {
    try {
      const post = await posts.getPost(sellerId, videoMatch[1]);
      if (!post) { sendJson(res, 404, { message: "Post not found" }); return true; }
      if (!post.imageDataUrl) { sendJson(res, 400, { message: "Generate the image for this post first." }); return true; }
      const { videoUrl } = await createVideo({ imageDataUrl: post.imageDataUrl, caption: post.caption, topic: post.topic });
      const updated = await posts.updatePost(sellerId, post.id, { videoUrl });
      sendJson(res, 200, updated);
    } catch (e) {
      sendJson(res, 502, { message: e.message || "Couldn't generate that video just now." });
    }
    return true;
  }

  // The seller's explicit "yes, post this" step — a draft only ever
  // becomes "scheduled" (and gets handed to Postiz) from here, in response
  // to a confirm dialog on the frontend, never automatically. Postiz holds
  // the post and fires it at its own scheduled time — this doesn't need to
  // gate on "is it due right now" the way the old direct-OAuth version did.
  const confirmMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/confirm$/);
  if (confirmMatch && req.method === "POST") {
    try {
      const post = await posts.getPost(sellerId, confirmMatch[1]);
      if (!post) { sendJson(res, 404, { message: "Post not found" }); return true; }
      const scheduled = await posts.updatePost(sellerId, post.id, { status: "scheduled", scheduleError: null });
      const updated = await attemptPublish(sellerId, scheduled);
      sendJson(res, 200, updated || scheduled);
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't schedule that post: ${e.message}` });
    }
    return true;
  }

  const statusMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/status$/);
  if (statusMatch && req.method === "GET") {
    try {
      const post = await posts.getPost(sellerId, statusMatch[1]);
      if (!post) { sendJson(res, 404, { message: "Post not found" }); return true; }
      // Postiz owns the actual scheduling/publishing now — this just asks
      // it what really happened rather than assuming success.
      const updated = post.status === "scheduled" ? await refreshStatus(sellerId, post) : post;
      sendJson(res, 200, updated || post);
    } catch (e) {
      sendJson(res, 502, { message: e.message || "Couldn't check that post's status." });
    }
    return true;
  }

  const match = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (match && req.method === "PATCH") {
    const patch = await readJson(req);
    const updated = await posts.updatePost(sellerId, match[1], patch);
    if (!updated) { sendJson(res, 404, { message: "Post not found" }); return true; }
    sendJson(res, 200, updated);
    return true;
  }
  if (match && req.method === "DELETE") {
    await posts.deletePost(sellerId, match[1]);
    sendJson(res, 200, { ok: true });
    return true;
  }
  return false;
}

async function handleAnalytics(req, res, url) {
  if (!url.pathname.startsWith("/api/analytics")) return false;
  const sellerId = await requireSeller(req, res);
  if (!sellerId) return true;
  if (url.pathname === "/api/analytics" && req.method === "GET") {
    sendJson(res, 200, analytics.getAnalytics(sellerId));
    return true;
  }
  if (url.pathname === "/api/analytics/sync" && req.method === "POST") {
    const instagramPosts = (await posts.listPosts(sellerId)).filter((post) => post.platform === "instagram" && post.externalPostId && post.status === "posted");
    const errors = [];
    for (const post of instagramPosts) {
      try { analytics.savePostMetrics(sellerId, post.id, await getPostAnalytics(post.externalPostId, 30)); }
      catch (e) { errors.push({ postId: post.id, message: e.message }); }
    }
    analytics.refreshStrategy(sellerId);
    sendJson(res, 200, { ...analytics.getAnalytics(sellerId), syncedPosts: instagramPosts.length, errors });
    return true;
  }
  return false;
}

async function handlePosters(req, res, url) {
  if (!url.pathname.startsWith("/api/posters")) return false;
  const sellerId = await requireSeller(req, res);
  if (!sellerId) return true;
  if (url.pathname === "/api/posters" && req.method === "GET") { sendJson(res, 200, posters.listPosters(sellerId)); return true; }
  if (url.pathname === "/api/posters" && req.method === "POST") {
    try { sendJson(res, 201, posters.createPoster(sellerId, await readJson(req))); }
    catch (e) { sendJson(res, 400, { message: e.message }); }
    return true;
  }
  const match = url.pathname.match(/^\/api\/posters\/([^/]+)$/);
  if (match && req.method === "DELETE") { sendJson(res, 200, { ok: posters.deletePoster(sellerId, match[1]) }); return true; }
  return false;
}

async function handleOpenAI(req, res, url) {
  if (url.pathname === "/api/openai/image" && req.method === "POST") {
    const { prompt, referenceImageDataUrl } = await readJson(req);
    const result = await generateOpenAIImage(prompt, referenceImageDataUrl);
    res.writeHead(result.status, { "Content-Type": result.contentType });
    res.end(result.text);
    return true;
  }
  if (url.pathname === "/api/openai/chat" && req.method === "POST") {
    const { system, messages, json } = await readJson(req);
    const result = await askOpenAIText({ system, messages, json });
    res.writeHead(result.status, { "Content-Type": result.contentType });
    res.end(result.text);
    return true;
  }
  return false;
}

async function handleTripo(req, res, url) {
  const modelMatch = url.pathname.match(/^\/api\/tripo\/model\/([^/]+)$/);
  if (modelMatch && req.method === "GET") {
    const result = await proxyTripoModel(modelMatch[1]);
    res.writeHead(result.status, { "Content-Type": result.contentType });
    res.end(result.body);
    return true;
  }

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
  allowCors(req, res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === "/health" && req.method === "GET") { sendJson(res, 200, { ok: true, service: "yuukke-backend" }); return; }
    if (await handleTripo(req, res, url)) return;
    if (await handleAuth(req, res, url)) return;
    if (await handleCart(req, res, url)) return;
    if (await handleWishlist(req, res, url)) return;
    if (await handleOrders(req, res, url)) return;
    if (await handleProducts(req, res, url)) return;
    if (await handleSite(req, res, url)) return;
    if (await handleAnalytics(req, res, url)) return;
    if (await handlePosters(req, res, url)) return;
    if (await handlePosts(req, res, url)) return;
    if (await handleSocialAuth(req, res, url)) return;
    if (await handleOpenAI(req, res, url)) return;
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

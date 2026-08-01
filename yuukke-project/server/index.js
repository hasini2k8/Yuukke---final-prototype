// Standalone local dev server — run with `npm run server` (started
// automatically by `npm run dev`). Vite forwards /api requests here (see
// vite.config.js) so the frontend never needs to know it exists. Handles
// the Tripo3D proxy, the product catalog, and real auth/cart/wishlist/order
// storage (SQLite via server/db.js — see productStore.js for the
// production-persistence caveat).
import http from "node:http";
import { proxyTripo, proxyTripoModel } from "./tripoProxy.js";
import { listProducts, listProductsBySeller, getProduct, createProduct } from "./productStore.js";
import * as auth from "./authStore.js";
import * as cart from "./cartStore.js";
import * as wishlist from "./wishlistStore.js";
import * as orders from "./orderStore.js";
import * as site from "./siteStore.js";
import * as posts from "./postStore.js";
import * as businessProfile from "./businessProfileStore.js";
import { generateOpenAIImage } from "./openaiProxy.js";
import * as socialConnections from "./socialConnectionStore.js";
import { getAuthUrl, completeOAuth } from "./socialAuth.js";
import { attemptPublish } from "./socialSchedule.js";
import { startScheduler } from "./scheduler.js";

const SOCIAL_PLATFORMS = new Set(["instagram", "linkedin", "pinterest"]);

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
  if (url.pathname === "/api/products/mine" && req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return true;
    sendJson(res, 200, await listProductsBySeller(user.id));
    return true;
  }
  if (url.pathname === "/api/products" && req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return true;
    try {
      const data = await readJson(req);
      const product = await createProduct(data, user.id);
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

async function handleSite(req, res, url) {
  // Public storefront page — no auth, this is what customers see.
  const publicMatch = url.pathname.match(/^\/api\/site\/public\/([^/]+)$/);
  if (publicMatch && req.method === "GET") {
    const record = await site.getSiteBySlug(publicMatch[1]);
    if (!record) { sendJson(res, 404, { message: "This storefront isn't public yet." }); return true; }
    sendJson(res, 200, record);
    return true;
  }

  if (!url.pathname.startsWith("/api/site")) return false;
  const user = await requireUser(req, res);
  if (!user) return true;

  if (url.pathname === "/api/site" && req.method === "GET") {
    sendJson(res, 200, await site.getSite(user.id));
    return true;
  }
  if (url.pathname === "/api/site" && req.method === "PUT") {
    try {
      const data = await readJson(req);
      sendJson(res, 200, await site.saveSite(user.id, data));
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't save your storefront: ${e.message}` });
    }
    return true;
  }
  return false;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  const [, mimeType, base64] = match;
  return { mimeType, buffer: Buffer.from(base64, "base64") };
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Direct OAuth against each platform's own free API (server/socialAuth.js)
// — replaces the old Zernio-hosted connection. /connect and /callback are
// intentionally split: /connect needs the seller's auth token (a normal
// fetch call), but /callback is a plain browser redirect from Instagram/
// LinkedIn/Pinterest with no Authorization header available, so it
// identifies the seller via the single-use oauth_state minted by /connect.
async function handleSocialAuth(req, res, url) {
  if (!url.pathname.startsWith("/api/social")) return false;

  const connectMatch = url.pathname.match(/^\/api\/social\/([^/]+)\/connect$/);
  if (connectMatch && req.method === "GET") {
    const platform = connectMatch[1];
    if (!SOCIAL_PLATFORMS.has(platform)) { sendJson(res, 404, { message: "Unknown platform." }); return true; }
    const user = await requireUser(req, res);
    if (!user) return true;
    try {
      const state = await socialConnections.createOAuthState(user.id, platform);
      sendJson(res, 200, { url: getAuthUrl(platform, state) });
    } catch (e) {
      sendJson(res, 502, { message: e.message || "Couldn't start connecting that account." });
    }
    return true;
  }

  const callbackMatch = url.pathname.match(/^\/api\/social\/([^/]+)\/callback$/);
  if (callbackMatch && req.method === "GET") {
    const platform = callbackMatch[1];
    const code = url.searchParams.get("code");
    const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (oauthError) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(`Connection cancelled: ${oauthError}. You can close this tab.`);
      return true;
    }
    try {
      const stateToken = url.searchParams.get("state");
      const stateRecord = stateToken && (await socialConnections.consumeOAuthState(stateToken));
      if (!stateRecord || stateRecord.platform !== platform) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("This connection link is invalid or has expired — please go back and try connecting again.");
        return true;
      }
      const result = await completeOAuth(platform, code);
      await socialConnections.saveConnection(stateRecord.userId, platform, result);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
        <h2>Connected as @${result.username || "your account"} on ${platform}</h2>
        <p>You can close this tab now.</p>
        <script>setTimeout(() => window.close(), 2500);</script>
      </body></html>`);
    } catch (e) {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(e.message || "Couldn't finish connecting that account.");
    }
    return true;
  }

  if (url.pathname === "/api/social/connections" && req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return true;
    const rows = await socialConnections.listConnections(user.id);
    sendJson(res, 200, rows.map((c) => ({ platform: c.platform, connected: true, username: c.username, accountId: c.accountId })));
    return true;
  }

  const disconnectMatch = url.pathname.match(/^\/api\/social\/([^/]+)\/disconnect$/);
  if (disconnectMatch && req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return true;
    await socialConnections.deleteConnection(user.id, disconnectMatch[1]);
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

async function handlePosts(req, res, url) {
  if (!url.pathname.startsWith("/api/posts")) return false;
  const user = await requireUser(req, res);
  if (!user) return true;

  if (url.pathname === "/api/posts" && req.method === "GET") {
    sendJson(res, 200, await posts.listPosts(user.id));
    return true;
  }
  if (url.pathname === "/api/posts" && req.method === "POST") {
    try {
      const data = await readJson(req);
      const post = await posts.createPost(user.id, data);
      // Posts due today publish right away; anything further out is picked
      // up later by the background scheduler (server/scheduler.js) once its
      // date arrives — see socialSchedule.js for why this can't just hand
      // off to a remote scheduler the way Zernio did.
      const updated = post.scheduledFor && post.scheduledFor <= todayIso() ? await attemptPublish(user.id, post) : post;
      sendJson(res, 201, updated || post);
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't save that post: ${e.message}` });
    }
    return true;
  }

  const imageMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/image$/);
  if (imageMatch && req.method === "GET") {
    const post = await posts.getPost(user.id, imageMatch[1]);
    const parsed = post && parseDataUrl(post.imageDataUrl);
    if (!parsed) { sendJson(res, 404, { message: "No image for that post." }); return true; }
    res.writeHead(200, { "Content-Type": parsed.mimeType });
    res.end(parsed.buffer);
    return true;
  }

  const statusMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/status$/);
  if (statusMatch && req.method === "GET") {
    try {
      const post = await posts.getPost(user.id, statusMatch[1]);
      if (!post) { sendJson(res, 404, { message: "Post not found" }); return true; }
      // Publishing happens synchronously (server/socialSchedule.js) rather
      // than through a remote scheduler with its own status to poll — this
      // is just a safety-net retry for a post that's due but the background
      // scheduler (server/scheduler.js) hasn't ticked over it yet.
      if (post.status === "scheduled" && post.scheduledFor && post.scheduledFor <= todayIso()) {
        const updated = await attemptPublish(user.id, post);
        sendJson(res, 200, updated || post);
        return true;
      }
      sendJson(res, 200, post);
    } catch (e) {
      sendJson(res, 502, { message: e.message || "Couldn't check that post's status." });
    }
    return true;
  }

  const match = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (match && req.method === "PATCH") {
    const patch = await readJson(req);
    const updated = await posts.updatePost(user.id, match[1], patch);
    if (!updated) { sendJson(res, 404, { message: "Post not found" }); return true; }
    sendJson(res, 200, updated);
    return true;
  }
  if (match && req.method === "DELETE") {
    await posts.deletePost(user.id, match[1]);
    sendJson(res, 200, { ok: true });
    return true;
  }
  return false;
}

async function handleBusinessProfile(req, res, url) {
  if (!url.pathname.startsWith("/api/business-profile")) return false;
  const user = await requireUser(req, res);
  if (!user) return true;

  if (url.pathname === "/api/business-profile" && req.method === "GET") {
    sendJson(res, 200, await businessProfile.getBusinessProfile(user.id));
    return true;
  }
  if (url.pathname === "/api/business-profile" && req.method === "PUT") {
    try {
      const data = await readJson(req);
      sendJson(res, 200, await businessProfile.saveBusinessProfile(user.id, data));
    } catch (e) {
      sendJson(res, 400, { message: `Couldn't save your business profile: ${e.message}` });
    }
    return true;
  }
  return false;
}

async function handleOpenAI(req, res, url) {
  if (url.pathname !== "/api/openai/image" || req.method !== "POST") return false;
  const { prompt } = await readJson(req);
  const result = await generateOpenAIImage(prompt);
  res.writeHead(result.status, { "Content-Type": result.contentType });
  res.end(result.text);
  return true;
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
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (await handleTripo(req, res, url)) return;
    if (await handleAuth(req, res, url)) return;
    if (await handleCart(req, res, url)) return;
    if (await handleWishlist(req, res, url)) return;
    if (await handleOrders(req, res, url)) return;
    if (await handleProducts(req, res, url)) return;
    if (await handleSite(req, res, url)) return;
    if (await handlePosts(req, res, url)) return;
    if (await handleSocialAuth(req, res, url)) return;
    if (await handleBusinessProfile(req, res, url)) return;
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
  startScheduler();
});

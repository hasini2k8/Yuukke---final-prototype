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
import { generateOpenAIImage } from "./openaiProxy.js";
import { askOpenAIText } from "./openaiText.js";
import { createProfile, generateAuthUrl, listConnectedAccounts } from "./zernioClient.js";
import { attemptPublish, refreshStatus } from "./socialSchedule.js";
import { createVideo } from "./json2videoProxy.js";

const SOCIAL_PLATFORMS = new Set(["instagram", "linkedin"]);

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

// The business platform (storefront/brand/marketing) has no login — a
// seller is just whatever anonymous id their browser generated and sends
// on every call (src/lib/sellerId.js). No lookup, no verification: this is
// intentionally not authentication, just an opaque scoping key, so the app
// stays account-free on this side. The buyer marketplace (cart/wishlist/
// orders/checkout) is unaffected and keeps real login via requireUser above.
function requireSeller(req, res) {
  const sellerId = req.headers["x-seller-id"];
  if (!sellerId) {
    sendJson(res, 400, { message: "Missing seller id." });
    return null;
  }
  return sellerId;
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
    const sellerId = requireSeller(req, res);
    if (!sellerId) return true;
    sendJson(res, 200, await listProductsBySeller(sellerId));
    return true;
  }
  if (url.pathname === "/api/products" && req.method === "POST") {
    const sellerId = requireSeller(req, res);
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
    const sellerId = requireSeller(req, res);
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
    sendJson(res, 200, record);
    return true;
  }

  if (!url.pathname.startsWith("/api/site")) return false;
  const sellerId = requireSeller(req, res);
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

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  const [, mimeType, base64] = match;
  return { mimeType, buffer: Buffer.from(base64, "base64") };
}

// Zernio (server/zernioClient.js) owns the actual Instagram/LinkedIn OAuth,
// through its own hosted login page — a seller never sees a developer
// console or token. /connect creates the seller's Zernio profile on first
// use (stored as sites.zernio_profile_id) and returns that hosted login
// URL; Zernio's own flow redirects back to the app root when done (no
// dedicated callback route needed), and /connections re-polls Zernio for
// what's actually linked so the UI reflects reality once the seller's back.
async function handleSocialAuth(req, res, url) {
  if (!url.pathname.startsWith("/api/social")) return false;

  const connectMatch = url.pathname.match(/^\/api\/social\/([^/]+)\/connect$/);
  if (connectMatch && req.method === "GET") {
    const platform = connectMatch[1];
    if (!SOCIAL_PLATFORMS.has(platform)) { sendJson(res, 404, { message: "Unknown platform." }); return true; }
    const sellerId = requireSeller(req, res);
    if (!sellerId) return true;
    try {
      let current = await site.getSite(sellerId);
      let profileId = current?.zernioProfileId;
      if (!profileId) {
        profileId = await createProfile(current?.businessName || "Yuukke seller");
        current = await site.saveSite(sellerId, { zernioProfileId: profileId });
      }
      const redirectUrl = `${process.env.PUBLIC_BASE_URL || `http://${req.headers.host}`}/`;
      const authUrl = await generateAuthUrl(profileId, platform, redirectUrl);
      sendJson(res, 200, { url: authUrl });
    } catch (e) {
      sendJson(res, 502, { message: e.message || "Couldn't start connecting that account." });
    }
    return true;
  }

  if (url.pathname === "/api/social/connections" && req.method === "GET") {
    const sellerId = requireSeller(req, res);
    if (!sellerId) return true;
    try {
      const current = await site.getSite(sellerId);
      if (!current?.zernioProfileId) { sendJson(res, 200, []); return true; }
      const accounts = await listConnectedAccounts(current.zernioProfileId);
      const connections = { ...current.connections };
      for (const platform of SOCIAL_PLATFORMS) {
        const account = accounts.find((a) => a.platform === platform);
        if (account) connections[platform] = { connected: true, username: account.username, accountId: account._id };
      }
      const saved = await site.saveSite(sellerId, { connections });
      const rows = [...SOCIAL_PLATFORMS].filter((p) => saved.connections?.[p]?.connected)
        .map((p) => ({ platform: p, connected: true, username: saved.connections[p].username, accountId: saved.connections[p].accountId }));
      sendJson(res, 200, rows);
    } catch (e) {
      sendJson(res, 502, { message: e.message || "Couldn't check connection status." });
    }
    return true;
  }

  // Local-only — Zernio doesn't expose a revoke call, and revoking the
  // grant on Zernio's side isn't necessary just to stop posting there from
  // Yuukke; the seller can revoke access from Zernio's own dashboard too.
  const disconnectMatch = url.pathname.match(/^\/api\/social\/([^/]+)\/disconnect$/);
  if (disconnectMatch && req.method === "POST") {
    const sellerId = requireSeller(req, res);
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

  // Public — no seller header, keyed only by the post's own unguessable id.
  // An external service (JSON2Video below, or a real platform's own posting
  // API) fetches this server-to-server and has no way to send our
  // X-Seller-Id header, so this can't sit behind the seller gate below.
  const imageMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/image$/);
  if (imageMatch && req.method === "GET") {
    const post = await posts.getPostById(imageMatch[1]);
    const parsed = post && parseDataUrl(post.imageDataUrl);
    if (!parsed) { sendJson(res, 404, { message: "No image for that post." }); return true; }
    res.writeHead(200, { "Content-Type": parsed.mimeType });
    res.end(parsed.buffer);
    return true;
  }

  const sellerId = requireSeller(req, res);
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

  // Video generation (server/json2videoProxy.js) — wraps the post's own
  // already-generated image (fetched by JSON2Video via the public route
  // above) with the caption as a text overlay. Blocking: this app has no
  // job queue, so the request just waits for the render (see
  // json2videoProxy.js's MAX_WAIT_MS) rather than polling separately.
  const videoMatch = url.pathname.match(/^\/api\/posts\/([^/]+)\/video$/);
  if (videoMatch && req.method === "POST") {
    try {
      const post = await posts.getPost(sellerId, videoMatch[1]);
      if (!post) { sendJson(res, 404, { message: "Post not found" }); return true; }
      if (!post.imageDataUrl) { sendJson(res, 400, { message: "Generate the image for this post first." }); return true; }
      const base = process.env.PUBLIC_BASE_URL || `http://${req.headers.host}`;
      const { videoUrl } = await createVideo({ imagePublicUrl: `${base}/api/posts/${post.id}/image`, caption: post.caption });
      const updated = await posts.updatePost(sellerId, post.id, { videoUrl });
      sendJson(res, 200, updated);
    } catch (e) {
      sendJson(res, 502, { message: e.message || "Couldn't generate that video just now." });
    }
    return true;
  }

  // The seller's explicit "yes, post this" step — a draft only ever
  // becomes "scheduled" (and gets handed to Zernio) from here, in response
  // to a confirm dialog on the frontend, never automatically. Zernio holds
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
      // Zernio owns the actual scheduling/publishing now — this just asks
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

async function handleOpenAI(req, res, url) {
  if (url.pathname === "/api/openai/image" && req.method === "POST") {
    const { prompt } = await readJson(req);
    const result = await generateOpenAIImage(prompt);
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

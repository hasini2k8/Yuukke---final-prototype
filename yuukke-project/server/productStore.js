// Product catalog backed by SQLite (server/db.js) — extends the local proxy
// server (server/index.js) so shopkeeper listings persist across sessions
// without needing a hosted database. Production on Vercel needs a real
// hosted database (serverless functions don't have durable local disk) —
// this only runs under `npm run dev`.
import crypto from "node:crypto";
import { get, all, run } from "./db.js";

const SEED_PRODUCTS = [
  {
    id: "demo-1", name: "Hand-block Table Runner", category: "Home Decor", price: 1299,
    description: "Hand-block-printed cotton table runner, made by our weaving collective in warm indigo and rust tones.",
    dimensions: { length: 72, width: 14, height: 0.5 }, modelUrl: null, previewColor: "#7d1935", imagePreview: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "demo-2", name: "Terracotta Planter Set", category: "Home Decor", price: 899,
    description: "A set of three hand-thrown terracotta planters, glazed and fired by a family-run pottery studio.",
    dimensions: { length: 6, width: 6, height: 5 }, modelUrl: null, previewColor: "#a3512c", imagePreview: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "demo-3", name: "Embroidered Silk Clutch", category: "Fashion & Apparel", price: 2149,
    description: "Hand-embroidered silk clutch with traditional zardozi work, finished with a brass clasp.",
    dimensions: { length: 9, width: 1.5, height: 5 }, modelUrl: null, previewColor: "#6a4c93", imagePreview: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "demo-4", name: "Brass Diya Set of 5", category: "Festive Gifting", price: 749,
    description: "Set of five hand-cast brass diyas with an etched floral border, ready for festive lighting.",
    dimensions: { length: 3, width: 3, height: 1.5 }, modelUrl: null, previewColor: "#8a7d3f", imagePreview: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

function ensureSeed() {
  const { count } = get("SELECT COUNT(*) as count FROM products");
  if (count > 0) return;
  for (const p of SEED_PRODUCTS) {
    run(
      `INSERT INTO products (id, seller_id, name, description, category, price, dimensions, model_url, preview_color, image_preview, in_stock, created_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [p.id, p.name, p.description, p.category, p.price, JSON.stringify(p.dimensions), p.modelUrl, p.previewColor, p.imagePreview, p.createdAt]
    );
  }
}
ensureSeed();

function toProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    sellerId: row.seller_id || null,
    name: row.name,
    description: row.description || "",
    category: row.category || "",
    price: row.price,
    dimensions: row.dimensions ? JSON.parse(row.dimensions) : null,
    modelUrl: row.model_url || null,
    previewColor: row.preview_color || null,
    imagePreview: row.image_preview || null,
    inStock: !!row.in_stock,
    createdAt: row.created_at,
  };
}

export async function listProducts() {
  return all("SELECT * FROM products ORDER BY created_at DESC").map(toProduct);
}

export async function listProductsBySeller(sellerId) {
  return all("SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC", [sellerId]).map(toProduct);
}

export async function getProduct(id) {
  return toProduct(get("SELECT * FROM products WHERE id = ?", [id]));
}

export async function createProduct(data, sellerId = null) {
  const product = {
    id: crypto.randomUUID(),
    sellerId,
    name: String(data.name || "").trim(),
    description: String(data.description || "").trim(),
    category: String(data.category || "").trim(),
    price: Number(data.price) || 0,
    dimensions: data.dimensions || null,
    modelUrl: data.modelUrl || null,
    previewColor: data.previewColor || null,
    imagePreview: data.imagePreview || null,
    inStock: data.inStock !== false,
    createdAt: new Date().toISOString(),
  };
  run(
    `INSERT INTO products (id, seller_id, name, description, category, price, dimensions, model_url, preview_color, image_preview, in_stock, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.id, product.sellerId, product.name, product.description, product.category, product.price,
      product.dimensions ? JSON.stringify(product.dimensions) : null, product.modelUrl, product.previewColor,
      product.imagePreview, product.inStock ? 1 : 0, product.createdAt,
    ]
  );
  return product;
}

// Only the seller who created a listing can edit it — used by the listing
// chatbot's progressive extraction (ListProducts.jsx) to refresh a product
// already on the storefront as the conversation adds more detail, instead
// of creating a duplicate every time.
export async function updateProduct(id, sellerId, patch) {
  const existing = toProduct(get("SELECT * FROM products WHERE id = ? AND seller_id = ?", [id, sellerId]));
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  run(
    `UPDATE products SET name = ?, description = ?, category = ?, price = ?, dimensions = ?, model_url = ?, preview_color = ?, image_preview = ?, in_stock = ?
     WHERE id = ? AND seller_id = ?`,
    [
      merged.name, merged.description, merged.category, merged.price,
      merged.dimensions ? JSON.stringify(merged.dimensions) : null, merged.modelUrl, merged.previewColor,
      merged.imagePreview, merged.inStock ? 1 : 0, id, sellerId,
    ]
  );
  return toProduct(get("SELECT * FROM products WHERE id = ?", [id]));
}

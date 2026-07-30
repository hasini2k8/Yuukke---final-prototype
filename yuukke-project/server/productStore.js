// Local file-based product store for dev/demo use — extends the local proxy
// server (server/index.js) so shopkeeper listings persist across sessions
// without needing a hosted database. Production on Vercel needs a real
// database (serverless functions don't have durable local disk) — this only
// runs under `npm run dev`.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data", "products.json");

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

async function ensureStore() {
  if (!existsSync(DATA_FILE)) {
    await mkdir(path.dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(SEED_PRODUCTS, null, 2));
  }
}

async function readAll() {
  await ensureStore();
  const raw = await readFile(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeAll(products) {
  await writeFile(DATA_FILE, JSON.stringify(products, null, 2));
}

export async function listProducts() {
  return readAll();
}

export async function getProduct(id) {
  const products = await readAll();
  return products.find((p) => p.id === id) || null;
}

export async function createProduct(data) {
  const products = await readAll();
  const product = {
    id: crypto.randomUUID(),
    name: String(data.name || "").trim(),
    description: String(data.description || "").trim(),
    category: String(data.category || "").trim(),
    price: Number(data.price) || 0,
    dimensions: data.dimensions || null,
    modelUrl: data.modelUrl || null,
    previewColor: data.previewColor || null,
    imagePreview: data.imagePreview || null,
    createdAt: new Date().toISOString(),
  };
  products.push(product);
  await writeAll(products);
  return product;
}

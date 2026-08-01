// Real embedded SQL database (Node's built-in node:sqlite — no native build
// step, no extra dependency) backing every store in this app. Replaces the
// old JSON-file stores (jsonStore.js). Local dev only, same as everything
// else under server/ — see productStore.js for the production caveat.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "yuukke.db"));
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  business_name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  seller_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price REAL NOT NULL DEFAULT 0,
  dimensions TEXT,
  model_url TEXT,
  preview_color TEXT,
  image_preview TEXT,
  in_stock INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  total REAL NOT NULL,
  address TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  business_name TEXT,
  tagline TEXT,
  about TEXT,
  category TEXT,
  accent_color TEXT,
  hero_style TEXT,
  sections TEXT,
  is_tech INTEGER,
  logo_prompt TEXT,
  logo_data_url TEXT,
  slug TEXT UNIQUE,
  published INTEGER NOT NULL DEFAULT 0,
  connections TEXT,
  brand_guidelines TEXT,
  characters TEXT,
  zernio_profile_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  caption TEXT,
  image_data_url TEXT,
  scheduled_for TEXT,
  status TEXT NOT NULL,
  zernio_post_id TEXT,
  schedule_error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS business_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  sells_what TEXT,
  category TEXT,
  target_customers TEXT,
  price_range TEXT,
  style_mood TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

// Prepared-statement params can be positional (an array, for "?" placeholders)
// or named (a plain object, for "@name" placeholders) — node:sqlite's
// get/all/run take those as spread positional args or a single object arg
// respectively, so array-ness decides how we call through.
function args(params) {
  return Array.isArray(params) ? params : [params];
}

export function get(sql, params = []) {
  return db.prepare(sql).get(...args(params));
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...args(params));
}

export function run(sql, params = []) {
  return db.prepare(sql).run(...args(params));
}

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
  seller_id TEXT,
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
  seller_id TEXT PRIMARY KEY,
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  topic TEXT,
  caption TEXT,
  image_data_url TEXT,
  scheduled_for TEXT,
  scheduled_time TEXT,
  status TEXT NOT NULL,
  external_post_id TEXT,
  schedule_error TEXT,
  created_at TEXT NOT NULL
);
`);

// Provider credentials live in Postiz; Yuukke stores selected Postiz
// integration ids in sites.connections. Old direct-OAuth tables are unused.
db.exec("DROP TABLE IF EXISTS social_connections;");
db.exec("DROP TABLE IF EXISTS oauth_states;");

// `CREATE TABLE IF NOT EXISTS` above doesn't retrofit columns onto a table
// that already exists from before this column was added — these do that,
// each one a no-op once already applied (SQLite errors adding a column
// that's already there, which this just swallows).
function addColumnIfMissing(table, column, definition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (e) {
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
}
addColumnIfMissing("posts", "topic", "TEXT");
addColumnIfMissing("posts", "scheduled_time", "TEXT");
addColumnIfMissing("posts", "video_url", "TEXT");
addColumnIfMissing("posts", "campaign_id", "TEXT");
addColumnIfMissing("posts", "calendar_number", "INTEGER");

db.exec(`
UPDATE posts
SET calendar_number = (
  SELECT COUNT(*) FROM posts AS earlier
  WHERE earlier.seller_id = posts.seller_id
    AND (earlier.created_at < posts.created_at OR (earlier.created_at = posts.created_at AND earlier.id <= posts.id))
)
WHERE calendar_number IS NULL;
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

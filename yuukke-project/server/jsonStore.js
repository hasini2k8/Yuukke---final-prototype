// Generic local JSON-file store, shared by every entity store (products,
// users, sessions, carts, wishlists, orders). Local dev only — see
// productStore.js for the production-persistence caveat, which applies
// identically to every store built on this helper.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");

export function createStore(filename, seed = []) {
  const file = path.join(DATA_DIR, filename);

  async function ensure() {
    if (!existsSync(file)) {
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(file, JSON.stringify(seed, null, 2));
    }
  }

  async function readAll() {
    await ensure();
    return JSON.parse(await readFile(file, "utf8"));
  }

  async function writeAll(data) {
    await writeFile(file, JSON.stringify(data, null, 2));
  }

  return { readAll, writeAll };
}

import crypto from "node:crypto";
import { all, get, run } from "./db.js";

function toPoster(row) {
  return row && { id: row.id, productId: row.product_id, productName: row.product_name || "", imageDataUrl: row.image_data_url, prompt: row.prompt || "", format: row.format, createdAt: row.created_at };
}

export function listPosters(sellerId) {
  return all(`SELECT pp.*, p.name product_name FROM product_posters pp JOIN products p ON p.id=pp.product_id WHERE pp.seller_id=? ORDER BY pp.created_at DESC`, [sellerId]).map(toPoster);
}

export function createPoster(sellerId, data) {
  const product = get("SELECT id FROM products WHERE id=? AND seller_id=?", [data.productId, sellerId]);
  if (!product) throw new Error("Product not found.");
  const poster = { id: crypto.randomUUID(), productId: data.productId, imageDataUrl: data.imageDataUrl, prompt: String(data.prompt || ""), format: String(data.format || "square"), createdAt: new Date().toISOString() };
  run("INSERT INTO product_posters (id,seller_id,product_id,image_data_url,prompt,format,created_at) VALUES (?,?,?,?,?,?,?)", [poster.id, sellerId, poster.productId, poster.imageDataUrl, poster.prompt, poster.format, poster.createdAt]);
  return toPoster(get(`SELECT pp.*, p.name product_name FROM product_posters pp JOIN products p ON p.id=pp.product_id WHERE pp.id=?`, [poster.id]));
}

export function deletePoster(sellerId, id) {
  return run("DELETE FROM product_posters WHERE id=? AND seller_id=?", [id, sellerId]).changes > 0;
}

import { all, run } from "./db.js";
import { getProduct } from "./productStore.js";

export async function getWishlist(userId) {
  const rows = all("SELECT product_id FROM wishlist_items WHERE user_id = ?", [userId]);
  const products = [];
  for (const row of rows) {
    const p = await getProduct(row.product_id);
    if (p) products.push(p);
  }
  return products;
}

export async function toggleWishlist(userId, productId) {
  const existing = all("SELECT 1 FROM wishlist_items WHERE user_id = ? AND product_id = ?", [userId, productId])[0];
  if (existing) {
    run("DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?", [userId, productId]);
  } else {
    run("INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)", [userId, productId]);
  }
  return getWishlist(userId);
}

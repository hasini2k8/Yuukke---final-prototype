import { all, run } from "./db.js";
import { getProduct } from "./productStore.js";

async function enrich(rows) {
  const enriched = [];
  for (const row of rows) {
    const product = await getProduct(row.product_id);
    if (!product) continue;
    enriched.push({ productId: row.product_id, quantity: row.quantity, product });
  }
  return enriched;
}

export async function getCart(userId) {
  const rows = all("SELECT product_id, quantity FROM cart_items WHERE user_id = ?", [userId]);
  return { items: await enrich(rows) };
}

export async function addToCart(userId, productId, quantity = 1) {
  const existing = all("SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?", [userId, productId])[0];
  if (existing) {
    run("UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?", [existing.quantity + quantity, userId, productId]);
  } else {
    run("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)", [userId, productId, quantity]);
  }
  return getCart(userId);
}

export async function updateCartItem(userId, productId, quantity) {
  if (quantity <= 0) {
    run("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", [userId, productId]);
  } else {
    run(
      "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = excluded.quantity",
      [userId, productId, quantity]
    );
  }
  return getCart(userId);
}

export async function removeCartItem(userId, productId) {
  return updateCartItem(userId, productId, 0);
}

export async function clearCart(userId) {
  run("DELETE FROM cart_items WHERE user_id = ?", [userId]);
}

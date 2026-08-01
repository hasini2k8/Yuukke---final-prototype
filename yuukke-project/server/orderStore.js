// Mock checkout — records a real order (items, total, address) but never
// touches any real payment processor. "status" is always "confirmed"; there
// is no actual money movement anywhere in this flow.
import crypto from "node:crypto";
import { all, run } from "./db.js";
import { getCart, clearCart } from "./cartStore.js";

function toOrder(row, items) {
  return {
    id: row.id,
    userId: row.user_id,
    items: items.map((i) => ({ productId: i.product_id, name: i.name, price: i.price, quantity: i.quantity })),
    total: row.total,
    address: row.address ? JSON.parse(row.address) : null,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listOrders(userId) {
  const rows = all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId]);
  return rows.map((row) => toOrder(row, all("SELECT * FROM order_items WHERE order_id = ?", [row.id])));
}

export async function getOrder(userId, orderId) {
  const row = all("SELECT * FROM orders WHERE id = ? AND user_id = ?", [orderId, userId])[0];
  if (!row) return null;
  return toOrder(row, all("SELECT * FROM order_items WHERE order_id = ?", [row.id]));
}

export async function placeOrder(userId, address) {
  const cart = await getCart(userId);
  if (!cart.items.length) throw new Error("Your cart is empty.");

  const items = cart.items.map((i) => ({
    productId: i.productId, name: i.product.name, price: i.product.price, quantity: i.quantity,
  }));
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const order = {
    id: crypto.randomUUID(),
    userId,
    items,
    total,
    address: address || null,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  run(
    "INSERT INTO orders (id, user_id, total, address, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [order.id, order.userId, order.total, order.address ? JSON.stringify(order.address) : null, order.status, order.createdAt]
  );
  for (const item of items) {
    run(
      "INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
      [order.id, item.productId, item.name, item.price, item.quantity]
    );
  }
  await clearCart(userId);
  return order;
}

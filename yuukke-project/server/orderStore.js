// Mock checkout — records a real order (items, total, address) but never
// touches any real payment processor. "status" is always "confirmed"; there
// is no actual money movement anywhere in this flow.
import crypto from "node:crypto";
import { createStore } from "./jsonStore.js";
import { getCart, clearCart } from "./cartStore.js";

const store = createStore("orders.json", []);

export async function listOrders(userId) {
  const orders = await store.readAll();
  return orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getOrder(userId, orderId) {
  const orders = await store.readAll();
  return orders.find((o) => o.id === orderId && o.userId === userId) || null;
}

export async function placeOrder(userId, address) {
  const cart = await getCart(userId);
  if (!cart.items.length) throw new Error("Your cart is empty.");

  const orders = await store.readAll();
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
  orders.push(order);
  await store.writeAll(orders);
  await clearCart(userId);
  return order;
}

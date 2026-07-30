import { createStore } from "./jsonStore.js";
import { getProduct } from "./productStore.js";

const store = createStore("carts.json", []);

async function getCartDoc(userId) {
  const carts = await store.readAll();
  let doc = carts.find((c) => c.userId === userId);
  if (!doc) {
    doc = { userId, items: [] };
    carts.push(doc);
    await store.writeAll(carts);
  }
  return { carts, doc };
}

async function enrich(items) {
  const enriched = [];
  for (const item of items) {
    const product = await getProduct(item.productId);
    if (!product) continue;
    enriched.push({ productId: item.productId, quantity: item.quantity, product });
  }
  return enriched;
}

export async function getCart(userId) {
  const { doc } = await getCartDoc(userId);
  return { items: await enrich(doc.items) };
}

export async function addToCart(userId, productId, quantity = 1) {
  const { carts, doc } = await getCartDoc(userId);
  const existing = doc.items.find((i) => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else doc.items.push({ productId, quantity });
  await store.writeAll(carts);
  return getCart(userId);
}

export async function updateCartItem(userId, productId, quantity) {
  const { carts, doc } = await getCartDoc(userId);
  if (quantity <= 0) {
    doc.items = doc.items.filter((i) => i.productId !== productId);
  } else {
    const existing = doc.items.find((i) => i.productId === productId);
    if (existing) existing.quantity = quantity;
  }
  await store.writeAll(carts);
  return getCart(userId);
}

export async function removeCartItem(userId, productId) {
  return updateCartItem(userId, productId, 0);
}

export async function clearCart(userId) {
  const { carts, doc } = await getCartDoc(userId);
  doc.items = [];
  await store.writeAll(carts);
}

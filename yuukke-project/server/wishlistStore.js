import { createStore } from "./jsonStore.js";
import { getProduct } from "./productStore.js";

const store = createStore("wishlists.json", []);

async function getDoc(userId) {
  const lists = await store.readAll();
  let doc = lists.find((l) => l.userId === userId);
  if (!doc) {
    doc = { userId, productIds: [] };
    lists.push(doc);
    await store.writeAll(lists);
  }
  return { lists, doc };
}

export async function getWishlist(userId) {
  const { doc } = await getDoc(userId);
  const products = [];
  for (const id of doc.productIds) {
    const p = await getProduct(id);
    if (p) products.push(p);
  }
  return products;
}

export async function toggleWishlist(userId, productId) {
  const { lists, doc } = await getDoc(userId);
  if (doc.productIds.includes(productId)) {
    doc.productIds = doc.productIds.filter((id) => id !== productId);
  } else {
    doc.productIds.push(productId);
  }
  await store.writeAll(lists);
  return getWishlist(userId);
}

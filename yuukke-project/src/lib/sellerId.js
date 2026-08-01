// Anonymous per-browser seller identity — the business platform (storefront/
// brand/marketing) has no login, so this permanent id, generated once and
// stored locally, is all that scopes a seller's data server-side. Unlike the
// buyer marketplace's real login (src/lib/auth.js), there's no password
// behind this: anyone who obtains the id can act as that seller. That's an
// intentional simplicity tradeoff, not an oversight — see the plan notes.
const SELLER_ID_KEY = "yuukke_seller_id";

export function getSellerId() {
  let id = localStorage.getItem(SELLER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SELLER_ID_KEY, id);
  }
  return id;
}

// Fetch wrapper that attaches the seller id — use for every seller-side
// /api/site, /api/posts, /api/social, and product-write call. Buyer calls
// (/api/cart, /api/wishlist, /api/orders) keep using authFetch (src/lib/auth.js).
export function sellerFetch(url, opts = {}) {
  return fetch(url, { ...opts, headers: { ...(opts.headers || {}), "X-Seller-Id": getSellerId() } });
}

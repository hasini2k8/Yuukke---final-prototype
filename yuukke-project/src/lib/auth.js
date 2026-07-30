const TOKEN_KEY = "yuukke_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function unwrap(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function signup({ email, password, businessName }) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, businessName }),
  });
  const data = await unwrap(res);
  setToken(data.token);
  return data.user;
}

export async function login({ email, password }) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await unwrap(res);
  setToken(data.token);
  return data.user;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() }).catch(() => {});
  setToken(null);
}

export async function getCurrentUser() {
  if (!getToken()) return null;
  const res = await fetch("/api/auth/me", { headers: authHeaders() });
  const data = await unwrap(res);
  return data.user;
}

// Fetch wrapper that attaches the auth token — use for every /api/cart,
// /api/wishlist, and /api/orders call.
export function authFetch(url, opts = {}) {
  return fetch(url, { ...opts, headers: { ...(opts.headers || {}), ...authHeaders() } });
}

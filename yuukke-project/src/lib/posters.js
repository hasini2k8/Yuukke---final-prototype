import { sellerFetch } from "./sellerId";
async function unwrap(res) { const data = await res.json().catch(() => null); if (!res.ok) throw new Error(data?.message || "Poster request failed."); return data; }
export const fetchPosters = async () => unwrap(await sellerFetch("/api/posters"));
export const savePoster = async (poster) => unwrap(await sellerFetch("/api/posters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(poster) }));
export const deletePoster = async (id) => unwrap(await sellerFetch(`/api/posters/${id}`, { method: "DELETE" }));

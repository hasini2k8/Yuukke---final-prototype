// SQLite-backed store (server/db.js) for the one-time "what do you want to
// sell" survey each seller fills in after signup — grounds the AI storefront
// and product-listing generators in what this specific business actually is,
// instead of only the seller's own freeform description.
import { get, run } from "./db.js";

function toProfile(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    sellsWhat: row.sells_what || "",
    category: row.category || "",
    targetCustomers: row.target_customers || "",
    priceRange: row.price_range || "",
    styleMood: row.style_mood || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getBusinessProfile(userId) {
  return toProfile(get("SELECT * FROM business_profiles WHERE user_id = ?", [userId]));
}

export async function saveBusinessProfile(userId, patch) {
  const existing = toProfile(get("SELECT * FROM business_profiles WHERE user_id = ?", [userId])) || {};
  const merged = { ...existing, ...patch };
  const now = new Date().toISOString();
  merged.updatedAt = now;
  if (!merged.createdAt) merged.createdAt = now;

  run(
    `INSERT INTO business_profiles (user_id, sells_what, category, target_customers, price_range, style_mood, created_at, updated_at)
     VALUES (@user_id, @sells_what, @category, @target_customers, @price_range, @style_mood, @created_at, @updated_at)
     ON CONFLICT(user_id) DO UPDATE SET
       sells_what = excluded.sells_what, category = excluded.category, target_customers = excluded.target_customers,
       price_range = excluded.price_range, style_mood = excluded.style_mood, updated_at = excluded.updated_at`,
    {
      user_id: userId,
      sells_what: merged.sellsWhat || null,
      category: merged.category || null,
      target_customers: merged.targetCustomers || null,
      price_range: merged.priceRange || null,
      style_mood: merged.styleMood || null,
      created_at: merged.createdAt,
      updated_at: merged.updatedAt,
    }
  );
  return toProfile(get("SELECT * FROM business_profiles WHERE user_id = ?", [userId]));
}

// SQLite-backed store (server/db.js) for each seller's AI-generated business
// website — one row per seller, keyed by their anonymous id
// (src/lib/sellerId.js), not an account. See productStore.js for the
// production-persistence caveat.
//
// `connections` stores the Postiz integration selected for each platform.
// Postiz retains the actual provider credentials; Yuukke stores only the
// integration id and display handle.
import crypto from "node:crypto";
import { get, run } from "./db.js";

function slugify(name) {
  const base = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "store"}-${crypto.randomUUID().slice(0, 6)}`;
}

function toSite(row) {
  if (!row) return null;
  return {
    sellerId: row.seller_id,
    businessName: row.business_name || "",
    tagline: row.tagline || "",
    about: row.about || "",
    category: row.category || "",
    accentColor: row.accent_color || "",
    heroStyle: row.hero_style || "",
    sections: row.sections ? JSON.parse(row.sections) : [],
    isTech: !!row.is_tech,
    logoPrompt: row.logo_prompt || "",
    logoDataUrl: row.logo_data_url || "",
    slug: row.slug || "",
    published: !!row.published,
    connections: row.connections ? JSON.parse(row.connections) : {},
    brandGuidelines: row.brand_guidelines ? JSON.parse(row.brand_guidelines) : null,
    characters: row.characters ? JSON.parse(row.characters) : [],
    websiteContent: row.website_content ? JSON.parse(row.website_content) : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSite(sellerId) {
  return toSite(get("SELECT * FROM sites WHERE seller_id = ?", [sellerId]));
}

export async function saveSite(sellerId, patch) {
  const existing = toSite(get("SELECT * FROM sites WHERE seller_id = ?", [sellerId])) || {};
  const merged = {
    ...existing,
    ...patch,
    connections: { ...existing.connections, ...patch.connections },
  };
  if (!merged.slug && merged.businessName) merged.slug = slugify(merged.businessName);
  const now = new Date().toISOString();
  merged.updatedAt = now;
  if (!merged.createdAt) merged.createdAt = now;

  run(
    `INSERT INTO sites (seller_id, business_name, tagline, about, category, accent_color, hero_style, sections, is_tech, logo_prompt, logo_data_url, slug, published, connections, brand_guidelines, characters, website_content, created_at, updated_at)
     VALUES (@seller_id, @business_name, @tagline, @about, @category, @accent_color, @hero_style, @sections, @is_tech, @logo_prompt, @logo_data_url, @slug, @published, @connections, @brand_guidelines, @characters, @website_content, @created_at, @updated_at)
     ON CONFLICT(seller_id) DO UPDATE SET
       business_name = excluded.business_name, tagline = excluded.tagline, about = excluded.about,
       category = excluded.category, accent_color = excluded.accent_color, hero_style = excluded.hero_style,
       sections = excluded.sections, is_tech = excluded.is_tech, logo_prompt = excluded.logo_prompt,
       logo_data_url = excluded.logo_data_url, slug = excluded.slug, published = excluded.published,
       connections = excluded.connections,
       brand_guidelines = excluded.brand_guidelines,
       characters = excluded.characters, website_content = excluded.website_content, updated_at = excluded.updated_at`,
    {
      seller_id: sellerId,
      business_name: merged.businessName || null,
      tagline: merged.tagline || null,
      about: merged.about || null,
      category: merged.category || null,
      accent_color: merged.accentColor || null,
      hero_style: merged.heroStyle || null,
      sections: merged.sections ? JSON.stringify(merged.sections) : null,
      is_tech: merged.isTech ? 1 : 0,
      logo_prompt: merged.logoPrompt || null,
      logo_data_url: merged.logoDataUrl || null,
      slug: merged.slug || null,
      published: merged.published ? 1 : 0,
      connections: JSON.stringify(merged.connections || {}),
      brand_guidelines: merged.brandGuidelines ? JSON.stringify(merged.brandGuidelines) : null,
      characters: merged.characters ? JSON.stringify(merged.characters) : null,
      website_content: JSON.stringify(merged.websiteContent || {}),
      created_at: merged.createdAt,
      updated_at: merged.updatedAt,
    }
  );
  return toSite(get("SELECT * FROM sites WHERE seller_id = ?", [sellerId]));
}

export async function getSiteBySlug(slug) {
  const row = get("SELECT * FROM sites WHERE slug = ? AND published = 1", [slug]);
  return toSite(row);
}

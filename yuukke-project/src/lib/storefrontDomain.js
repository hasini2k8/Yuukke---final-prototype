const ROOT_DOMAIN = String(import.meta.env.VITE_STOREFRONT_DOMAIN || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
const RESERVED = new Set(["www", "app", "api"]);

export function storefrontSlugFromHostname(hostname = window.location.hostname) {
  const host = hostname.toLowerCase().split(":")[0];
  if (!ROOT_DOMAIN || host === ROOT_DOMAIN || !host.endsWith(`.${ROOT_DOMAIN}`)) return "";
  const subdomain = host.slice(0, -(ROOT_DOMAIN.length + 1));
  return subdomain && !subdomain.includes(".") && !RESERVED.has(subdomain) ? subdomain : "";
}

export function storefrontUrl(slug) {
  if (!slug) return "";
  return ROOT_DOMAIN ? `https://${slug}.${ROOT_DOMAIN}` : `${window.location.origin}/site/${slug}`;
}

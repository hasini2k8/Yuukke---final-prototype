import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Camera, Briefcase, Pin, Sparkles, ArrowRight } from "lucide-react";
import { theme } from "../theme";
import { Logo, Spinner } from "../components/Shared";
import { fetchPublicSite } from "../lib/site";
import { fetchProducts } from "../lib/products";

const PLATFORM_ICONS = { instagram: Camera, linkedin: Briefcase, pinterest: Pin };

export default function GeneratedSitePage() {
  const { slug } = useParams();
  const [site, setSite] = useState(null);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | missing

  useEffect(() => {
    let cancelled = false;
    fetchPublicSite(slug)
      .then((record) => {
        if (cancelled) return;
        setSite(record);
        setStatus("ready");
        return fetchProducts();
      })
      .then((list) => { if (!cancelled && list) setProducts(list); })
      .catch(() => { if (!cancelled) setStatus("missing"); });
    return () => { cancelled = true; };
  }, [slug]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.cream }}>
        <Spinner size={22} color={theme.wine} />
      </div>
    );
  }

  if (status === "missing" || !site) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: theme.cream, padding: 24, textAlign: "center" }}>
        <Logo size={30} />
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 22, color: theme.ink, margin: "20px 0 8px" }}>This storefront isn't public yet</h1>
        <p style={{ fontSize: 13.5, color: theme.inkSoft, maxWidth: 380, fontFamily: theme.fontBody }}>
          The seller hasn't published this website, or the link isn't quite right.
        </p>
        <Link to="/" style={{ marginTop: 20, fontSize: 13.5, fontWeight: 700, color: theme.wine }}>Back to Yuukke</Link>
      </div>
    );
  }

  const connectedPlatforms = Object.entries(site.connections || {}).filter(([, on]) => on).map(([p]) => p);

  return (
    <div style={{ background: theme.cream, minHeight: "100vh", fontFamily: theme.fontBody }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", background: theme.white, borderBottom: `1px solid ${theme.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {site.logoDataUrl ? (
            <img src={site.logoDataUrl} alt={`${site.businessName} logo`} style={{ width: 34, height: 34, borderRadius: 9, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: 9, background: theme.wineTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={16} color={theme.wine} />
            </div>
          )}
          <span style={{ fontFamily: theme.fontDisplay, fontSize: 17, color: theme.ink, fontWeight: 700 }}>{site.businessName}</span>
        </div>
        <Link to="/marketplace" style={{ fontSize: 12.5, fontWeight: 700, color: theme.wine, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          Shop all of Yuukke <ArrowRight size={13} />
        </Link>
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${site.accentColor || theme.wine}, ${site.accentColor || theme.wine}cc)`,
        padding: "64px 32px", color: "#fff", textAlign: "center",
      }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, opacity: 0.85, margin: "0 0 10px" }}>
          {(site.heroStyle || "warm").toUpperCase()} · {site.category || "HANDMADE"}
        </p>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 38, margin: "0 0 12px" }}>{site.tagline}</h1>
      </div>

      {site.about && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 10px", textAlign: "center" }}>
          <p style={{ fontSize: 15, color: theme.inkSoft, lineHeight: 1.7 }}>{site.about}</p>
        </div>
      )}

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "30px 24px 60px" }}>
        <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 20, color: theme.ink, textAlign: "center", margin: "10px 0 24px" }}>
          Shop {site.businessName}
        </h2>
        {products.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18 }}>
            {products.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} style={{ textDecoration: "none", border: `1px solid ${theme.line}`, borderRadius: 14, padding: 16, background: theme.white }}>
                <div style={{
                  width: "100%", aspectRatio: "1", borderRadius: 10, marginBottom: 12, overflow: "hidden",
                  background: p.previewColor || theme.creamDark, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {p.imagePreview ? (
                    <img src={p.imagePreview} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Sparkles size={20} color="#fff" />
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: theme.ink, margin: "0 0 4px" }}>{p.name}</p>
                <p style={{ fontSize: 12.5, color: theme.inkSoft, margin: 0 }}>₹{Number(p.price || 0).toLocaleString("en-IN")}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", fontSize: 13.5, color: theme.inkSoft }}>Products will show up here soon.</p>
        )}
      </div>

      {connectedPlatforms.length > 0 && (
        <div style={{ borderTop: `1px solid ${theme.line}`, background: theme.white, padding: "26px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: theme.inkSoft, letterSpacing: 1 }}>FIND US ON</p>
          <div style={{ display: "flex", gap: 10 }}>
            {connectedPlatforms.map((p) => {
              const Icon = PLATFORM_ICONS[p];
              return (
                <span key={p} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999,
                  background: theme.wineTint, color: theme.wine, fontSize: 12, fontWeight: 700, textTransform: "capitalize",
                }}>
                  <Icon size={13} /> {p}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

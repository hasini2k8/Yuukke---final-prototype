import React from "react";
import { Star, Sparkles } from "lucide-react";
import { theme } from "../theme";

export default function StorePreview({ storeConfig, products, compact }) {
  const config = storeConfig || { accentColor: theme.wine, tagline: "Handmade with heart", heroStyle: "warm", sections: [] };
  const items = products || [];

  return (
    <div style={{ border: `1px solid ${theme.line}`, borderRadius: 16, overflow: "hidden", background: theme.white }}>
      <div style={{
        background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColor}cc)`,
        padding: compact ? "26px 24px" : "44px 32px", color: "#fff", textAlign: "center",
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, opacity: 0.85, margin: "0 0 8px" }}>
          {(config.heroStyle || "warm").toUpperCase()} STOREFRONT
        </p>
        <h3 style={{ fontFamily: theme.fontDisplay, fontSize: compact ? 20 : 28, margin: "0 0 6px" }}>{config.tagline}</h3>
      </div>

      {items.length > 0 ? (
        <div style={{
          display: "grid", gridTemplateColumns: compact ? "repeat(auto-fit, minmax(140px, 1fr))" : "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14, padding: 20,
        }}>
          {items.slice(0, compact ? 3 : 6).map((p, i) => (
            <div key={i} style={{ border: `1px solid ${theme.line}`, borderRadius: 12, padding: 14 }}>
              <div style={{ width: "100%", aspectRatio: "1", background: theme.creamDark, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: theme.inkSoft, marginBottom: 10 }}>
                {p.imagePreview ? <img src={p.imagePreview} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <Sparkles size={18} />}
              </div>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, margin: "0 0 4px" }}>{p.name}</p>
              <p style={{ fontSize: 12, color: theme.inkSoft, margin: 0 }}>₹{Number(p.price || 0).toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: theme.inkSoft, textAlign: "center", padding: 24, fontFamily: theme.fontBody }}>
          Products you list will show up here.
        </p>
      )}

      {(config.sections || []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 20px 20px" }}>
          {config.sections.map((s) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: theme.inkSoft, background: theme.cream, borderRadius: 999, padding: "5px 12px" }}>
              <Star size={10} color={theme.gold} /> {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

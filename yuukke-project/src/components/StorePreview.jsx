import React from "react";
import { Star, Sparkles, MessageCircle } from "lucide-react";
import { theme } from "../theme";

export default function StorePreview({ storeConfig, products, compact }) {
  const config = storeConfig || { accentColor: theme.wine, tagline: "Handmade with heart", heroStyle: "warm", sections: [] };
  const items = products || [];
  const content = config.websiteContent || {};

  return (
    <div style={{ border: `1px solid ${theme.line}`, borderRadius: 16, overflow: "hidden", background: theme.white }}>
      {content.announcement && <div style={{ padding: "6px 10px", textAlign: "center", background: config.accentColor, color: "#fff", fontSize: 9.5, fontWeight: 700 }}>{content.announcement}</div>}
      <div style={{
        background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColor}cc)`,
        padding: compact ? "26px 24px" : "44px 32px", color: "#fff", textAlign: "center",
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, opacity: 0.85, margin: "0 0 8px" }}>
          {(config.heroStyle || "warm").toUpperCase()} STOREFRONT
        </p>
        <h3 style={{ fontFamily: theme.fontDisplay, fontSize: compact ? 20 : 28, margin: "0 0 6px" }}>{content.heroHeadline || config.tagline}</h3>
        {content.heroSubheadline && <p style={{ fontSize: 11, opacity: .88, maxWidth: 420, margin: "0 auto 12px", lineHeight: 1.5 }}>{content.heroSubheadline}</p>}
        <span style={{ display: "inline-block", padding: "7px 12px", borderRadius: 999, background: "#fff", color: config.accentColor, fontSize: 10, fontWeight: 800 }}>{content.primaryCTA || "Shop now"}</span>
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
      {content.trustPoints?.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 7, padding: "0 20px 18px" }}>{content.trustPoints.map((point) => <div key={point} style={{ padding: 9, borderRadius: 9, background: theme.cream, textAlign: "center", fontSize: 9.5, color: theme.ink }}>{point}</div>)}</div>}
      {content.chatbot?.enabled && (config.sections || []).includes("Customer chatbot") && <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 15px 15px" }}><span style={{ width: 36, height: 36, borderRadius: "50%", background: config.accentColor, color: "#fff", display: "grid", placeItems: "center" }} title={content.chatbot.name}><MessageCircle size={16} /></span></div>}
    </div>
  );
}

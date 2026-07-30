import React from "react";
import { Sparkles, Leaf, Ruler, Tag as TagIcon, Star, Check } from "lucide-react";
import { theme } from "../../theme";

function TagRow({ tags }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {(tags || []).map((t) => (
        <span key={t} style={{ background: theme.wineTint, color: theme.wine, fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 999 }}>{t}</span>
      ))}
    </div>
  );
}

function VisualGridLayout({ listing }) {
  return (
    <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ aspectRatio: "1", background: theme.creamDark, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: theme.inkSoft }}>
            <Sparkles size={20} />
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, margin: "0 0 6px" }}>VISUAL LISTING</p>
      <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 21, color: theme.ink, margin: "0 0 8px" }}>{listing.title}</h3>
      <p style={{ fontSize: 19, fontWeight: 700, color: theme.ink, margin: "0 0 12px" }}>₹{Number(listing.price).toLocaleString("en-IN")}</p>
      <p style={{ fontSize: 13.5, color: theme.inkSoft, lineHeight: 1.6, margin: "0 0 16px" }}>{listing.description}</p>
      <TagRow tags={listing.tags} />
      <div style={{ display: "flex", gap: 18, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${theme.line}`, flexWrap: "wrap" }}>
        {(listing.highlights || []).map((h) => (
          <span key={h} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.ink, fontWeight: 600 }}>
            <Star size={13} color={theme.gold} /> {h}
          </span>
        ))}
      </div>
    </div>
  );
}

function StoryDrivenLayout({ listing }) {
  return (
    <div style={{ background: theme.wineTint, borderRadius: 18, padding: 30 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: theme.white, color: theme.wine, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, marginBottom: 16 }}>
        <Leaf size={12} /> Handcrafted by a Yuukke seller
      </span>
      <h3 style={{ fontFamily: theme.fontDisplay, fontStyle: "italic", fontSize: 26, color: theme.ink, margin: "0 0 14px", lineHeight: 1.3 }}>
        {listing.title}
      </h3>
      <p style={{ fontSize: 14.5, color: "#5a3f47", lineHeight: 1.75, margin: "0 0 20px" }}>{listing.description}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {(listing.highlights || []).map((h) => (
          <span key={h} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: theme.ink }}>
            <Check size={14} color={theme.wine} style={{ marginTop: 2, flexShrink: 0 }} /> {h}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: theme.white, borderRadius: 14, padding: "14px 18px" }}>
        <TagRow tags={listing.tags} />
        <span style={{ fontWeight: 700, fontSize: 17, color: theme.ink }}>₹{Number(listing.price).toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

function SpecSheetLayout({ listing }) {
  return (
    <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 26 }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, margin: "0 0 6px" }}>SPEC SHEET</p>
      <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 21, color: theme.ink, margin: "0 0 10px" }}>{listing.title}</h3>
      <p style={{ fontSize: 13.5, color: theme.inkSoft, lineHeight: 1.6, margin: "0 0 18px" }}>{listing.description}</p>
      <div style={{ borderTop: `1px solid ${theme.line}` }}>
        {(listing.highlights || []).map((h, i) => {
          const [label, ...rest] = String(h).split(":");
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${theme.line}`, fontSize: 13 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: theme.inkSoft, fontWeight: 600 }}><Ruler size={13} /> {label}</span>
              <span style={{ color: theme.ink, fontWeight: 600 }}>{rest.join(":") || "—"}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
        <TagRow tags={listing.tags} />
        <span style={{ fontWeight: 700, fontSize: 17, color: theme.ink }}>₹{Number(listing.price).toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

export default function ProductPreview({ listing }) {
  if (listing.layout === "story-driven") return <StoryDrivenLayout listing={listing} />;
  if (listing.layout === "spec-sheet") return <SpecSheetLayout listing={listing} />;
  return <VisualGridLayout listing={listing} />;
}

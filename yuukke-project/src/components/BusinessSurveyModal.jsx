import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { theme } from "../theme";
import { Logo, Spinner } from "./Shared";
import { saveBusinessProfile } from "../lib/businessProfile";

const PRICE_RANGES = [
  { value: "budget", label: "Budget-friendly" },
  { value: "mid", label: "Mid-range" },
  { value: "premium", label: "Premium" },
];
const STYLE_MOODS = [
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "warm", label: "Warm" },
  { value: "festive", label: "Festive" },
];

function label() {
  return { fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 };
}
function fieldStyle() {
  return { width: "100%", padding: "11px 14px", borderRadius: 11, border: `1.5px solid ${theme.line}`, fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream };
}

// Shown once, right after a fresh signup — before a new seller reaches their
// dashboard — so every AI feature downstream (storefront generator, brand
// guidelines, product-listing assistant) has real grounding in what this
// business actually sells instead of only whatever the seller happens to
// type into any one of those separately.
export default function BusinessSurveyModal({ onSaved }) {
  const [sellsWhat, setSellsWhat] = useState("");
  const [category, setCategory] = useState("");
  const [targetCustomers, setTargetCustomers] = useState("");
  const [priceRange, setPriceRange] = useState("mid");
  const [styleMood, setStyleMood] = useState("warm");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const profile = await saveBusinessProfile({ sellsWhat, category, targetCustomers, priceRange, styleMood });
      onSaved(profile);
    } catch (err) {
      setError(err.message || "Couldn't save that just now — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: theme.cream, minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
      <div style={{ background: theme.white, borderRadius: 20, border: `1px solid ${theme.line}`, padding: 36, maxWidth: 480, width: "100%" }}>
        <div style={{ marginBottom: 18 }}><Logo size={26} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Sparkles size={18} color={theme.wine} />
          <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 22, color: theme.ink, margin: 0 }}>Tell us about your business</h2>
        </div>
        <p style={{ fontSize: 13.5, color: theme.inkSoft, marginBottom: 24, fontFamily: theme.fontBody, lineHeight: 1.5 }}>
          A few quick questions so Yuukke's AI can design your storefront, write your first listings, and build your brand around what you actually sell — instead of guessing.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={label()}>What do you want to sell?</span>
            <textarea required rows={3} value={sellsWhat} onChange={(e) => setSellsWhat(e.target.value)}
              placeholder="e.g. Hand-block-printed cotton home textiles — table runners, cushion covers, scarves"
              style={{ ...fieldStyle(), resize: "vertical" }} />
          </label>

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={label()}>Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Home Decor, Fashion & Apparel, Festive Gifting" style={fieldStyle()} />
          </label>

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={label()}>Who's it for?</span>
            <input value={targetCustomers} onChange={(e) => setTargetCustomers(e.target.value)} placeholder="e.g. Urban gift buyers who care about handmade craft" style={fieldStyle()} />
          </label>

          <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
            <label style={{ flex: "1 1 160px" }}>
              <span style={label()}>Price range</span>
              <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} style={fieldStyle()}>
                {PRICE_RANGES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
            <label style={{ flex: "1 1 160px" }}>
              <span style={label()}>Style / mood</span>
              <select value={styleMood} onChange={(e) => setStyleMood(e.target.value)} style={fieldStyle()}>
                {STYLE_MOODS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>

          {error && <p style={{ color: "#a32d2d", fontSize: 12.5, marginBottom: 14 }}>{error}</p>}

          <button type="submit" disabled={saving} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: theme.wine, color: "#fff",
            border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving && <Spinner />} {saving ? "Saving…" : "Continue to my dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

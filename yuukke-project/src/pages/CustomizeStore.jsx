import React, { useState } from "react";
import { ArrowLeft, Wand2 } from "lucide-react";
import { theme, ACCENTS, ALL_SECTIONS } from "../theme";
import DashboardShell from "../components/DashboardShell";
import StorePreview from "../components/StorePreview";
import { Spinner } from "../components/Shared";
import { askClaudeJSON, STOREFRONT_SYSTEM_PROMPT } from "../lib/ai";
import { EN_STRINGS } from "../lib/strings";

const HERO_STYLES = ["minimal", "bold", "warm", "festive"];

export default function CustomizeStorePage({ goTo, storeConfig, setStoreConfig, products, speechLang }) {
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState(storeConfig || { accentColor: theme.wine, tagline: "Handmade with heart", heroStyle: "warm", sections: ["Hero banner", "Best sellers", "About the maker"] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!description.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await askClaudeJSON(STOREFRONT_SYSTEM_PROMPT, description);
      setConfig((c) => ({ ...c, ...result }));
    } catch (e) {
      setError("Couldn't generate a theme just now. Feel free to adjust the options below by hand.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(s) {
    setConfig((c) => ({ ...c, sections: c.sections.includes(s) ? c.sections.filter((x) => x !== s) : [...c.sections, s] }));
  }

  function save() {
    setStoreConfig(config);
    goTo("dashboard");
  }

  return (
    <DashboardShell goTo={goTo} active="customizeStore" businessName={null} t={(k) => EN_STRINGS[k] || k} speechLang={speechLang}>
      <span onClick={() => goTo("dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: theme.wine, cursor: "pointer", marginBottom: 18 }}>
        <ArrowLeft size={14} /> Back to dashboard
      </span>
      <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, color: theme.ink, margin: "0 0 8px" }}>Customize your storefront</h1>
      <p style={{ fontSize: 14.5, color: theme.inkSoft, marginBottom: 26, fontFamily: theme.fontBody, maxWidth: 560 }}>
        Describe the mood you want and Yuukke's AI will suggest a starting theme — an accent color, tagline, and layout — which you can fine-tune below.
      </p>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 300 }}>
          <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>Describe the look and feel you want</span>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. warm and earthy, festive but not loud, feels handmade"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${theme.line}`, fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream, resize: "vertical" }} />
            </label>
            {error && <p style={{ color: "#a32d2d", fontSize: 12.5, marginBottom: 12 }}>{error}</p>}
            <button onClick={generate} disabled={loading || !description.trim()} style={{
              display: "flex", alignItems: "center", gap: 8, background: theme.ink, color: "#fff", border: "none",
              borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13, cursor: !description.trim() ? "default" : "pointer",
              opacity: !description.trim() ? 0.5 : 1,
            }}>
              {loading ? <Spinner /> : <Wand2 size={14} />} {loading ? "Designing…" : "Generate theme"}
            </button>
          </div>

          <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginBottom: 20 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 12 }}>Accent color</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {ACCENTS.map((c) => (
                <button key={c} aria-label={`Use accent color ${c}`} onClick={() => setConfig((cfg) => ({ ...cfg, accentColor: c }))} style={{
                  width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer",
                  border: config.accentColor === c ? `3px solid ${theme.ink}` : "2px solid #fff",
                  boxShadow: config.accentColor === c ? `0 0 0 2px ${c}` : "none",
                }} />
              ))}
            </div>

            <label style={{ display: "block", marginBottom: 18 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>Tagline</span>
              <input value={config.tagline} onChange={(e) => setConfig((c) => ({ ...c, tagline: e.target.value }))} style={{
                width: "100%", padding: "11px 14px", borderRadius: 11, border: `1.5px solid ${theme.line}`,
                fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream,
              }} />
            </label>

            <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 10 }}>Hero style</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {HERO_STYLES.map((h) => (
                <button key={h} onClick={() => setConfig((c) => ({ ...c, heroStyle: h }))} style={{
                  padding: "8px 16px", borderRadius: 999, border: `1.5px solid ${config.heroStyle === h ? theme.wine : theme.line}`,
                  background: config.heroStyle === h ? theme.wine : "#fff", color: config.heroStyle === h ? "#fff" : theme.ink,
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                }}>{h}</button>
              ))}
            </div>

            <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 10 }}>Sections to show</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ALL_SECTIONS.map((s) => (
                <button key={s} onClick={() => toggleSection(s)} style={{
                  padding: "7px 14px", borderRadius: 999, border: `1.5px solid ${config.sections.includes(s) ? theme.wine : theme.line}`,
                  background: config.sections.includes(s) ? theme.wineTint : "#fff", color: config.sections.includes(s) ? theme.wine : theme.inkSoft,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>{s}</button>
              ))}
            </div>
          </div>

          <button onClick={save} style={{ background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "13px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Save storefront & continue
          </button>
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 300 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 12 }}>Live preview</p>
          <StorePreview storeConfig={config} products={products} />
        </div>
      </div>
    </DashboardShell>
  );
}

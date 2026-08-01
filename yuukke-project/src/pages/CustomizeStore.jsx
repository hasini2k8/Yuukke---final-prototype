import React, { useState, useEffect } from "react";
import { ArrowLeft, Wand2, Camera, Briefcase, Pin, Check, Copy, ExternalLink, Sparkles, Calendar } from "lucide-react";
import { theme, ACCENTS, ALL_SECTIONS } from "../theme";
import DashboardShell from "../components/DashboardShell";
import StorePreview from "../components/StorePreview";
import { Spinner } from "../components/Shared";
import { askGeminiJSON, generateImage, buildSurveyContext, BUSINESS_SITE_SYSTEM_PROMPT } from "../lib/ai";
import { fetchSite, saveSite, requestConnectUrl, refreshConnectionStatus } from "../lib/site";
import { EN_STRINGS } from "../lib/strings";

const HERO_STYLES = ["minimal", "bold", "warm", "festive"];

const PLATFORM_LABELS = {
  instagram: { label: "Instagram", icon: Camera },
  linkedin: { label: "LinkedIn", icon: Briefcase },
  pinterest: { label: "Pinterest", icon: Pin },
};

const connectInputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${theme.line}`,
  fontSize: 12.5, fontFamily: theme.fontBody, outline: "none", background: "#fff", marginBottom: 8,
};
const DEFAULT_CONFIG = {
  accentColor: theme.wine, tagline: "Handmade with heart", heroStyle: "warm",
  sections: ["Hero banner", "Best sellers", "About the maker"],
  businessName: "", about: "", category: "", isTech: false, logoPrompt: "", logoDataUrl: "",
  slug: "", published: false, connections: { instagram: { connected: false }, linkedin: { connected: false }, pinterest: { connected: false } },
};

export default function CustomizeStorePage({ goTo, storeConfig, setStoreConfig, products, businessProfile, speechLang }) {
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...storeConfig });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectError, setConnectError] = useState("");

  useEffect(() => {
    fetchSite().then((saved) => {
      if (saved) {
        setConfig((c) => ({ ...c, ...saved, connections: { ...c.connections, ...saved.connections } }));
        if (saved.connections?.instagram?.handle) setInstagramHandle(saved.connections.instagram.handle);
      }
    }).catch(() => {});
  }, []);

  async function generate() {
    if (!description.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await askGeminiJSON(BUSINESS_SITE_SYSTEM_PROMPT, buildSurveyContext(businessProfile) + description);
      setConfig((c) => ({ ...c, ...result }));
    } catch (e) {
      setError("Couldn't generate a theme just now. Feel free to adjust the options below by hand.");
    } finally {
      setLoading(false);
    }
  }

  async function generateLogo() {
    setLogoLoading(true);
    setLogoError("");
    try {
      const prompt = `${config.logoPrompt || "A simple, modern icon-style logo mark"} — for a small business called "${config.businessName || "this business"}". Flat vector style, single focal icon, primary color ${config.accentColor}, plain background, no text.`;
      const logoDataUrl = await generateImage(prompt);
      setConfig((c) => ({ ...c, logoDataUrl }));
      // If the site's already live, push the new logo immediately instead of
      // waiting for a separate Publish/Republish click — otherwise a
      // regenerated logo silently doesn't show up anywhere the seller can see.
      if (config.published) {
        saveSite({ businessName: config.businessName, logoDataUrl, published: true }).catch(() => {});
      }
    } catch (e) {
      setLogoError(e.message || "Couldn't generate a logo just now.");
    } finally {
      setLogoLoading(false);
    }
  }

  async function publishSite() {
    setPublishing(true);
    setPublishError("");
    try {
      const saved = await saveSite({ ...config, published: true });
      setConfig((c) => ({ ...c, ...saved }));
    } catch (e) {
      setPublishError(e.message || "Couldn't publish your storefront just now.");
    } finally {
      setPublishing(false);
    }
  }

  async function connectSocials(platform = "instagram") {
    setConnecting(true);
    setConnectError("");
    // Open the tab synchronously, in direct response to the click — by the
    // time the URL comes back from two awaited requests below, the browser
    // no longer treats a fresh window.open() as tied to that click and
    // silently blocks it as a popup. Navigating this already-open tab once
    // we have the URL doesn't have that problem. (Passing "noopener" here
    // would make window.open() return null even though the tab still
    // opens — we need the real reference back to navigate it, so sever the
    // opener link manually below instead, once we actually have it.)
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      if (platform === "instagram" && instagramHandle.trim()) {
        await saveSite({
          businessName: config.businessName,
          connections: { ...config.connections, instagram: { ...config.connections?.instagram, handle: instagramHandle.trim() } },
        });
      }
      const { url } = await requestConnectUrl(platform);
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      tab?.close();
      setConnectError(e.message || "Couldn't start connecting your accounts just now.");
    } finally {
      setConnecting(false);
    }
  }

  async function refreshConnections() {
    setRefreshing(true);
    setConnectError("");
    try {
      const saved = await refreshConnectionStatus();
      setConfig((c) => ({ ...c, ...saved, connections: { ...c.connections, ...saved.connections } }));
    } catch (e) {
      setConnectError(e.message || "Couldn't check your connection status just now.");
    } finally {
      setRefreshing(false);
    }
  }

  function toggleSection(s) {
    setConfig((c) => ({ ...c, sections: c.sections.includes(s) ? c.sections.filter((x) => x !== s) : [...c.sections, s] }));
  }

  async function save() {
    try {
      const saved = await saveSite(config);
      setStoreConfig(saved);
    } catch (e) {
      setStoreConfig(config); // keep the seller's edits visible locally even if the save failed
    }
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

          <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginBottom: 20 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 4 }}>Your business website</p>
            <p style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
              Generated from the description above — Yuukke's AI names your business, writes its story, and designs a logo. Publish it to get a real page your customers can visit.
            </p>

            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>Business name</span>
              <input value={config.businessName} onChange={(e) => setConfig((c) => ({ ...c, businessName: e.target.value }))}
                placeholder="Generate a theme above, or type your own" style={{
                  width: "100%", padding: "11px 14px", borderRadius: 11, border: `1.5px solid ${theme.line}`,
                  fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream,
                }} />
            </label>

            <label style={{ display: "block", marginBottom: 18 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>About</span>
              <textarea rows={3} value={config.about} onChange={(e) => setConfig((c) => ({ ...c, about: e.target.value }))} style={{
                width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${theme.line}`,
                fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream, resize: "vertical",
              }} />
            </label>

            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 14, background: theme.creamDark, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `1px solid ${theme.line}`,
              }}>
                {config.logoDataUrl ? (
                  <img src={config.logoDataUrl} alt="Business logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Sparkles size={20} color={theme.inkSoft} />
                )}
              </div>
              <div>
                <button onClick={generateLogo} disabled={logoLoading} style={{
                  display: "flex", alignItems: "center", gap: 7, background: theme.creamDark, color: theme.ink, border: "none",
                  borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", marginBottom: 6,
                }}>
                  {logoLoading ? <Spinner size={13} /> : <Wand2 size={13} />} {logoLoading ? "Designing…" : config.logoDataUrl ? "Regenerate logo" : "Generate logo"}
                </button>
                {logoError && <p style={{ color: "#a32d2d", fontSize: 12, margin: 0 }}>{logoError}</p>}
              </div>
            </div>

            {publishError && <p style={{ color: "#a32d2d", fontSize: 12.5, marginBottom: 12 }}>{publishError}</p>}
            <button onClick={publishSite} disabled={publishing || !config.businessName} style={{
              display: "flex", alignItems: "center", gap: 8, background: theme.ink, color: "#fff", border: "none",
              borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13, cursor: !config.businessName ? "default" : "pointer",
              opacity: !config.businessName ? 0.5 : 1, marginBottom: 14,
            }}>
              {publishing ? <Spinner size={14} /> : <ExternalLink size={14} />} {publishing ? "Publishing…" : config.published ? "Republish website" : "Publish website"}
            </button>

            {config.published && config.slug && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: theme.wineTint, borderRadius: 10, padding: "9px 12px", marginBottom: 20, flexWrap: "wrap" }}>
                <Check size={14} color={theme.wine} />
                <a href={`/site/${config.slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: theme.wine, textDecoration: "none" }}>
                  yuukke.app/site/{config.slug}
                </a>
                <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/site/${config.slug}`)} aria-label="Copy link" style={{ background: "none", border: "none", cursor: "pointer", color: theme.wine, padding: 2, marginLeft: "auto" }}>
                  <Copy size={13} />
                </button>
              </div>
            )}

            <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 10 }}>Connect your socials</p>
            <p style={{ fontSize: 11.5, color: theme.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
              One click, no technical setup. You'll log in the same way you already do on Instagram — nothing to copy or paste, and no passwords are ever shared with Yuukke.
            </p>

            <label style={{ display: "block", marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>Your Instagram username</span>
              <input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="e.g. mybrandshop" style={connectInputStyle} />
            </label>

            {connectError && <p style={{ color: "#a32d2d", fontSize: 11.5, margin: "0 0 10px" }}>{connectError}</p>}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <button onClick={() => connectSocials()} disabled={connecting || !config.businessName} style={{
                display: "flex", alignItems: "center", gap: 7, background: theme.wine, color: "#fff", border: "none",
                borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 12.5, cursor: !config.businessName ? "default" : "pointer",
                opacity: !config.businessName ? 0.5 : 1,
              }}>
                {connecting ? <Spinner size={13} /> : <ExternalLink size={13} />} Connect my accounts
              </button>
              <button onClick={refreshConnections} disabled={refreshing} style={{
                display: "flex", alignItems: "center", gap: 7, background: theme.creamDark, color: theme.ink, border: "none",
                borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
              }}>
                {refreshing ? <Spinner size={13} color={theme.ink} /> : null} I'm done connecting
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {Object.entries(PLATFORM_LABELS).map(([id, meta]) => {
                const connected = !!config.connections?.[id]?.connected;
                if (id === "linkedin" && !config.isTech && !connected) return null;
                const Icon = meta.icon;
                const clickable = !connected && !!config.businessName;
                return (
                  <button key={id} onClick={clickable ? () => connectSocials(id) : undefined} disabled={!clickable} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999,
                    border: `1.5px solid ${connected ? "#2c6e49" : theme.line}`, background: connected ? "#e6f2ea" : "#fff",
                    color: connected ? "#2c6e49" : theme.inkSoft, fontSize: 11.5, fontWeight: 700,
                    cursor: clickable ? "pointer" : "default", opacity: !config.businessName ? 0.5 : 1,
                  }}>
                    {connected ? <Check size={12} /> : <Icon size={12} />} {connected ? meta.label : `Connect ${meta.label}`}
                  </button>
                );
              })}
            </div>

            {config.published && (config.connections?.instagram?.connected || config.connections?.pinterest?.connected || config.connections?.linkedin?.connected) && (
              <button onClick={() => goTo("calendar")} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center",
                background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "11px 16px",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
                <Calendar size={14} /> Plan your posts
              </button>
            )}
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

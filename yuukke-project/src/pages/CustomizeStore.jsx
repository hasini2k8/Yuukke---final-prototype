import React, { useState, useEffect } from "react";
import { ArrowLeft, Wand2, Camera, Briefcase, Pin, Check, Copy, ExternalLink, Sparkles, Calendar } from "lucide-react";
import { theme, ACCENTS, ALL_SECTIONS } from "../theme";
import DashboardShell from "../components/DashboardShell";
import StorePreview from "../components/StorePreview";
import { Spinner } from "../components/Shared";
import MicButton from "../components/MicButton";
import SpeakButton from "../components/SpeakButton";
import { askGeminiJSON, generateImage, buildSurveyContext, BUSINESS_SITE_SYSTEM_PROMPT } from "../lib/ai";
import { fetchSite, saveSite } from "../lib/site";
import { connectPlatform, fetchConnections, disconnectPlatform } from "../lib/social";
import { EN_STRINGS } from "../lib/strings";

const HERO_STYLES = ["minimal", "bold", "warm", "festive"];

const PLATFORM_LABELS = {
  instagram: { label: "Instagram", icon: Camera },
  linkedin: { label: "LinkedIn", icon: Briefcase },
  pinterest: { label: "Pinterest", icon: Pin },
};

const DEFAULT_CONFIG = {
  accentColor: theme.wine, tagline: "Handmade with heart", heroStyle: "warm",
  sections: ["Hero banner", "Best sellers", "About the maker"],
  businessName: "", about: "", category: "", isTech: false, logoPrompt: "", logoDataUrl: "",
  slug: "", published: false,
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
  const [connections, setConnections] = useState([]);
  const [connectingPlatform, setConnectingPlatform] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [connectError, setConnectError] = useState("");

  useEffect(() => {
    fetchSite().then((saved) => {
      if (saved) setConfig((c) => ({ ...c, ...saved }));
    }).catch(() => {});
    loadConnections();
  }, []);

  function loadConnections() {
    return fetchConnections().then(setConnections).catch(() => {});
  }

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

  // One click per platform — real OAuth doesn't need a username typed in
  // ahead of time, the platform tells us who logged in once they're done.
  async function connectSocial(platform) {
    setConnectingPlatform(platform);
    setConnectError("");
    // Open the tab synchronously, in direct response to the click — by the
    // time the URL comes back from the awaited request below, the browser
    // no longer treats a fresh window.open() as tied to that click and
    // silently blocks it as a popup. Navigating this already-open tab once
    // we have the URL doesn't have that problem. (Passing "noopener" here
    // would make window.open() return null even though the tab still
    // opens — we need the real reference back to navigate it, so sever the
    // opener link manually below instead, once we actually have it.)
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const { url } = await connectPlatform(platform);
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      tab?.close();
      setConnectError(e.message || "Couldn't start connecting that account just now.");
    } finally {
      setConnectingPlatform("");
    }
  }

  async function disconnectSocial(platform) {
    setConnectError("");
    try {
      await disconnectPlatform(platform);
      await loadConnections();
    } catch (e) {
      setConnectError(e.message || "Couldn't disconnect that account just now.");
    }
  }

  // The OAuth flow finishes in a separate tab (server/index.js's /callback
  // route) — this re-checks what's actually connected once the seller's
  // back here, since we have no direct way to hear from that other tab.
  async function refreshConnections() {
    setRefreshing(true);
    setConnectError("");
    try {
      await loadConnections();
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
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. warm and earthy, festive but not loud, feels handmade"
                  style={{ flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${theme.line}`, fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream, resize: "vertical" }} />
                <MicButton size={34} lang={speechLang} onResult={(t) => setDescription((v) => (v ? `${v} ${t}` : t))} />
              </div>
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
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                Tagline <SpeakButton text={config.tagline} lang={speechLang} />
              </span>
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
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                About <SpeakButton text={config.about} lang={speechLang} />
              </span>
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
              One click per platform, no technical setup. You'll log in the same way you already do — nothing to copy or paste, and no passwords are ever shared with Yuukke.
            </p>

            {connectError && <p style={{ color: "#a32d2d", fontSize: 11.5, margin: "0 0 10px" }}>{connectError}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {Object.entries(PLATFORM_LABELS).map(([id, meta]) => {
                const connection = connections.find((c) => c.platform === id);
                if (id === "linkedin" && !config.isTech && !connection) return null;
                const Icon = meta.icon;
                return (
                  <div key={id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px",
                    borderRadius: 12, border: `1.5px solid ${connection ? "#2c6e49" : theme.line}`, background: connection ? "#e6f2ea" : "#fff",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon size={15} color={connection ? "#2c6e49" : theme.inkSoft} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: connection ? "#2c6e49" : theme.ink }}>
                        {connection ? `Connected as @${connection.username || "your account"}` : meta.label}
                      </span>
                    </div>
                    {connection ? (
                      <button onClick={() => disconnectSocial(id)} style={{ background: "none", border: "none", color: "#2c6e49", fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                        Disconnect
                      </button>
                    ) : (
                      <button onClick={() => connectSocial(id)} disabled={connectingPlatform === id || !config.businessName} style={{
                        display: "flex", alignItems: "center", gap: 6, background: theme.wine, color: "#fff", border: "none",
                        borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: !config.businessName ? "default" : "pointer",
                        opacity: !config.businessName ? 0.5 : 1,
                      }}>
                        {connectingPlatform === id ? <Spinner size={12} /> : <ExternalLink size={12} />} Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={refreshConnections} disabled={refreshing} style={{
              display: "flex", alignItems: "center", gap: 7, background: "none", border: `1.5px solid ${theme.line}`, color: theme.ink,
              borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", marginBottom: 16,
            }}>
              {refreshing ? <Spinner size={12} color={theme.ink} /> : null} Refresh status
            </button>

            {config.published && connections.length > 0 && (
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

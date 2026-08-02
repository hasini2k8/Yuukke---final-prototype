import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Camera, Briefcase, Check, Copy, ExternalLink, Sparkles, Calendar, Palette, Globe2, Megaphone, Eye } from "lucide-react";
import { theme, ACCENTS, ALL_SECTIONS } from "../theme";
import DashboardShell from "../components/DashboardShell";
import StorePreview from "../components/StorePreview";
import { Spinner } from "../components/Shared";
import SpeakButton from "../components/SpeakButton";
import TalkAnalyseExecuteBar from "../components/TalkAnalyseExecuteBar";
import PostGeneratorChat from "../components/PostGeneratorChat";
import GeneratedPostsPanel from "../components/GeneratedPostsPanel";
import WebsiteGeneratorChat from "../components/WebsiteGeneratorChat";
import { useTalkAnalyseExecute } from "../hooks/useTalkAnalyseExecute";
import { generateImage, buildEditContext, BUSINESS_SITE_SYSTEM_PROMPT } from "../lib/ai";
import { fetchSite, saveSite } from "../lib/site";
import { connectPlatform, fetchConnections, disconnectPlatform } from "../lib/social";
import { fetchPosts } from "../lib/posts";
import { EN_STRINGS } from "../lib/strings";
import { storefrontUrl } from "../lib/storefrontDomain";

const HERO_STYLES = ["minimal", "bold", "warm", "festive"];

const PLATFORM_LABELS = {
  instagram: { label: "Instagram", icon: Camera },
  linkedin: { label: "LinkedIn", icon: Briefcase },
};

const DEFAULT_CONFIG = {
  accentColor: theme.wine, tagline: "Handmade with heart", heroStyle: "warm",
  sections: ["Hero banner", "Featured products", "About the business", "Customer chatbot"],
  businessName: "", about: "", category: "", isTech: false, logoPrompt: "", logoDataUrl: "",
  slug: "", published: false,
  websiteContent: { announcement: "", heroHeadline: "", heroSubheadline: "", primaryCTA: "Shop now", secondaryCTA: "Our story", mission: "", story: "", featuredTitle: "Featured products", trustPoints: [], faqs: [], contact: { email: "", phone: "", whatsapp: "" }, policies: { shipping: "", returns: "", customOrders: "" }, newsletterHeading: "Stay in the loop", newsletterText: "", chatbot: { enabled: true, name: "Shop assistant", welcome: "Hello! How can I help you today?", quickQuestions: ["What do you sell?", "Which products are available?", "How can I order?"] } },
};

// Only the fields the AI actually owns — config also carries slug/published/
// connections and other non-AI bookkeeping that shouldn't round-trip through
// the edit prompt.
function siteAIFields(c) {
  return {
    businessName: c.businessName, tagline: c.tagline, about: c.about, accentColor: c.accentColor,
    heroStyle: c.heroStyle, sections: c.sections, category: c.category, isTech: c.isTech, logoPrompt: c.logoPrompt, websiteContent: c.websiteContent,
  };
}

export default function CustomizeStorePage({ goTo, storeConfig, setStoreConfig, products, speechLang }) {
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...storeConfig });
  const [siteLoaded, setSiteLoaded] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [connections, setConnections] = useState([]);
  const [connectingPlatform, setConnectingPlatform] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [existingPosts, setExistingPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const autoRanWebsite = useRef(false);
  const autoRanCatalog = useRef(false);
  const autoRanLogo = useRef(false);

  useEffect(() => {
    fetchSite().then((saved) => {
      if (saved) setConfig((c) => ({ ...c, ...saved }));
    }).catch(() => {}).finally(() => setSiteLoaded(true));
    loadConnections();
    // "pending" posts are staged for review here (PostGeneratorChat /
    // GeneratedPostsPanel below) — everything else is already calendar-
    // visible and is what pickRandomSlot checks density against.
    fetchPosts().then((all) => {
      setExistingPosts(all.filter((p) => p.status !== "pending"));
      setPendingPosts(all.filter((p) => p.status === "pending"));
    }).catch(() => {});
  }, []);

  function loadConnections() {
    return fetchConnections().then(setConnections).catch(() => {});
  }

  // Talk, analyse, execute — a full default identity (name, tagline, story,
  // colors, logo prompt) appears the moment the storefront tab is opened
  // for the first time, with no description required; the bar below is
  // then how the seller refines it, by voice or typing, same loop either way.
  const websiteEdit = useTalkAnalyseExecute({
    system: BUSINESS_SITE_SYSTEM_PROMPT,
    buildContext: (instruction) => buildEditContext({
      base: `Build this storefront only from these seller listings; never invent other products, services, reviews, or claims: ${JSON.stringify(products.map((p) => ({ name: p.name, category: p.category, price: p.price, description: p.description })))}`,
      current: config.businessName ? siteAIFields(config) : null,
      instruction,
    }),
    onExecute: async (result) => {
      setConfig((c) => ({ ...c, ...result }));
    },
  });

  useEffect(() => {
    if (!siteLoaded || autoRanWebsite.current || config.businessName) return;
    autoRanWebsite.current = true;
    websiteEdit.run("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteLoaded, config.businessName]);

  // A newly-created listing becomes the source of truth for the next site
  // draft. Existing seller chat edits are preserved unless the catalog is
  // newer than the last saved storefront.
  useEffect(() => {
    if (!siteLoaded || autoRanCatalog.current || !products.length || !config.businessName || websiteEdit.busy) return;
    const newestProduct = Math.max(...products.map((product) => Date.parse(product.createdAt || 0) || 0));
    const lastSiteSave = Date.parse(storeConfig?.updatedAt || 0) || 0;
    if (newestProduct > lastSiteSave) {
      autoRanCatalog.current = true;
      websiteEdit.run("Create or refresh the storefront identity, content, sections, and color scheme from the listed products only.");
    }
  }, [siteLoaded, products, storeConfig?.updatedAt, config.businessName, websiteEdit.busy]);

  // Logo isn't a JSON-shaped edit like the rest of the site, so this folds
  // the instruction into the image prompt directly rather than going
  // through useTalkAnalyseExecute — same talk/analyse/execute shape, just a
  // text-to-image "analyse" step instead of a text-to-JSON one.
  async function runLogo(instruction) {
    setLogoBusy(true);
    setLogoError("");
    try {
      const promptSeed = instruction || config.logoPrompt || "A simple, modern icon-style logo mark";
      const prompt = `${promptSeed} — for a small business called "${config.businessName || "this business"}". Flat vector style, single focal icon, primary color ${config.accentColor}, plain background, no text.`;
      const logoDataUrl = await generateImage(prompt);
      setConfig((c) => ({ ...c, logoDataUrl, logoPrompt: instruction ? promptSeed : c.logoPrompt }));
      // If the site's already live, push the new logo immediately instead of
      // waiting for a separate Publish/Republish click — otherwise a
      // regenerated logo silently doesn't show up anywhere the seller can see.
      if (config.published) {
        saveSite({ businessName: config.businessName, logoDataUrl, published: true }).catch(() => {});
      }
    } catch (e) {
      setLogoError(e.message || "Couldn't generate a logo just now.");
    } finally {
      setLogoBusy(false);
    }
  }

  useEffect(() => {
    if (!config.businessName || config.logoDataUrl || autoRanLogo.current) return;
    autoRanLogo.current = true;
    runLogo("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.businessName, config.logoDataUrl]);

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

  // Match this seller to a channel already connected in the subscribed
  // Postiz workspace. Social passwords and provider tokens stay in Postiz.
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
    try {
      await connectPlatform(platform);
      await loadConnections();
    } catch (e) {
      setConnectError(e.message || "Couldn't connect that Postiz channel just now.");
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

  // Re-check the selected channels against the live Postiz integrations.
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

  function updateWebsiteContent(field, value) {
    setConfig((current) => ({ ...current, websiteContent: { ...(current.websiteContent || {}), [field]: value } }));
  }

  function jumpTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <DashboardShell goTo={goTo} active="customizeStore" businessName={null} t={(k) => EN_STRINGS[k] || k} speechLang={speechLang}>
      <span onClick={() => goTo("dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: theme.wine, cursor: "pointer", marginBottom: 18 }}>
        <ArrowLeft size={14} /> Back to dashboard
      </span>
      <section style={{ background: `linear-gradient(135deg, ${theme.wine} 0%, #6f1833 58%, #b35a71 100%)`, borderRadius: 24, padding: "28px clamp(20px, 4vw, 38px)", color: "#fff", marginBottom: 22, boxShadow: "0 18px 48px rgba(78,18,39,.16)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.14)", fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em", marginBottom: 12 }}><Sparkles size={13} /> STOREFRONT STUDIO</span>
            <h1 style={{ fontFamily: theme.fontDisplay, fontSize: "clamp(27px, 4vw, 38px)", color: "#fff", margin: "0 0 8px", lineHeight: 1.08 }}>Build your shop, beautifully.</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.82)", margin: 0, maxWidth: 600, lineHeight: 1.55 }}>Design, publish, promote, and preview your storefront from one simple workspace. Type, speak, or edit everything manually.</p>
          </div>
          <button onClick={save} style={{ background: "#fff", color: theme.wine, border: "none", borderRadius: 12, padding: "12px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 8px 20px rgba(0,0,0,.12)" }}>Save storefront</button>
        </div>
      </section>

      <div aria-label="Storefront features" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 24 }}>
        {[["design-tools", Palette, "Design", "Theme, colors & layout"], ["website-tools", Globe2, "Website", "Name, logo & publishing"], ["social-tools", Megaphone, "Promote", "Socials, posts & calendar"], ["live-preview", Eye, "Preview", `${products.length} listed product${products.length === 1 ? "" : "s"}`]].map(([id, Icon, title, copy]) => (
          <button key={id} onClick={() => jumpTo(id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 14px", textAlign: "left", background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 14, cursor: "pointer", boxShadow: "0 5px 16px rgba(44,24,31,.04)" }}>
            <span style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, display: "grid", placeItems: "center", color: theme.wine, background: theme.wineTint }}><Icon size={17} /></span>
            <span><strong style={{ display: "block", fontSize: 12.5, color: theme.ink }}>{title}</strong><small style={{ color: theme.inkSoft, fontSize: 10.5 }}>{copy}</small></span>
          </button>
        ))}
      </div>

      <div id="design-tools" style={{ scrollMarginTop: 20 }}><WebsiteGeneratorChat config={config} products={products} onChange={(result) => {
        setConfig((current) => ({ ...current, ...result }));
        if (config.published) {
          saveSite({ ...result, published: true }).then((saved) => {
            setConfig((current) => ({ ...current, ...saved }));
            setStoreConfig(saved);
          }).catch(() => {});
        }
      }} speechLang={speechLang} /></div>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 300 }}>
          <div id="website-tools" style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginBottom: 20, scrollMarginTop: 20, boxShadow: "0 8px 28px rgba(44,24,31,.045)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>
              {config.businessName ? "Change the look and feel" : "Describe the look and feel you want"}
            </span>
            {!config.businessName && websiteEdit.busy ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.inkSoft, fontSize: 13 }}>
                <Spinner size={14} /> Designing your starting theme…
              </div>
            ) : (
              <TalkAnalyseExecuteBar
                placeholder="e.g. warm and earthy, festive but not loud, feels handmade"
                busy={websiteEdit.busy}
                error={websiteEdit.error}
                onSubmit={websiteEdit.run}
                speechLang={speechLang}
                busyLabel="Updating…"
                idleLabel={config.businessName ? "Update theme" : "Generate theme"}
              />
            )}
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
Generated automatically above — Yuukke's AI names your business, writes its story, and designs a logo. Publish it to get a real page your customers can visit.
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

            <details open style={{ marginBottom: 20, border: `1px solid ${theme.line}`, borderRadius: 13, padding: 14, background: theme.cream }}>
              <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 800, color: theme.ink }}>Website content and built-in chatbot</summary>
              <p style={{ fontSize: 11, color: theme.inkSoft, lineHeight: 1.5 }}>Edit these manually or tell the website assistant what to change.</p>
              {[["announcement", "Announcement bar", "e.g. Free delivery this festive week"], ["heroHeadline", "Hero headline", "Main website heading"], ["heroSubheadline", "Hero description", "Short reason customers should explore"], ["primaryCTA", "Main button", "e.g. Shop the collection"], ["mission", "Business mission", "Why this business exists"], ["story", "Our story", "The entrepreneur's story"], ["newsletterHeading", "Newsletter heading", "Stay in the loop"]].map(([field, label, placeholder]) => <label key={field} style={{ display: "block", marginTop: 10 }}><span style={{ display: "block", fontSize: 10.5, fontWeight: 800, color: theme.ink, marginBottom: 5 }}>{label}</span>{field === "story" || field === "heroSubheadline" ? <textarea rows={2} value={config.websiteContent?.[field] || ""} onChange={(e) => updateWebsiteContent(field, e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "9px 10px", border: `1px solid ${theme.line}`, borderRadius: 9, background: theme.white, fontFamily: theme.fontBody, resize: "vertical" }} /> : <input value={config.websiteContent?.[field] || ""} onChange={(e) => updateWebsiteContent(field, e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "9px 10px", border: `1px solid ${theme.line}`, borderRadius: 9, background: theme.white, fontFamily: theme.fontBody }} />}</label>)}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 8, marginTop: 10 }}>{[["email", "Contact email"], ["phone", "Phone"], ["whatsapp", "WhatsApp"]].map(([field, label]) => <label key={field}><span style={{ display: "block", fontSize: 10.5, fontWeight: 800, marginBottom: 4 }}>{label}</span><input value={config.websiteContent?.contact?.[field] || ""} onChange={(e) => updateWebsiteContent("contact", { ...(config.websiteContent?.contact || {}), [field]: e.target.value })} style={{ width: "100%", padding: "8px", border: `1px solid ${theme.line}`, borderRadius: 8 }} /></label>)}</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 13, fontSize: 11.5, fontWeight: 800, color: theme.ink }}><input type="checkbox" checked={config.websiteContent?.chatbot?.enabled !== false} onChange={(e) => updateWebsiteContent("chatbot", { ...(config.websiteContent?.chatbot || {}), enabled: e.target.checked })} /> Enable customer chatbot</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginTop: 9 }}><input aria-label="Chatbot name" value={config.websiteContent?.chatbot?.name || ""} onChange={(e) => updateWebsiteContent("chatbot", { ...(config.websiteContent?.chatbot || {}), name: e.target.value })} placeholder="Chatbot name" style={{ padding: 8, border: `1px solid ${theme.line}`, borderRadius: 8 }} /><input aria-label="Chatbot welcome message" value={config.websiteContent?.chatbot?.welcome || ""} onChange={(e) => updateWebsiteContent("chatbot", { ...(config.websiteContent?.chatbot || {}), welcome: e.target.value })} placeholder="Welcome message" style={{ padding: 8, border: `1px solid ${theme.line}`, borderRadius: 8 }} /></div>
            </details>

            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 14, background: theme.creamDark, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `1px solid ${theme.line}`,
              }}>
                {logoBusy && !config.logoDataUrl ? (
                  <Spinner size={16} color={theme.inkSoft} />
                ) : config.logoDataUrl ? (
                  <img src={config.logoDataUrl} alt="Business logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Sparkles size={20} color={theme.inkSoft} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>Logo</span>
                <TalkAnalyseExecuteBar
                  placeholder="e.g. a simple leaf icon, rounder shapes, a different color"
                  busy={logoBusy}
                  error={logoError}
                  onSubmit={runLogo}
                  speechLang={speechLang}
                  busyLabel="Designing…"
                  idleLabel={config.logoDataUrl ? "Update logo" : "Generate logo"}
                />
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
                <a href={storefrontUrl(config.slug)} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: theme.wine, textDecoration: "none" }}>
                  {storefrontUrl(config.slug).replace(/^https?:\/\//, "")}
                </a>
                <button onClick={() => navigator.clipboard?.writeText(storefrontUrl(config.slug))} aria-label="Copy link" style={{ background: "none", border: "none", cursor: "pointer", color: theme.wine, padding: 2, marginLeft: "auto" }}>
                  <Copy size={13} />
                </button>
              </div>
            )}

            <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 10 }}>Connect your socials</p>
            <p style={{ fontSize: 11.5, color: theme.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
              Choose a channel already connected in your Postiz account. Yuukke sends only approved, scheduled posts to Postiz in the background.
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
                        {connectingPlatform === id ? <Spinner size={12} /> : <ExternalLink size={12} />} Use Postiz channel
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={refreshConnections} disabled={refreshing} style={{
              display: "flex", alignItems: "center", gap: 7, background: "none", border: `1.5px solid ${theme.line}`, color: theme.ink,
              borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>
              {refreshing ? <Spinner size={12} color={theme.ink} /> : null} Refresh status
            </button>
          </div>

          <div id="social-tools" style={{ scrollMarginTop: 20 }}>
          {config.businessName && (
            <PostGeneratorChat
              config={config}
              products={products}
              speechLang={speechLang}
              onPostsGenerated={(created) => setPendingPosts((p) => [...p, ...created])}
            />
          )}

          {config.published && (
            <button onClick={() => goTo("calendar")} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center",
              background: "none", border: `1.5px solid ${theme.line}`, color: theme.ink, borderRadius: 12, padding: "11px 16px",
              fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 20,
            }}>
              <Calendar size={14} /> View social calendar
            </button>
          )}
          </div>

          <button onClick={save} style={{ background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "13px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Save storefront & continue
          </button>
        </div>

        <div id="live-preview" style={{ flex: "1 1 320px", minWidth: 300, scrollMarginTop: 20 }}>
          <div style={{ position: "sticky", top: 18, zIndex: 2, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 12.5, fontWeight: 800, color: theme.ink, margin: 0, display: "flex", alignItems: "center", gap: 7 }}><Eye size={15} color={theme.wine} /> Live storefront</p>
              <span style={{ fontSize: 10.5, color: "#2c6e49", background: "#e6f2ea", padding: "5px 9px", borderRadius: 999, fontWeight: 800 }}>Updates live</span>
            </div>
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 18px 46px rgba(44,24,31,.12)", border: `1px solid ${theme.line}`, background: theme.white }}>
              <StorePreview storeConfig={config} products={products} />
            </div>
          </div>
          <GeneratedPostsPanel
            posts={pendingPosts}
            existingPosts={existingPosts}
            goTo={goTo}
            onDeleted={(id) => setPendingPosts((p) => p.filter((x) => x.id !== id))}
            onSubmitted={(updated) => {
              setPendingPosts((p) => p.filter((x) => !updated.some((u) => u.id === x.id)));
              setExistingPosts((p) => [...p, ...updated]);
            }}
          />
        </div>
      </div>
    </DashboardShell>
  );
}

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Camera, Briefcase, Sparkles, ArrowRight } from "lucide-react";
import { theme } from "../theme";
import { Logo, Spinner } from "../components/Shared";
import { fetchPublicSite } from "../lib/site";
import StorefrontChatbot from "../components/StorefrontChatbot";

const PLATFORM_ICONS = { instagram: Camera, linkedin: Briefcase };

export default function GeneratedSitePage({ slugOverride = "" }) {
  const { slug: routeSlug } = useParams();
  const slug = slugOverride || routeSlug;
  const [site, setSite] = useState(null);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | missing

  useEffect(() => {
    let cancelled = false;
    fetchPublicSite(slug)
      .then((record) => {
        if (cancelled) return;
        setSite(record);
        setProducts(record.products || []);
        setStatus("ready");
      })
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
  const content = site.websiteContent || {};
  const sections = site.sections || [];

  return (
    <div style={{ background: theme.cream, minHeight: "100vh", fontFamily: theme.fontBody }}>
      {content.announcement && <div style={{ padding: "8px 18px", textAlign: "center", background: site.accentColor || theme.wine, color: "#fff", fontSize: 11.5, fontWeight: 700 }}>{content.announcement}</div>}
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
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 38, margin: "0 0 12px" }}>{content.heroHeadline || site.tagline}</h1>
        <p style={{ maxWidth: 620, margin: "0 auto 20px", lineHeight: 1.6, opacity: .9 }}>{content.heroSubheadline || site.about}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}><a href="#products" style={{ padding: "10px 18px", borderRadius: 999, background: "#fff", color: site.accentColor || theme.wine, textDecoration: "none", fontSize: 12, fontWeight: 800 }}>{content.primaryCTA || "Shop now"}</a>{content.secondaryCTA && <a href="#story" style={{ padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,.65)", color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 800 }}>{content.secondaryCTA}</a>}</div>
      </div>

      {site.about && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 10px", textAlign: "center" }}>
          <p style={{ fontSize: 15, color: theme.inkSoft, lineHeight: 1.7 }}>{site.about}</p>
        </div>
      )}

      <div id="products" style={{ maxWidth: 980, margin: "0 auto", padding: "30px 24px 60px" }}>
        <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 20, color: theme.ink, textAlign: "center", margin: "10px 0 24px" }}>
          {content.featuredTitle || `Shop ${site.businessName}`}
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

      {(sections.includes("Our story") || content.story || content.mission) && <section id="story" style={{ maxWidth: 820, margin: "0 auto", padding: "10px 24px 45px", textAlign: "center" }}><h2 style={{ fontFamily: theme.fontDisplay, color: theme.ink }}>Our story</h2>{content.mission && <p style={{ color: site.accentColor || theme.wine, fontWeight: 800 }}>{content.mission}</p>}<p style={{ color: theme.inkSoft, lineHeight: 1.75 }}>{content.story || site.about}</p></section>}

      {content.trustPoints?.length > 0 && <section style={{ maxWidth: 980, margin: "0 auto 45px", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>{content.trustPoints.map((point) => <div key={point} style={{ padding: 18, background: theme.white, borderRadius: 14, border: `1px solid ${theme.line}`, textAlign: "center", color: theme.ink, fontSize: 12.5, fontWeight: 700 }}><Sparkles size={15} color={site.accentColor || theme.wine} style={{ marginBottom: 7 }} /><br />{point}</div>)}</section>}

      {sections.includes("FAQ") && content.faqs?.length > 0 && <section style={{ maxWidth: 760, margin: "0 auto", padding: "5px 24px 50px" }}><h2 style={{ fontFamily: theme.fontDisplay, color: theme.ink, textAlign: "center" }}>Frequently asked questions</h2>{content.faqs.map((faq) => <details key={faq.question} style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 12, padding: "13px 15px", marginTop: 9 }}><summary style={{ fontWeight: 800, color: theme.ink, cursor: "pointer", fontSize: 13 }}>{faq.question}</summary><p style={{ color: theme.inkSoft, fontSize: 12.5, lineHeight: 1.6 }}>{faq.answer}</p></details>)}</section>}

      {sections.includes("Contact") && (content.contact?.email || content.contact?.phone || content.contact?.whatsapp) && <section style={{ textAlign: "center", padding: "35px 24px", background: theme.wineTint }}><h2 style={{ fontFamily: theme.fontDisplay, color: theme.ink }}>Contact the business</h2><p style={{ color: theme.inkSoft, fontSize: 13 }}>{[content.contact.email, content.contact.phone, content.contact.whatsapp && `WhatsApp: ${content.contact.whatsapp}`].filter(Boolean).join(" · ")}</p></section>}

      {sections.includes("Newsletter signup") && <section style={{ textAlign: "center", padding: "40px 24px", background: site.accentColor || theme.wine, color: "#fff" }}><h2 style={{ margin: "0 0 7px", fontFamily: theme.fontDisplay }}>{content.newsletterHeading || "Stay in the loop"}</h2><p style={{ opacity: .85, fontSize: 12.5 }}>{content.newsletterText || "Hear about new products and business updates."}</p><div style={{ display: "flex", justifyContent: "center", gap: 7 }}><input aria-label="Email for updates" placeholder="Your email address" style={{ padding: "10px 12px", borderRadius: 9, border: 0, width: 240 }} /><button style={{ border: 0, borderRadius: 9, padding: "10px 14px", fontWeight: 800, color: site.accentColor || theme.wine }}>Subscribe</button></div></section>}

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
      {sections.includes("Customer chatbot") && <StorefrontChatbot site={site} products={products} />}
    </div>
  );
}

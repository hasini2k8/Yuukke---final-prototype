import React, { useState } from "react";
import { ArrowRight, ChevronDown, LogIn, Gift, ShoppingBag, Users, Layers, GraduationCap, Wallet, Sparkles } from "lucide-react";
import { theme, ACCENTS } from "../theme";
import { Logo, Pill } from "../components/Shared";
import { usePageTranslation } from "../components/I18nContext";

const navLink = { fontSize: 13.5, fontWeight: 600, color: theme.ink, cursor: "pointer", fontFamily: theme.fontBody, textDecoration: "none" };

function ctaStyle(bg) {
  return {
    display: "inline-flex", alignItems: "center", gap: 8, background: bg, color: "#fff", border: "none",
    borderRadius: 12, padding: "14px 26px", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: theme.fontBody,
  };
}

const NEEDS = [
  { icon: Gift, title: "Personal Gifts", desc: "Birthdays, weddings, festive gifts" },
  { icon: Layers, title: "Corporate Gifts", desc: "Employee kits, hampers, CSR" },
  { icon: ShoppingBag, title: "Products", desc: "Handcrafted, women-led brands" },
  { icon: Users, title: "Services", desc: "Experts, consultants, coaches" },
  { icon: GraduationCap, title: "Workshops", desc: "Sessions, classes, experiences" },
];

const PILLARS = [
  { n: "01", title: "Digital Identity", desc: "A lasting online presence for every seller — profile, catalog, and a payment-ready storefront." },
  { n: "02", title: "Continuous Training", desc: "In-language skilling on craft quality, digital literacy, and running a business, seller-to-seller." },
  { n: "03", title: "Commerce Tools", desc: "List, price, get paid, and fulfil — the AI-assisted tools we've been building in this app." },
  { n: "04", title: "Market Linkage", desc: "A marketplace, corporate gifting channel, and community events that keep orders coming." },
  { n: "05", title: "Financial Inclusion", desc: "A real transaction history that can unlock credit and scheme eligibility down the line." },
];

const CATEGORIES = [
  { title: "Home Décor", sub: "Brass · Wood · Marble", color: ACCENTS[0] },
  { title: "Beauty", sub: "Skincare · Makeup · Wellness", color: ACCENTS[1] },
  { title: "Fashion", sub: "Women's Wear · Accessories", color: ACCENTS[4] },
  { title: "Food & Baking", sub: "Healthy & Traditional", color: ACCENTS[5] },
];

const STATS = [
  { value: "700+", label: "Women artisans trained" },
  { value: "200+", label: "Entrepreneurs onboarded" },
  { value: "3", label: "Districts reached, and growing" },
];

const STRINGS = [
  "Shop", "Services", "About Us", "Business Exchange", "Become a Mentor", "Log in",
  "Explore Marketplace", "BUY BETTER · LIVE BETTER · BUILD BETTER",
  "Building a future where women rise without limits.",
  "Shop products, discover services, and choose meaningful gifts from women entrepreneurs. Every order supports income, market access, and independent futures.",
  "Shop now!", "Register your business now!",
  "HOW WE BRIDGE IT", "Five pillars, from identity to income.",
  "TWO ROLES, ONE MOVEMENT", "There's a way in for everyone.", "I am a builder", "I back builders",
  "Turn talent into independence",
  "A maker, creator, or entrepreneur building a business on her own terms, backed by a community that roots for her.",
  "Become a seller", "Discover & support them",
  "Be among the first to discover remarkable products — and stand behind the women who made them. Every purchase builds a business.",
  "FEATURED CATEGORIES", "Explore products from women builders.", "Explore the Yuukke Marketplace",
  "Every purchase builds a future.",
  "When you buy here, you're not just buying a product — you're powering a mission that turns skill into self-reliance.",
  "Start shopping",
  ...NEEDS.flatMap((n) => [n.title, n.desc]),
  ...PILLARS.flatMap((p) => [p.title, p.desc]),
  ...CATEGORIES.flatMap((c) => [c.title, c.sub]),
  ...STATS.map((s) => s.label),
];

export default function HomePage({ goTo, openLogin }) {
  const t = usePageTranslation(STRINGS);
  const [role, setRole] = useState("backer"); // builder | backer

  return (
    <div style={{ background: theme.cream, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white, flexWrap: "wrap", gap: 14, position: "sticky", top: 0, zIndex: 20 }}>
        <Logo size={28} />
        <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
          <a href="/marketplace" style={navLink}>{t("Shop")}</a>
          <span style={navLink}>{t("Services")}</span>
          <a href="/about-us" style={navLink}>{t("About Us")}</a>
          <a href="/business-exchange" style={navLink}>{t("Business Exchange")}</a>
          <a href="/become-mentor" style={navLink}>{t("Become a Mentor")}</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span onClick={openLogin} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: theme.ink, cursor: "pointer" }}>
            <LogIn size={15} /> {t("Log in")}
          </span>
          <Pill onClick={() => goTo("marketplace")} style={{ background: theme.ink }}>{t("Explore Marketplace")} <ArrowRight size={14} /></Pill>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "70px 24px 60px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 2, marginBottom: 18 }}>{t("BUY BETTER · LIVE BETTER · BUILD BETTER")}</p>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 44, color: theme.ink, margin: "0 0 18px", lineHeight: 1.2, maxWidth: 760, marginLeft: "auto", marginRight: "auto" }}>
          {t("Building a future where women rise without limits.")}
        </h1>
        <p style={{ fontSize: 16, color: theme.inkSoft, maxWidth: 560, margin: "0 auto 36px", fontFamily: theme.fontBody, lineHeight: 1.6 }}>
          {t("Shop products, discover services, and choose meaningful gifts from women entrepreneurs. Every order supports income, market access, and independent futures.")}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => goTo("marketplace")} style={ctaStyle(theme.wine)}>{t("Shop now!")}</button>
          <button onClick={() => goTo("register")} style={ctaStyle(theme.ink)}>{t("Register your business now!")}</button>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 70px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {NEEDS.map((n) => {
            const Icon = n.icon;
            return (
              <div key={n.title} onClick={() => goTo("marketplace")} style={{
                background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 22, cursor: "pointer",
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: theme.wineTint, color: theme.wine, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={18} />
                </div>
                <p style={{ fontFamily: theme.fontDisplay, fontSize: 15.5, color: theme.ink, margin: "0 0 4px" }}>{t(n.title)}</p>
                <p style={{ fontSize: 12, color: theme.inkSoft, margin: 0 }}>{t(n.desc)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: theme.white, borderTop: `1px solid ${theme.line}`, borderBottom: `1px solid ${theme.line}`, padding: "70px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, textAlign: "center", marginBottom: 10 }}>{t("HOW WE BRIDGE IT")}</p>
          <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 30, color: theme.ink, textAlign: "center", margin: "0 0 46px" }}>{t("Five pillars, from identity to income.")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 26 }}>
            {PILLARS.map((p) => (
              <div key={p.n}>
                <p style={{ fontFamily: theme.fontDisplay, fontSize: 26, color: theme.wineTint, WebkitTextStroke: `1px ${theme.wine}`, margin: "0 0 10px" }}>{p.n}</p>
                <p style={{ fontSize: 14.5, fontWeight: 700, color: theme.ink, margin: "0 0 8px" }}>{t(p.title)}</p>
                <p style={{ fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.6, margin: 0 }}>{t(p.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "70px 24px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, textAlign: "center", marginBottom: 10 }}>{t("TWO ROLES, ONE MOVEMENT")}</p>
        <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 30, color: theme.ink, textAlign: "center", margin: "0 0 30px" }}>{t("There's a way in for everyone.")}</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 30 }}>
          <button onClick={() => setRole("builder")} style={roleTab(role === "builder")}>{t("I am a builder")}</button>
          <button onClick={() => setRole("backer")} style={roleTab(role === "backer")}>{t("I back builders")}</button>
        </div>
        <div style={{ background: role === "builder" ? theme.wineTint : theme.creamDark, borderRadius: 20, padding: 40, textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
          <Sparkles size={22} color={theme.wine} style={{ marginBottom: 14 }} />
          {role === "builder" ? (
            <>
              <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 22, color: theme.ink, margin: "0 0 10px" }}>{t("Turn talent into independence")}</h3>
              <p style={{ fontSize: 14, color: theme.inkSoft, lineHeight: 1.6, marginBottom: 20 }}>
                {t("A maker, creator, or entrepreneur building a business on her own terms, backed by a community that roots for her.")}
              </p>
              <button onClick={() => goTo("register")} style={ctaStyle(theme.wine)}>{t("Become a seller")} <ArrowRight size={14} /></button>
            </>
          ) : (
            <>
              <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 22, color: theme.ink, margin: "0 0 10px" }}>{t("Discover & support them")}</h3>
              <p style={{ fontSize: 14, color: theme.inkSoft, lineHeight: 1.6, marginBottom: 20 }}>
                {t("Be among the first to discover remarkable products — and stand behind the women who made them. Every purchase builds a business.")}
              </p>
              <button onClick={() => goTo("marketplace")} style={ctaStyle(theme.wine)}>{t("Explore Marketplace")} <ArrowRight size={14} /></button>
            </>
          )}
        </div>
      </div>

      <div style={{ background: theme.ink, padding: "60px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 24, textAlign: "center" }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <p style={{ fontFamily: theme.fontDisplay, fontSize: 36, color: "#fff", margin: "0 0 6px" }}>{s.value}</p>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", margin: 0 }}>{t(s.label)}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "70px 24px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, textAlign: "center", marginBottom: 10 }}>{t("FEATURED CATEGORIES")}</p>
        <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 30, color: theme.ink, textAlign: "center", margin: "0 0 36px" }}>{t("Explore products from women builders.")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18 }}>
          {CATEGORIES.map((c) => (
            <div key={c.title} onClick={() => goTo("marketplace")} style={{
              borderRadius: 18, padding: "32px 22px", cursor: "pointer", color: "#fff",
              background: `linear-gradient(160deg, ${c.color}, ${c.color}cc)`,
            }}>
              <p style={{ fontFamily: theme.fontDisplay, fontSize: 19, margin: "0 0 6px" }}>{t(c.title)}</p>
              <p style={{ fontSize: 12, opacity: 0.85, margin: 0 }}>{t(c.sub)}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <button onClick={() => goTo("marketplace")} style={{ ...ctaStyle(theme.wine) }}>{t("Explore the Yuukke Marketplace")} <ArrowRight size={14} /></button>
        </div>
      </div>

      <div style={{ background: theme.wineTint, padding: "60px 24px", textAlign: "center" }}>
        <Wallet size={26} color={theme.wine} style={{ marginBottom: 14 }} />
        <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 26, color: theme.ink, margin: "0 0 10px" }}>{t("Every purchase builds a future.")}</h2>
        <p style={{ fontSize: 14, color: "#5a3f47", maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.6 }}>
          {t("When you buy here, you're not just buying a product — you're powering a mission that turns skill into self-reliance.")}
        </p>
        <button onClick={() => goTo("marketplace")} style={ctaStyle(theme.wine)}>{t("Start shopping")} <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

function roleTab(active) {
  return {
    padding: "9px 20px", borderRadius: 999, border: `1.5px solid ${active ? theme.wine : theme.line}`,
    background: active ? theme.wine : "#fff", color: active ? "#fff" : theme.ink, fontSize: 13, fontWeight: 700, cursor: "pointer",
  };
}

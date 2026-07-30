import React from "react";
import { ArrowRight, ChevronDown, LogIn } from "lucide-react";
import { theme } from "../theme";
import { Logo, Pill } from "../components/Shared";

const navLink = { fontSize: 13.5, fontWeight: 600, color: theme.ink, cursor: "pointer", fontFamily: theme.fontBody };

function ctaStyle(bg) {
  return {
    display: "inline-flex", alignItems: "center", gap: 8, background: bg, color: "#fff", border: "none",
    borderRadius: 12, padding: "14px 26px", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: theme.fontBody,
  };
}

export default function HomePage({ goTo, openLogin, t }) {
  return (
    <div style={{ background: theme.cream, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white, flexWrap: "wrap", gap: 14 }}>
        <Logo size={28} />
        <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
          <span style={navLink}>Shop</span>
          <span style={navLink}>Services</span>
          <span style={navLink}>About Us</span>
          <span style={{ ...navLink, display: "flex", alignItems: "center", gap: 4 }}>EXPLORE <ChevronDown size={13} /></span>
          <span style={navLink}>Gifting</span>
          <span style={navLink}>Personal</span>
          <span style={navLink}>Corporate</span>
          <span style={navLink}>Become a Mentor</span>
          <span style={navLink}>Business Exchange</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span onClick={openLogin} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: theme.ink, cursor: "pointer" }}>
            <LogIn size={15} /> Log in
          </span>
          <Pill onClick={() => goTo("marketplace")} style={{ background: theme.ink }}>{t("navMarketplace")} <ArrowRight size={14} /></Pill>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "80px 24px 100px", textAlign: "center", position: "relative" }}>
        <div style={{ marginBottom: 22 }}><Logo size={40} /></div>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 44, color: theme.ink, margin: "0 0 18px", lineHeight: 1.2, maxWidth: 760, marginLeft: "auto", marginRight: "auto" }}>
          Building a future where women rise without limits.
        </h1>
        <p style={{ fontSize: 16, color: theme.inkSoft, maxWidth: 560, margin: "0 auto 36px", fontFamily: theme.fontBody, lineHeight: 1.6 }}>
          A marketplace by women, for a better world — handcrafted goods, mentorship and enterprise, together.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => goTo("marketplace")} style={ctaStyle(theme.wine)}>{t("heroShopNow")}</button>
          <button onClick={() => goTo("register")} style={ctaStyle(theme.ink)}>Register your business now!</button>
        </div>
      </div>
    </div>
  );
}

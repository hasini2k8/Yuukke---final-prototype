import React, { useState } from "react";
import { ArrowRight, Handshake, TrendingUp, Globe2 } from "lucide-react";
import { theme } from "../theme";
import { Logo } from "../components/Shared";
import LoginModal from "../components/LoginModal";
import { useAuth } from "../components/AuthContext";

const BENEFITS = [
  { icon: Handshake, title: "Corporate partnerships", desc: "Bulk hampers, employee kits, and CSR-linked procurement direct from independently-led brands." },
  { icon: TrendingUp, title: "Growth support", desc: "Market linkage through expos, corporate vending, and digital orders — steady, repeatable income." },
  { icon: Globe2, title: "Wider reach", desc: "Get discovered by backers, mentors, and buyers well beyond your local market." },
];

export default function BusinessExchangePage() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div style={{ background: theme.cream, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white }}>
        <a href="/"><Logo size={26} /></a>
        <a href="/marketplace" style={{ fontSize: 13.5, fontWeight: 600, color: theme.wine, textDecoration: "none" }}>Explore Marketplace</a>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px 80px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, marginBottom: 10 }}>BUSINESS EXCHANGE</p>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 32, color: theme.ink, margin: "0 0 16px" }}>
          Connect your business with builders who deliver.
        </h1>
        <p style={{ fontSize: 14.5, color: theme.inkSoft, lineHeight: 1.7, marginBottom: 40, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          Whether you're sourcing corporate gifts, looking for vendors, or want to bring independently-led products into your own supply chain — the Business Exchange is where organizations and builders meet.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 40, textAlign: "left" }}>
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 22 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.wineTint, color: theme.wine, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Icon size={17} />
                </div>
                <p style={{ fontFamily: theme.fontDisplay, fontSize: 15, color: theme.ink, margin: "0 0 6px" }}>{b.title}</p>
                <p style={{ fontSize: 12.5, color: theme.inkSoft, margin: 0, lineHeight: 1.6 }}>{b.desc}</p>
              </div>
            );
          })}
        </div>

        {user ? (
          <p style={{ fontSize: 14, color: theme.ink, fontWeight: 600 }}>Thanks, {user.businessName || user.email} — our partnerships team will reach out.</p>
        ) : (
          <button onClick={() => setShowLogin(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none",
            borderRadius: 12, padding: "13px 26px", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>
            Register your interest <ArrowRight size={14} />
          </button>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

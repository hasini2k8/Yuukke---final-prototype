import React, { useState } from "react";
import { ArrowRight, GraduationCap, Users, Sparkles } from "lucide-react";
import { theme } from "../theme";
import { Logo } from "../components/Shared";
import LoginModal from "../components/LoginModal";
import { useAuth } from "../components/AuthContext";

const WAYS = [
  { icon: GraduationCap, title: "Teach", desc: "Share the skills builders need — pricing, photography, packaging, digital basics." },
  { icon: Users, title: "Guide", desc: "1:1 or group mentorship for founders at every stage of their journey." },
  { icon: Sparkles, title: "Champion", desc: "Open doors — introductions, referrals, and visibility for the builders you back." },
];

export default function BecomeMentorPage() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div style={{ background: theme.cream, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white }}>
        <a href="/"><Logo size={26} /></a>
        <a href="/marketplace" style={{ fontSize: 13.5, fontWeight: 600, color: theme.wine, textDecoration: "none" }}>Explore Marketplace</a>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px 80px", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, marginBottom: 10 }}>BECOME A MENTOR</p>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 32, color: theme.ink, margin: "0 0 16px" }}>
          Be part of a small army rooting for builders.
        </h1>
        <p style={{ fontSize: 14.5, color: theme.inkSoft, lineHeight: 1.7, marginBottom: 40, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          When a woman entrepreneur realizes there's a community of experts backing her, she becomes unstoppable. Mentors bring the skills, connections, and encouragement that no course can replace.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 40, textAlign: "left" }}>
          {WAYS.map((w) => {
            const Icon = w.icon;
            return (
              <div key={w.title} style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 22 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.wineTint, color: theme.wine, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Icon size={17} />
                </div>
                <p style={{ fontFamily: theme.fontDisplay, fontSize: 15, color: theme.ink, margin: "0 0 6px" }}>{w.title}</p>
                <p style={{ fontSize: 12.5, color: theme.inkSoft, margin: 0, lineHeight: 1.6 }}>{w.desc}</p>
              </div>
            );
          })}
        </div>

        {user ? (
          <p style={{ fontSize: 14, color: theme.ink, fontWeight: 600 }}>Thanks for your interest, {user.businessName || user.email}! Our team will be in touch.</p>
        ) : (
          <button onClick={() => setShowLogin(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none",
            borderRadius: 12, padding: "13px 26px", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>
            Apply to become a mentor <ArrowRight size={14} />
          </button>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

import React from "react";
import { ArrowRight } from "lucide-react";
import { theme } from "../theme";
import { Logo } from "../components/Shared";

const PILLARS = [
  { n: "01", title: "Digital Identity", desc: "A lasting online presence for every seller — profile, catalog, and a payment-ready storefront." },
  { n: "02", title: "Continuous Training", desc: "In-language skilling on craft quality, digital literacy, and running a business, seller-to-seller." },
  { n: "03", title: "Commerce Tools", desc: "List, price, get paid, and fulfil — simple tools to run a real digital business." },
  { n: "04", title: "Market Linkage", desc: "A marketplace, corporate gifting channel, and community events that keep orders coming." },
  { n: "05", title: "Financial Inclusion", desc: "A real transaction history that can unlock credit and scheme eligibility down the line." },
];

export default function AboutPage() {
  return (
    <div style={{ background: theme.cream, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white }}>
        <a href="/"><Logo size={26} /></a>
        <a href="/marketplace" style={{ fontSize: 13.5, fontWeight: 600, color: theme.wine, textDecoration: "none" }}>Explore Marketplace</a>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 80px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, marginBottom: 10 }}>ABOUT YUUKKE</p>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 36, color: theme.ink, margin: "0 0 20px", lineHeight: 1.25 }}>
          Talent is everywhere. Opportunity isn't.
        </h1>
        <p style={{ fontSize: 15, color: theme.inkSoft, lineHeight: 1.7, marginBottom: 40 }}>
          Yuukke exists because skill without market access stays invisible. We're a marketplace and enablement platform for independent entrepreneurs — bridging the gap between real talent and the visibility, tools, and income it deserves.
        </p>

        <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 22, color: theme.ink, margin: "0 0 28px" }}>Five pillars of enablement</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 50 }}>
          {PILLARS.map((p) => (
            <div key={p.n} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
              <span style={{ fontFamily: theme.fontDisplay, fontSize: 20, color: theme.wine, minWidth: 36 }}>{p.n}</span>
              <div>
                <p style={{ fontSize: 14.5, fontWeight: 700, color: theme.ink, margin: "0 0 4px" }}>{p.title}</p>
                <p style={{ fontSize: 13, color: theme.inkSoft, margin: 0, lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: theme.wineTint, borderRadius: 18, padding: 30, textAlign: "center" }}>
          <p style={{ fontFamily: theme.fontDisplay, fontSize: 19, color: theme.ink, margin: "0 0 8px" }}>Join the movement</p>
          <p style={{ fontSize: 13.5, color: "#5a3f47", marginBottom: 20 }}>Buy, mentor, learn, or sell — there's a way in for everyone.</p>
          <a href="/marketplace" style={{
            display: "inline-flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff",
            borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 13.5, textDecoration: "none",
          }}>
            Explore Marketplace <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { LayoutDashboard, Package, Palette, Calendar, Sparkles } from "lucide-react";
import { theme } from "../theme";
import { Logo } from "./Shared";
import AskYuukke from "./AskYuukke";

const TABS = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "listProducts", label: "Products", icon: Package },
  { id: "customizeStore", label: "Storefront", icon: Palette },
  { id: "calendar", label: "Social calendar", icon: Calendar },
  { id: "brand", label: "Brand", icon: Sparkles },
];

export default function DashboardShell({ goTo, active, businessName, children, speechLang }) {
  return (
    <div style={{ background: theme.cream, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white, flexWrap: "wrap", gap: 14 }}>
        <div onClick={() => goTo("home")} style={{ cursor: "pointer" }}><Logo size={26} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: theme.creamDark, borderRadius: 999, padding: 5 }}>
          {TABS.map((tb) => {
            const Icon = tb.icon;
            const isActive = active === tb.id;
            return (
              <button key={tb.id} onClick={() => goTo(tb.id)} style={{
                display: "flex", alignItems: "center", gap: 7, border: "none", cursor: "pointer",
                padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: theme.fontBody,
                background: isActive ? theme.wine : "transparent", color: isActive ? "#fff" : theme.inkSoft,
                transition: "all .18s ease",
              }}>
                <Icon size={15} /> {tb.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: theme.wineTint, color: theme.wine, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
            {businessName ? businessName.trim()[0]?.toUpperCase() : "Y"}
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink }}>{businessName || "Your store"}</span>
        </div>
      </div>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px 90px" }}>{children}</div>
      <AskYuukke pageId={active} businessName={businessName} speechLang={speechLang || "en-IN"} />
    </div>
  );
}

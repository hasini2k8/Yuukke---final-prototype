import React from "react";
import { Check, Package, Palette, Store, ArrowRight } from "lucide-react";
import { theme } from "../theme";
import DashboardShell from "../components/DashboardShell";
import StorePreview from "../components/StorePreview";

function TaskCard({ icon: Icon, title, description, done, cta, onClick }) {
  return (
    <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: theme.wineTint, color: theme.wine, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={19} />
        </div>
        {done && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: "#2c6e49", background: "#e6f2ea", padding: "4px 10px", borderRadius: 999 }}>
            <Check size={12} /> Set up
          </span>
        )}
      </div>
      <div>
        <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 17, color: theme.ink, margin: "0 0 6px" }}>{title}</h3>
        <p style={{ fontSize: 13, color: theme.inkSoft, margin: 0, fontFamily: theme.fontBody, lineHeight: 1.5 }}>{description}</p>
      </div>
      <button onClick={onClick} style={{
        marginTop: "auto", alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 7,
        background: "none", border: "none", color: theme.wine, fontWeight: 700, fontSize: 13.5, cursor: "pointer", padding: 0,
      }}>
        {cta} <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function DashboardPage({ goTo, businessName, products, storeConfig, t, speechLang }) {
  const productsDone = products.length > 0;
  const storeDone = !!storeConfig;
  const stepsDone = (productsDone ? 1 : 0) + (storeDone ? 1 : 0);

  return (
    <DashboardShell goTo={goTo} active="dashboard" businessName={businessName} t={t} speechLang={speechLang}>
      <div style={{ background: theme.wine, borderRadius: 20, padding: "32px 34px", color: "#fff", marginBottom: 30, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 1.5, opacity: 0.8, margin: "0 0 8px" }}>{t("dashSubmitted").toUpperCase()}</p>
          <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, margin: "0 0 8px" }}>{t("dashWelcome")}, {businessName || "seller"}</h1>
          <p style={{ fontSize: 14, opacity: 0.9, margin: 0, maxWidth: 460, fontFamily: theme.fontBody }}>{t("dashSubtitle")}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: theme.fontDisplay, fontSize: 34, fontWeight: 800 }}>{stepsDone}/2</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>setup steps done</div>
        </div>
      </div>

      <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 19, color: theme.ink, margin: "0 0 16px" }}>{t("dashBuild")}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 34 }}>
        <TaskCard
          icon={Package}
          title={t("taskListTitle")}
          description={productsDone ? `${products.length} product${products.length > 1 ? "s" : ""} listed with Yuukke's AI assistant.` : "Chat with the AI assistant about what you sell — by typing or by voice."}
          done={productsDone}
          cta={productsDone ? "Manage listings" : "Start listing"}
          onClick={() => goTo("listProducts")}
        />
        <TaskCard
          icon={Palette}
          title={t("taskStoreTitle")}
          description={storeDone ? `Your storefront theme "${storeConfig.tagline}" is live.` : "Tell the AI what feel you're going for and it will design a starting theme for you."}
          done={storeDone}
          cta={storeDone ? "Edit storefront" : "Start customizing"}
          onClick={() => goTo("customizeStore")}
        />
      </div>

      {productsDone && storeDone && (
        <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Store size={18} color={theme.wine} />
            <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 17, color: theme.ink, margin: 0 }}>Your storefront is ready</h3>
          </div>
          <p style={{ fontSize: 13.5, color: theme.inkSoft, marginBottom: 16, fontFamily: theme.fontBody }}>
            Everything below reflects the products and theme you've set up so far.
          </p>
          <StorePreview storeConfig={storeConfig} products={products} compact />
        </div>
      )}
    </DashboardShell>
  );
}

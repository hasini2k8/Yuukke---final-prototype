import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleFonts } from "./components/Shared";
import LanguageSplash from "./components/LanguageSplash";
import AccessibilityBar from "./components/AccessibilityBar";
import LoginModal from "./components/LoginModal";
import HomePage from "./pages/Home";
import BusinessRegistrationPage from "./pages/BusinessRegistration";
import DashboardPage from "./pages/Dashboard";
import ListProductsPage from "./pages/ListProducts";
import CustomizeStorePage from "./pages/CustomizeStore";
import { theme } from "./theme";
import { EN_STRINGS } from "./lib/strings";
import { askClaudeJSON, buildTranslatePrompt } from "./lib/ai";

export default function App() {
  const navigate = useNavigate();
  const [page, setPage] = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [products, setProducts] = useState([]);
  const [storeConfig, setStoreConfig] = useState(null);

  const [showSplash, setShowSplash] = useState(true);
  const [language, setLanguage] = useState(null);
  const [strings, setStrings] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  function t(key) {
    return (strings && strings[key]) || EN_STRINGS[key] || key;
  }

  function goTo(target) {
    if (target === "marketplace") { navigate("/marketplace"); return; }
    setPage(target);
  }

  async function handleSelectLanguage(lang) {
    setLanguage(lang);
    if (lang.code === "en") {
      setShowSplash(false);
      return;
    }
    setTranslating(true);
    try {
      const translated = await askClaudeJSON(buildTranslatePrompt(lang.name), JSON.stringify(EN_STRINGS));
      setStrings(translated);
    } catch (e) {
      // silently fall back to English strings if translation fails
    } finally {
      setTranslating(false);
      setShowSplash(false);
    }
  }

  return (
    <div style={{ fontFamily: theme.fontBody, minHeight: "100vh", position: "relative", zoom: fontScale, filter: highContrast ? "contrast(1.35) saturate(1.1)" : "none" }}>
      <GoogleFonts />
      {showSplash && (
        <LanguageSplash onSelect={handleSelectLanguage} translating={translating} translatingName={language?.name} />
      )}
      {!showSplash && (
        <>
          {page === "home" && <HomePage goTo={goTo} openLogin={() => setShowLogin(true)} t={t} />}
          {page === "register" && (
            <BusinessRegistrationPage goTo={goTo} businessName={businessName} setBusinessName={setBusinessName} speechLang={language?.speech || "en-IN"} />
          )}
          {page === "dashboard" && (
            <DashboardPage goTo={goTo} businessName={businessName} products={products} storeConfig={storeConfig} t={t} speechLang={language?.speech || "en-IN"} />
          )}
          {page === "listProducts" && (
            <ListProductsPage goTo={goTo} products={products} setProducts={setProducts} speechLang={language?.speech || "en-IN"} />
          )}
          {page === "customizeStore" && (
            <CustomizeStorePage goTo={goTo} storeConfig={storeConfig} setStoreConfig={setStoreConfig} products={products} speechLang={language?.speech || "en-IN"} />
          )}
          {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
          <AccessibilityBar fontScale={fontScale} setFontScale={setFontScale} highContrast={highContrast} setHighContrast={setHighContrast} />
        </>
      )}
    </div>
  );
}

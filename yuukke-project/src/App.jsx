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
import { useI18n } from "./components/I18nContext";

export default function App() {
  const navigate = useNavigate();
  const { language, setLanguage } = useI18n();
  const [page, setPage] = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [products, setProducts] = useState([]);
  const [storeConfig, setStoreConfig] = useState(null);

  const [showSplash, setShowSplash] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  function goTo(target) {
    if (target === "marketplace") { navigate("/marketplace"); return; }
    setPage(target);
  }

  function handleSelectLanguage(lang) {
    setLanguage(lang);
    setShowSplash(false);
  }

  return (
    <div style={{ fontFamily: theme.fontBody, minHeight: "100vh", position: "relative", zoom: fontScale, filter: highContrast ? "contrast(1.35) saturate(1.1)" : "none" }}>
      <GoogleFonts />
      {showSplash && <LanguageSplash onSelect={handleSelectLanguage} />}
      {!showSplash && (
        <>
          {page === "home" && <HomePage goTo={goTo} openLogin={() => setShowLogin(true)} />}
          {page === "register" && (
            <BusinessRegistrationPage goTo={goTo} businessName={businessName} setBusinessName={setBusinessName} speechLang={language.speech} />
          )}
          {page === "dashboard" && (
            <DashboardPage goTo={goTo} businessName={businessName} products={products} storeConfig={storeConfig} speechLang={language.speech} />
          )}
          {page === "listProducts" && (
            <ListProductsPage goTo={goTo} products={products} setProducts={setProducts} speechLang={language.speech} />
          )}
          {page === "customizeStore" && (
            <CustomizeStorePage goTo={goTo} storeConfig={storeConfig} setStoreConfig={setStoreConfig} products={products} speechLang={language.speech} />
          )}
          {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
          <AccessibilityBar fontScale={fontScale} setFontScale={setFontScale} highContrast={highContrast} setHighContrast={setHighContrast} />
        </>
      )}
    </div>
  );
}

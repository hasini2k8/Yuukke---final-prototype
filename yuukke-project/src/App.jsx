import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleFonts, Spinner } from "./components/Shared";
import AccessibilityBar from "./components/AccessibilityBar";
import LoginModal from "./components/LoginModal";
import BusinessSurveyModal from "./components/BusinessSurveyModal";
import HomePage from "./pages/Home";
import BusinessRegistrationPage from "./pages/BusinessRegistration";
import DashboardPage from "./pages/Dashboard";
import ListProductsPage from "./pages/ListProducts";
import CustomizeStorePage from "./pages/CustomizeStore";
import ContentCalendarPage from "./pages/ContentCalendar";
import BrandWorkbenchPage from "./pages/BrandWorkbench";
import { theme } from "./theme";
import { useAuth } from "./components/AuthContext";
import { fetchSite } from "./lib/site";
import { fetchMyProducts } from "./lib/products";
import { fetchBusinessProfile } from "./lib/businessProfile";

// Pages that belong to a logged-in seller's dashboard — gated behind auth so
// a refresh (or someone else opening the app) can't land on another
// seller's in-progress storefront.
const SELLER_PAGES = new Set(["register", "dashboard", "listProducts", "customizeStore", "calendar", "brand"]);

function SellerLoginGate({ onLogin }) {
  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 20, padding: 36, maxWidth: 420, textAlign: "center" }}>
        <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 22, color: theme.ink, margin: "0 0 10px" }}>Log in to continue</h2>
        <p style={{ fontSize: 13.5, color: theme.inkSoft, marginBottom: 22, fontFamily: theme.fontBody }}>
          Your seller dashboard — products, storefront, and brand — is tied to your account. Log in or create one to pick up where you left off.
        </p>
        <button onClick={onLogin} style={{
          background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "12px 26px",
          fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>
          Log in / Sign up
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [products, setProducts] = useState([]);
  const [storeConfig, setStoreConfig] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(undefined); // undefined = not loaded yet, null = loaded but no survey answered
  const [sellerDataLoading, setSellerDataLoading] = useState(false);

  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  // Load this seller's own data once they're known — this is what makes
  // products/storefront/brand survive a refresh instead of resetting to
  // blank local state every time the page reloads.
  useEffect(() => {
    if (!user) {
      setProducts([]);
      setStoreConfig(null);
      setBusinessName("");
      setBusinessProfile(undefined);
      return;
    }
    setSellerDataLoading(true);
    Promise.all([fetchSite(), fetchMyProducts(), fetchBusinessProfile()])
      .then(([site, myProducts, profile]) => {
        setStoreConfig(site);
        setProducts(myProducts || []);
        setBusinessName(site?.businessName || user.businessName || "");
        setBusinessProfile(profile || null);
      })
      .catch(() => setBusinessProfile(null))
      .finally(() => setSellerDataLoading(false));
  }, [user]);

  function goTo(target) {
    if (target === "marketplace") { navigate("/marketplace"); return; }
    setPage(target);
  }

  const isSellerPage = SELLER_PAGES.has(page);
  const sellerAreaLoading = authLoading || (!!user && sellerDataLoading);

  return (
    <div style={{ fontFamily: theme.fontBody, minHeight: "100vh", position: "relative", zoom: fontScale, filter: highContrast ? "contrast(1.35) saturate(1.1)" : "none" }}>
      <GoogleFonts />
      {page === "home" && <HomePage goTo={goTo} openLogin={() => setShowLogin(true)} />}

      {isSellerPage && (
        sellerAreaLoading ? (
          <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spinner size={22} color={theme.wine} />
          </div>
        ) : !user ? (
          <SellerLoginGate onLogin={() => setShowLogin(true)} />
        ) : businessProfile === null ? (
          <BusinessSurveyModal
            onSaved={(profile) => setBusinessProfile(profile)}
            speechLang="en-IN"
          />
        ) : (
          <>
            {page === "register" && (
              <BusinessRegistrationPage goTo={goTo} businessName={businessName} setBusinessName={setBusinessName} speechLang="en-IN" />
            )}
            {page === "dashboard" && (
              <DashboardPage goTo={goTo} businessName={businessName} products={products} storeConfig={storeConfig} speechLang="en-IN" />
            )}
            {page === "listProducts" && (
              <ListProductsPage goTo={goTo} products={products} setProducts={setProducts} businessProfile={businessProfile} speechLang="en-IN" />
            )}
            {page === "customizeStore" && (
              <CustomizeStorePage goTo={goTo} storeConfig={storeConfig} setStoreConfig={setStoreConfig} products={products} businessProfile={businessProfile} speechLang="en-IN" />
            )}
            {page === "calendar" && <ContentCalendarPage goTo={goTo} speechLang="en-IN" />}
            {page === "brand" && <BrandWorkbenchPage goTo={goTo} speechLang="en-IN" />}
          </>
        )
      )}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      <AccessibilityBar fontScale={fontScale} setFontScale={setFontScale} highContrast={highContrast} setHighContrast={setHighContrast} />
    </div>
  );
}

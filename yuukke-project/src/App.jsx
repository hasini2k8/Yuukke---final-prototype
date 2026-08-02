import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleFonts, Spinner } from "./components/Shared";
import AccessibilityBar from "./components/AccessibilityBar";
import LoginModal from "./components/LoginModal";
import HomePage from "./pages/Home";
import BusinessRegistrationPage from "./pages/BusinessRegistration";
import DashboardPage from "./pages/Dashboard";
import ListProductsPage from "./pages/ListProducts";
import CustomizeStorePage from "./pages/CustomizeStore";
import ContentCalendarPage from "./pages/ContentCalendar";
import BrandWorkbenchPage from "./pages/BrandWorkbench";
import { theme } from "./theme";
import { fetchSite } from "./lib/site";
import { fetchMyProducts } from "./lib/products";
import { useAuth } from "./components/AuthContext";

// Pages that belong to the business platform — no login gate: a seller is
// just whatever anonymous id this browser generated (src/lib/sellerId.js),
// so these are reachable immediately, no account needed.
const SELLER_PAGES = new Set(["register", "dashboard", "listProducts", "customizeStore", "calendar", "brand"]);

export default function App() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);
  const [businessName, setBusinessName] = useState("");
  const [products, setProducts] = useState([]);
  const [storeConfig, setStoreConfig] = useState(null);
  const [sellerDataLoading, setSellerDataLoading] = useState(true);

  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  // Load this seller's own data once on mount — this is what makes
  // products/storefront survive a refresh instead of resetting to blank
  // local state every time the page reloads. The seller id itself is
  // permanent (localStorage), so there's nothing to wait on beforehand.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStoreConfig(null);
      setProducts([]);
      setBusinessName("");
      setSellerDataLoading(false);
      setPage((current) => SELLER_PAGES.has(current) ? "home" : current);
      return;
    }
    setSellerDataLoading(true);
    Promise.all([fetchSite(), fetchMyProducts()])
      .then(([site, myProducts]) => {
        setStoreConfig(site);
        setProducts(myProducts || []);
        setBusinessName(site?.businessName || "");
      })
      .catch(() => {})
      .finally(() => setSellerDataLoading(false));
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (user && pendingPage) {
      setPage(pendingPage);
      setPendingPage(null);
    }
  }, [user, pendingPage]);

  function goTo(target) {
    if (target === "marketplace") { navigate("/marketplace"); return; }
    if (SELLER_PAGES.has(target) && !user) {
      setPendingPage(target);
      setShowLogin(true);
      return;
    }
    setPage(target);
  }

  const isSellerPage = SELLER_PAGES.has(page);

  return (
    <div style={{ fontFamily: theme.fontBody, minHeight: "100vh", position: "relative", zoom: fontScale, filter: highContrast ? "contrast(1.35) saturate(1.1)" : "none" }}>
      <GoogleFonts />
      {page === "home" && <HomePage goTo={goTo} openLogin={() => setShowLogin(true)} />}

      {isSellerPage && user && (
        authLoading || sellerDataLoading ? (
          <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spinner size={22} color={theme.wine} />
          </div>
        ) : (
          <>
            {page === "register" && (
              <BusinessRegistrationPage goTo={goTo} businessName={businessName} setBusinessName={setBusinessName} speechLang="en-IN" />
            )}
            {page === "dashboard" && (
              <DashboardPage goTo={goTo} businessName={businessName} products={products} storeConfig={storeConfig} speechLang="en-IN" />
            )}
            {page === "listProducts" && (
              <ListProductsPage goTo={goTo} products={products} setProducts={setProducts} speechLang="en-IN" />
            )}
            {page === "customizeStore" && (
              <CustomizeStorePage goTo={goTo} storeConfig={storeConfig} setStoreConfig={setStoreConfig} products={products} speechLang="en-IN" />
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

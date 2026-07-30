import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronRight, ShoppingCart, CreditCard, Heart, Info, Ruler, Box, ImageIcon, Check,
} from "lucide-react";
import { theme } from "../theme";
import { Logo, Spinner } from "../components/Shared";
import SplatViewer from "../components/SplatViewer";
import PlaceholderViewer from "../components/PlaceholderModel";
import LoginModal from "../components/LoginModal";
import { fetchProduct } from "../lib/products";
import { useAuth } from "../components/AuthContext";
import { useCart } from "../components/CartContext";
import { useWishlist } from "../components/WishlistContext";
import { usePageTranslation } from "../components/I18nContext";

const STRINGS = [
  "Back to marketplace", "My Orders", "Cart", "Log in", "Home", "Products",
  "Loading product…", "We couldn't find that product.", "It may have been removed, or the link is incorrect.",
  "* Price shown is excluding taxes", "QUANTITY:", "Added to cart!", "Add to Cart", "Buy Now",
  "In Your Wishlist", "Add to Wishlist", "PRODUCT DETAILS", "No description provided yet.",
];

function Crumb({ children, last }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: last ? 700 : 600, color: last ? theme.ink : theme.wine }}>
      {children}
    </span>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = usePageTranslation(STRINGS);
  const { user } = useAuth();
  const { add: addToCart } = useCart();
  const { toggle: toggleWishlist, has: inWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [view, setView] = useState("3d"); // 3d | photo
  const [qty, setQty] = useState(1);
  const [showLogin, setShowLogin] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState("");

  function requireLogin() {
    setShowLogin(true);
    return false;
  }

  async function handleAddToCart() {
    if (!user) return requireLogin();
    setCartError("");
    try {
      await addToCart(product.id, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch (e) {
      setCartError(e.message || "Couldn't add to cart just now.");
    }
  }

  async function handleBuyNow() {
    if (!user) return requireLogin();
    setCartError("");
    try {
      await addToCart(product.id, qty);
      navigate("/checkout");
    } catch (e) {
      setCartError(e.message || "Couldn't add to cart just now.");
    }
  }

  async function handleWishlist() {
    if (!user) return requireLogin();
    await toggleWishlist(product.id);
  }

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchProduct(id)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        setView(p.modelUrl ? "3d" : "photo");
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div style={{ background: theme.cream, minHeight: "100vh", fontFamily: theme.fontBody }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white }}>
        <a href="/"><Logo size={26} /></a>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <a href="/marketplace" style={{ fontSize: 13.5, fontWeight: 600, color: theme.wine, textDecoration: "none" }}>{t("Back to marketplace")}</a>
          {user ? (
            <>
              <a href="/orders" style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink, textDecoration: "none" }}>{t("My Orders")}</a>
              <a href="/cart" style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink, textDecoration: "none" }}>{t("Cart")}</a>
            </>
          ) : (
            <span onClick={() => setShowLogin(true)} style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink, cursor: "pointer" }}>{t("Log in")}</span>
          )}
        </div>
      </div>

      <div style={{ padding: "16px 40px 0", display: "flex", alignItems: "center", gap: 6 }}>
        <a href="/" style={{ textDecoration: "none" }}><Crumb>{t("Home")}</Crumb></a>
        <ChevronRight size={13} color={theme.inkSoft} />
        <a href="/marketplace" style={{ textDecoration: "none" }}><Crumb>{t("Products")}</Crumb></a>
        {product && (
          <>
            <ChevronRight size={13} color={theme.inkSoft} />
            <Crumb last>{product.name}</Crumb>
          </>
        )}
      </div>

      {status === "loading" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 20px", color: theme.inkSoft, gap: 10 }}>
          <Spinner size={20} color={theme.wine} /> {t("Loading product…")}
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center", padding: "120px 20px" }}>
          <p style={{ fontFamily: theme.fontDisplay, fontSize: 20, color: theme.ink, marginBottom: 8 }}>{t("We couldn't find that product.")}</p>
          <p style={{ fontSize: 13.5, color: theme.inkSoft }}>{t("It may have been removed, or the link is incorrect.")}</p>
        </div>
      )}

      {status === "ready" && product && (
        <div style={{ display: "flex", gap: 40, padding: "24px 40px 80px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 420px", maxWidth: 560 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {product.modelUrl && (
                <button onClick={() => setView("3d")} style={thumbBtn(view === "3d")}><Box size={22} color={view === "3d" ? "#fff" : theme.ink} /></button>
              )}
              {product.imagePreview && (
                <button onClick={() => setView("photo")} style={thumbBtnImg(view === "photo")}>
                  <img src={product.imagePreview} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                </button>
              )}
              {!product.modelUrl && !product.imagePreview && (
                <div style={thumbBtn(true)}><ImageIcon size={20} color="#fff" /></div>
              )}
            </div>

            <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${theme.line}` }}>
              {view === "3d" && product.modelUrl && (
                <SplatViewer modelUrl={product.modelUrl} height={440} backgroundColor={product.previewColor || undefined} />
              )}
              {view === "photo" && product.imagePreview && (
                <img src={product.imagePreview} alt={product.name} style={{ width: "100%", height: 440, objectFit: "cover", display: "block" }} />
              )}
              {!(view === "3d" && product.modelUrl) && !(view === "photo" && product.imagePreview) && (
                <PlaceholderViewer color={product.previewColor} height={440} />
              )}
            </div>
          </div>

          <div style={{ flex: "1 1 320px", maxWidth: 380 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 1, margin: "0 0 8px" }}>{(product.category || "").toUpperCase()}</p>
            <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 30, color: theme.ink, margin: "0 0 16px", lineHeight: 1.25 }}>{product.name}</h1>
            <p style={{ fontSize: 30, fontWeight: 800, color: theme.ink, margin: "0 0 4px" }}>₹{Number(product.price).toLocaleString("en-IN")}</p>
            <p style={{ fontSize: 12, color: theme.inkSoft, margin: "0 0 22px" }}>{t("* Price shown is excluding taxes")}</p>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink }}>{t("QUANTITY:")}</span>
              <select value={qty} onChange={(e) => setQty(+e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${theme.line}`, fontFamily: theme.fontBody }}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {cartError && <p style={{ color: "#a32d2d", fontSize: 12.5, marginBottom: 10 }}>{cartError}</p>}
            <button onClick={handleAddToCart} style={cartBtn(false)}>
              {added ? <Check size={16} /> : <ShoppingCart size={16} />} {added ? t("Added to cart!") : t("Add to Cart")}
            </button>
            <button onClick={handleBuyNow} style={cartBtn(true)}><CreditCard size={16} /> {t("Buy Now")}</button>
            <button onClick={handleWishlist} style={{
              ...cartBtn(false),
              border: `1.5px solid ${inWishlist(product.id) ? theme.wine : theme.line}`,
              background: inWishlist(product.id) ? theme.wineTint : "none",
              color: inWishlist(product.id) ? theme.wine : theme.ink,
            }}>
              <Heart size={16} fill={inWishlist(product.id) ? theme.wine : "none"} /> {inWishlist(product.id) ? t("In Your Wishlist") : t("Add to Wishlist")}
            </button>

            <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 22, marginTop: 26 }}>
              <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: theme.ink, margin: "0 0 14px" }}>
                <Info size={15} color={theme.wine} /> {t("PRODUCT DETAILS")}
              </p>
              <p style={{ fontSize: 13.5, color: theme.inkSoft, lineHeight: 1.7, margin: product.dimensions ? "0 0 16px" : 0 }}>
                {product.description || t("No description provided yet.")}
              </p>
              {product.dimensions && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: theme.ink, fontWeight: 600, paddingTop: 14, borderTop: `1px solid ${theme.line}` }}>
                  <Ruler size={14} color={theme.wine} />
                  {product.dimensions.length}" L × {product.dimensions.width}" W × {product.dimensions.height}" H
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

function thumbBtn(active) {
  return {
    width: 56, height: 56, borderRadius: 10, border: "none", cursor: "pointer",
    background: active ? theme.wine : theme.creamDark, display: "flex", alignItems: "center", justifyContent: "center",
  };
}
function thumbBtnImg(active) {
  return { ...thumbBtn(active), padding: active ? 2 : 4, border: active ? `2px solid ${theme.wine}` : `1px solid ${theme.line}`, background: "#fff" };
}
function cartBtn(filled) {
  return {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 0",
    borderRadius: 12, border: "none", fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginBottom: 12,
    background: filled ? theme.ink : theme.wine, color: "#fff", fontFamily: theme.fontBody,
  };
}

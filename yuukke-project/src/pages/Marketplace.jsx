import React, { useEffect, useMemo, useState } from "react";
import {
  Search, User, Heart, ShoppingCart, ChevronDown, X,
  ArrowRight, MessageCircle, SlidersHorizontal, Package, Sparkles, Camera, LogOut,
} from "lucide-react";
import { theme, ACCENTS } from "../theme";
import { Logo, IconCircle } from "../components/Shared";
import PlaceholderViewer from "../components/PlaceholderModel";
import SplatViewer from "../components/SplatViewer";
import TryInSpaceModal from "../components/TryInSpaceModal";
import LoginModal from "../components/LoginModal";
import { fetchProducts } from "../lib/products";
import { useAuth } from "../components/AuthContext";
import { useCart } from "../components/CartContext";
import { useWishlist } from "../components/WishlistContext";

const navLink = { fontSize: 13.5, fontWeight: 600, color: "#3a2c30", cursor: "pointer", fontFamily: theme.fontBody, textDecoration: "none" };
const sideLabel = { display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: theme.ink, marginBottom: 10 };
const CATEGORIES = ["Home Decor", "Fashion & Apparel", "Wellness", "Festive Gifting", "Handicrafts", "Personal Care", "Kitchen & Dining"];

// Used only if the catalog fetch fails (offline/dev-server-not-running) —
// the real source of truth is the backend, which seeds these same 4 demo
// listings on first run (see server/productStore.js).
const FALLBACK_PRODUCTS = [
  { id: "demo-1", name: "Hand-block Table Runner", category: "Home Decor", price: 1299, previewColor: ACCENTS[0], modelUrl: null, inStock: true },
  { id: "demo-2", name: "Terracotta Planter Set", category: "Home Decor", price: 899, previewColor: ACCENTS[1], modelUrl: null, inStock: true },
  { id: "demo-3", name: "Embroidered Silk Clutch", category: "Fashion & Apparel", price: 2149, previewColor: ACCENTS[4], modelUrl: null, inStock: true },
  { id: "demo-4", name: "Brass Diya Set of 5", category: "Festive Gifting", price: 749, previewColor: ACCENTS[5], modelUrl: null, inStock: true },
];

function badgeStyle() {
  return {
    position: "absolute", top: -4, right: -4, background: theme.wine, color: "#fff", fontSize: 10, fontWeight: 700,
    borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
  };
}

function ProductCard({ product, onTryInSpace }) {
  const { user } = useAuth();
  const { toggle: toggleWishlist, has: inWishlist } = useWishlist();
  const [showLogin, setShowLogin] = useState(false);

  function handleWishlistClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { setShowLogin(true); return; }
    toggleWishlist(product.id);
  }

  return (
    <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, overflow: "hidden", position: "relative" }}>
      <button
        onClick={handleWishlistClick}
        aria-label={inWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
        style={{
          position: "absolute", top: 10, right: 10, zIndex: 2, width: 30, height: 30, borderRadius: "50%",
          background: "rgba(255,255,255,.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Heart size={14} color={theme.wine} fill={inWishlist(product.id) ? theme.wine : "none"} />
      </button>
      <a
        href={`/product/${product.id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", textDecoration: "none", color: "inherit" }}
      >
        {product.modelUrl ? (
          <SplatViewer modelUrl={product.modelUrl} height={170} backgroundColor={product.previewColor || undefined} />
        ) : (
          <PlaceholderViewer color={product.previewColor} height={170} />
        )}
        <div style={{ padding: "16px 16px 0" }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: theme.wine, letterSpacing: 1, margin: "0 0 6px" }}>{(product.category || "").toUpperCase()}</p>
          <h4 style={{ fontFamily: theme.fontDisplay, fontSize: 15, color: theme.ink, margin: "0 0 8px" }}>{product.name}</h4>
        </div>
      </a>
      <div style={{ padding: "0 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: theme.ink }}>₹{Number(product.price).toLocaleString("en-IN")}</span>
        <button onClick={() => onTryInSpace(product)} style={{
          display: "flex", alignItems: "center", gap: 5, background: theme.wineTint, color: theme.wine,
          border: "none", borderRadius: 999, padding: "7px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
        }}>
          <Camera size={12} /> Try in your space
        </button>
      </div>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

export default function MarketplacePage({ goTo }) {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const [tryInSpaceProduct, setTryInSpaceProduct] = useState(null);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [showLogin, setShowLogin] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Pending values track the controls; "Apply filters" / "Clear filters"
  // commit them into the actual applied filter used to narrow the grid.
  const [pending, setPending] = useState({ inStock: false, maxPrice: 100000, category: null });
  const [applied, setApplied] = useState({ inStock: false, maxPrice: 100000, category: null });
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    fetchProducts()
      .then((list) => { if (Array.isArray(list) && list.length) setProducts(list); })
      .catch(() => setCatalogError(true)); // keep the fallback listings if the catalog can't be reached, but say so
  }, []);

  function selectCategory(cat) {
    setPending((p) => ({ ...p, category: p.category === cat ? null : cat }));
  }
  function applyFilters() {
    setApplied(pending);
  }
  function clearFilters() {
    const reset = { inStock: false, maxPrice: 100000, category: null };
    setPending(reset);
    setApplied(reset);
  }

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (applied.category && p.category !== applied.category) return false;
      if (applied.inStock && p.inStock === false) return false;
      if (Number(p.price) > applied.maxPrice) return false;
      if (searchTerm.trim() && !p.name.toLowerCase().includes(searchTerm.trim().toLowerCase())) return false;
      return true;
    });
  }, [products, applied, searchTerm]);

  return (
    <div style={{ background: theme.cream, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <div onClick={() => goTo("home")} style={{ cursor: "pointer" }}><Logo size={26} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <span style={navLink}>Products <ChevronDown size={13} style={{ verticalAlign: -2 }} /></span>
            <a href="/about-us" style={navLink}>About Us</a>
            <a href="/become-mentor" style={navLink}>Become a Mentor</a>
            <a href="/business-exchange" style={navLink}>Business Exchange</a>
            {user && <a href="/orders" style={navLink}>Track Order</a>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {showSearch ? (
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={() => { if (!searchTerm) setShowSearch(false); }}
              placeholder="Search products…"
              style={{ padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${theme.line}`, fontSize: 13, fontFamily: theme.fontBody, outline: "none", width: 180 }}
            />
          ) : (
            <IconCircle label="Search products…" onClick={() => setShowSearch(true)}><Search size={17} /></IconCircle>
          )}

          <div style={{ position: "relative" }}>
            <IconCircle label={user ? "Account menu" : "Log in"} onClick={() => (user ? setShowAccountMenu((s) => !s) : setShowLogin(true))}>
              <User size={17} />
            </IconCircle>
            {showAccountMenu && user && (
              <div style={{
                position: "absolute", top: 44, right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 14px 30px rgba(0,0,0,.18)",
                padding: 14, minWidth: 190, zIndex: 10,
              }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, margin: "0 0 2px" }}>{user.businessName || "Your account"}</p>
                <p style={{ fontSize: 11.5, color: theme.inkSoft, margin: "0 0 12px" }}>{user.email}</p>
                <a href="/orders" style={{ display: "block", fontSize: 12.5, color: theme.ink, textDecoration: "none", padding: "6px 0" }}>My Orders</a>
                <a href="/wishlist" style={{ display: "block", fontSize: 12.5, color: theme.ink, textDecoration: "none", padding: "6px 0" }}>Wishlist</a>
                <button onClick={() => { logout(); setShowAccountMenu(false); }} style={{
                  display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#a3512c",
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "8px 0 0", width: "100%",
                }}>
                  <LogOut size={13} /> Log out
                </button>
              </div>
            )}
          </div>

          <a href="/wishlist" style={{ position: "relative" }}>
            <IconCircle label="Wishlist"><Heart size={17} /></IconCircle>
            {wishlistItems.length > 0 && <span style={badgeStyle()}>{wishlistItems.length}</span>}
          </a>
          <a href="/cart" style={{ position: "relative" }}>
            <IconCircle label="Cart"><ShoppingCart size={17} /></IconCircle>
            {itemCount > 0 && <span style={badgeStyle()}>{itemCount}</span>}
          </a>
        </div>
      </div>

      <div style={{ display: "flex", gap: 28, padding: "28px 40px 70px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 260, background: theme.white, borderRadius: 16, padding: 22, border: `1px solid ${theme.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14.5, color: theme.ink }}>
              <SlidersHorizontal size={16} /> Filters
            </span>
            <span onClick={clearFilters} style={{ fontSize: 12.5, color: theme.wine, fontWeight: 600, cursor: "pointer" }}><X size={11} style={{ verticalAlign: -1 }} /> Clear filters</span>
          </div>
          <p style={sideLabel}><Package size={14} /> Availability</p>
          <div onClick={() => setPending((p) => ({ ...p, inStock: !p.inStock }))} style={{
            width: 44, height: 24, borderRadius: 999, background: pending.inStock ? theme.wine : theme.line,
            padding: 3, cursor: "pointer", marginBottom: 22, transition: "all .2s ease",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: pending.inStock ? "translateX(20px)" : "translateX(0)", transition: "all .2s ease" }} />
          </div>
          <p style={{ fontSize: 12, color: theme.inkSoft, marginTop: -16, marginBottom: 22 }}>In stock only</p>
          <p style={sideLabel}>₹ Price range</p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.inkSoft, marginBottom: 6 }}>
            <span>₹0</span><span>Max: ₹{pending.maxPrice.toLocaleString("en-IN")}</span>
          </div>
          <input type="range" min="0" max="100000" step="1000" value={pending.maxPrice} onChange={(e) => setPending((p) => ({ ...p, maxPrice: +e.target.value }))}
            style={{ width: "100%", accentColor: theme.wine, marginBottom: 20 }} />
          <button onClick={applyFilters} style={{ width: "100%", background: theme.wine, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 26 }}>
            Apply filters <ArrowRight size={13} style={{ verticalAlign: -2 }} />
          </button>
          <p style={{ fontWeight: 700, fontSize: 14.5, color: theme.ink, marginBottom: 12 }}>Categories</p>
          {CATEGORIES.map((c) => (
            <p key={c} onClick={() => selectCategory(c)} style={{
              fontSize: 13, padding: "7px 8px", cursor: "pointer", fontFamily: theme.fontBody, margin: "0 0 2px", borderRadius: 8,
              color: pending.category === c ? theme.wine : theme.inkSoft,
              background: pending.category === c ? theme.wineTint : "transparent",
              fontWeight: pending.category === c ? 700 : 400,
            }}>{c}</p>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          {catalogError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fdf0ea", border: "1px solid #e8c4ac", borderRadius: 12, padding: "10px 16px", marginBottom: 20 }}>
              <span style={{ fontSize: 12.5, color: "#7a3a1f", fontWeight: 600 }}>
                Couldn't reach the product catalog — showing sample listings instead of what's actually in the marketplace. Refresh to try again.
              </span>
            </div>
          )}
          <div style={{ background: `linear-gradient(120deg, ${theme.wineTint}, ${theme.creamDark})`, borderRadius: 20, padding: "36px 40px", marginBottom: 30, border: `1px solid ${theme.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 22, height: 2, background: theme.wine, display: "inline-block" }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.wine, letterSpacing: 1 }}>FESTIVE GIFTING</span>
              <span style={{ color: theme.gold }}>•</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.gold, letterSpacing: 1 }}>YUUKKE PICKS</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: theme.inkSoft, letterSpacing: 1.5, marginBottom: 6 }}>MOST LOVED THIS SEASON</p>
            <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 44, margin: 0, color: theme.ink }}>
              Yuukke <span style={{ color: theme.wine, fontStyle: "italic" }}>Hot Picks</span>
            </h2>
            <p style={{ color: theme.inkSoft, fontSize: 15, maxWidth: 480, marginTop: 12, fontFamily: theme.fontBody }}>
              Discover our most popular products, loved by thousands of happy customers!
            </p>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Sparkles size={17} color={theme.wine} />
              <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 19, color: theme.ink, margin: 0 }}>
                {searchTerm || applied.category || applied.inStock ? `${visibleProducts.length} result${visibleProducts.length === 1 ? "" : "s"}` : "Recommended for you"}
              </h3>
            </div>
            {visibleProducts.length === 0 ? (
              <p style={{ fontSize: 13.5, color: theme.inkSoft }}>No products match these filters.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onTryInSpace={setTryInSpaceProduct} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 26, right: 26, width: 54, height: 54, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(0,0,0,.2)", cursor: "pointer" }}>
        <MessageCircle size={26} color="#fff" />
      </div>

      {tryInSpaceProduct && (
        <TryInSpaceModal
          productModelUrl={tryInSpaceProduct.modelUrl}
          productColor={tryInSpaceProduct.previewColor}
          productName={tryInSpaceProduct.name}
          onClose={() => setTryInSpaceProduct(null)}
        />
      )}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}

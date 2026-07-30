import React, { useEffect, useState } from "react";
import {
  Search, User, Heart, ShoppingCart, Globe, ChevronDown, X,
  ArrowRight, MessageCircle, SlidersHorizontal, Package, Sparkles, Camera,
} from "lucide-react";
import { theme, ACCENTS } from "../theme";
import { Logo, IconCircle } from "../components/Shared";
import PlaceholderViewer from "../components/PlaceholderModel";
import SplatViewer from "../components/SplatViewer";
import TryInSpaceModal from "../components/TryInSpaceModal";
import { fetchProducts } from "../lib/products";

const navLink = { fontSize: 13.5, fontWeight: 600, color: "#3a2c30", cursor: "pointer", fontFamily: theme.fontBody };
const sideLabel = { display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: theme.ink, marginBottom: 10 };

// Used only if the catalog fetch fails (offline/dev-server-not-running) —
// the real source of truth is the backend, which seeds these same 4 demo
// listings on first run (see server/productStore.js).
const FALLBACK_PRODUCTS = [
  { id: "demo-1", name: "Hand-block Table Runner", category: "Home Decor", price: 1299, previewColor: ACCENTS[0], modelUrl: null },
  { id: "demo-2", name: "Terracotta Planter Set", category: "Home Decor", price: 899, previewColor: ACCENTS[1], modelUrl: null },
  { id: "demo-3", name: "Embroidered Silk Clutch", category: "Fashion & Apparel", price: 2149, previewColor: ACCENTS[4], modelUrl: null },
  { id: "demo-4", name: "Brass Diya Set of 5", category: "Festive Gifting", price: 749, previewColor: ACCENTS[5], modelUrl: null },
];

function ProductCard({ product, onTryInSpace }) {
  return (
    <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, overflow: "hidden" }}>
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
    </div>
  );
}

export default function MarketplacePage({ goTo }) {
  const [inStock, setInStock] = useState(false);
  const [price, setPrice] = useState(100000);
  const [tryInSpaceProduct, setTryInSpaceProduct] = useState(null);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const categories = ["Home Decor", "Fashion & Apparel", "Wellness", "Festive Gifting", "Handicrafts", "Personal Care", "Kitchen & Dining"];

  useEffect(() => {
    fetchProducts()
      .then((list) => { if (Array.isArray(list) && list.length) setProducts(list); })
      .catch(() => {}); // keep the fallback listings if the catalog can't be reached
  }, []);

  return (
    <div style={{ background: theme.cream, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <div onClick={() => goTo("home")} style={{ cursor: "pointer" }}><Logo size={26} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <span style={navLink}>Products <ChevronDown size={13} style={{ verticalAlign: -2 }} /></span>
            <span style={navLink}>Offers</span>
            <span style={navLink}>Personalized Gifting</span>
            <span style={navLink}>Corporate Gifting</span>
            <span style={navLink}>Track Order</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <IconCircle><Search size={17} /></IconCircle>
          <IconCircle><User size={17} /></IconCircle>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: theme.ink, cursor: "pointer" }}><Globe size={15} /> EN</span>
          <IconCircle><Heart size={17} /></IconCircle>
          <IconCircle><ShoppingCart size={17} /></IconCircle>
        </div>
      </div>

      <div style={{ display: "flex", gap: 28, padding: "28px 40px 70px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 260, background: theme.white, borderRadius: 16, padding: 22, border: `1px solid ${theme.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14.5, color: theme.ink }}>
              <SlidersHorizontal size={16} /> Filters
            </span>
            <span style={{ fontSize: 12.5, color: theme.wine, fontWeight: 600, cursor: "pointer" }}><X size={11} style={{ verticalAlign: -1 }} /> Clear filters</span>
          </div>
          <p style={sideLabel}><Package size={14} /> Availability</p>
          <div onClick={() => setInStock(!inStock)} style={{
            width: 44, height: 24, borderRadius: 999, background: inStock ? theme.wine : theme.line,
            padding: 3, cursor: "pointer", marginBottom: 22, transition: "all .2s ease",
          }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: inStock ? "translateX(20px)" : "translateX(0)", transition: "all .2s ease" }} />
          </div>
          <p style={{ fontSize: 12, color: theme.inkSoft, marginTop: -16, marginBottom: 22 }}>In stock only</p>
          <p style={sideLabel}>₹ Price range</p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.inkSoft, marginBottom: 6 }}>
            <span>₹0</span><span>Max: ₹{price.toLocaleString("en-IN")}</span>
          </div>
          <input type="range" min="0" max="100000" step="1000" value={price} onChange={(e) => setPrice(+e.target.value)}
            style={{ width: "100%", accentColor: theme.wine, marginBottom: 20 }} />
          <button style={{ width: "100%", background: theme.wine, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 26 }}>
            Apply filters <ArrowRight size={13} style={{ verticalAlign: -2 }} />
          </button>
          <p style={{ fontWeight: 700, fontSize: 14.5, color: theme.ink, marginBottom: 12 }}>Categories</p>
          {categories.map((c) => (
            <p key={c} style={{ fontSize: 13, color: theme.inkSoft, padding: "7px 0", cursor: "pointer", fontFamily: theme.fontBody }}>{c}</p>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
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
              <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 19, color: theme.ink, margin: 0 }}>Recommended for you</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onTryInSpace={setTryInSpaceProduct} />
              ))}
            </div>
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
    </div>
  );
}

import React from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { theme } from "../theme";
import { Logo } from "../components/Shared";
import { useAuth } from "../components/AuthContext";
import { useWishlist } from "../components/WishlistContext";
import { useCart } from "../components/CartContext";

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, toggle } = useWishlist();
  const { add } = useCart();

  return (
    <div style={{ background: theme.cream, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white }}>
        <a href="/marketplace"><Logo size={26} /></a>
        <a href="/marketplace" style={{ fontSize: 13.5, fontWeight: 600, color: theme.wine, textDecoration: "none" }}>Back to marketplace</a>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 90px" }}>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, color: theme.ink, margin: "0 0 24px" }}>Your wishlist</h1>

        {!authLoading && !user && <p style={{ fontSize: 14, color: theme.inkSoft }}>Log in from the marketplace to see your wishlist.</p>}

        {user && items.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", background: theme.white, borderRadius: 18, border: `1px solid ${theme.line}` }}>
            <Heart size={30} color={theme.inkSoft} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: theme.fontDisplay, fontSize: 18, color: theme.ink, margin: "0 0 6px" }}>Nothing saved yet</p>
            <p style={{ fontSize: 13.5, color: theme.inkSoft, margin: 0 }}>Tap the heart on any product to save it here.</p>
          </div>
        )}

        {user && items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {items.map((product) => (
              <div key={product.id} style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 16 }}>
                <div style={{ width: "100%", aspectRatio: "1", borderRadius: 10, background: product.previewColor ? `${product.previewColor}22` : theme.creamDark, marginBottom: 12 }} />
                <a href={`/product/${product.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <p style={{ fontFamily: theme.fontDisplay, fontSize: 14.5, color: theme.ink, margin: "0 0 6px" }}>{product.name}</p>
                </a>
                <p style={{ fontSize: 14, fontWeight: 700, color: theme.ink, margin: "0 0 12px" }}>₹{Number(product.price).toLocaleString("en-IN")}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => add(product.id, 1)} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: theme.wine, color: "#fff",
                    border: "none", borderRadius: 10, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>
                    <ShoppingCart size={13} /> Add
                  </button>
                  <button onClick={() => toggle(product.id)} aria-label="Remove from wishlist" style={{
                    background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 10, padding: "9px 12px", cursor: "pointer", color: theme.wine,
                  }}>
                    <Heart size={14} fill={theme.wine} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

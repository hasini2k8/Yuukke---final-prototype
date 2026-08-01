import React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { theme } from "../theme";
import { Logo, Spinner } from "../components/Shared";
import { useCart } from "../components/CartContext";
import { useAuth } from "../components/AuthContext";

export default function CartPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { cart, total, loading, update, remove } = useCart();

  return (
    <div style={{ background: theme.cream, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white }}>
        <a href="/marketplace"><Logo size={26} /></a>
        <a href="/marketplace" style={{ fontSize: 13.5, fontWeight: 600, color: theme.wine, textDecoration: "none" }}>Continue shopping</a>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 90px" }}>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, color: theme.ink, margin: "0 0 24px" }}>Your cart</h1>

        {!authLoading && !user && (
          <p style={{ fontSize: 14, color: theme.inkSoft }}>Log in from the marketplace to see your cart.</p>
        )}

        {user && loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.inkSoft }}>
            <Spinner size={16} color={theme.wine} /> Loading your cart…
          </div>
        )}

        {user && !loading && cart.items.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", background: theme.white, borderRadius: 18, border: `1px solid ${theme.line}` }}>
            <ShoppingBag size={30} color={theme.inkSoft} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: theme.fontDisplay, fontSize: 18, color: theme.ink, margin: "0 0 6px" }}>Your cart is empty</p>
            <p style={{ fontSize: 13.5, color: theme.inkSoft, margin: "0 0 18px" }}>Browse the marketplace to find something made with care.</p>
            <button onClick={() => navigate("/marketplace")} style={{ background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "11px 22px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
              Browse marketplace
            </button>
          </div>
        )}

        {user && !loading && cart.items.length > 0 && (
          <>
            <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, overflow: "hidden", marginBottom: 22 }}>
              {cart.items.map((item, i) => (
                <div key={item.productId} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
                  borderBottom: i < cart.items.length - 1 ? `1px solid ${theme.line}` : "none",
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: item.product.previewColor ? `${item.product.previewColor}22` : theme.creamDark, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: theme.ink, margin: "0 0 2px" }}>{item.product.name}</p>
                    <p style={{ fontSize: 12, color: theme.inkSoft, margin: 0 }}>₹{Number(item.product.price).toLocaleString("en-IN")} each</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button aria-label="Decrease quantity" onClick={() => update(item.productId, item.quantity - 1)} style={qtyBtn()}><Minus size={12} /></button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: theme.ink, minWidth: 18, textAlign: "center" }}>{item.quantity}</span>
                    <button aria-label="Increase quantity" onClick={() => update(item.productId, item.quantity + 1)} style={qtyBtn()}><Plus size={12} /></button>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: theme.ink, margin: 0, width: 90, textAlign: "right" }}>
                    ₹{Number(item.product.price * item.quantity).toLocaleString("en-IN")}
                  </p>
                  <button aria-label="Remove from cart" onClick={() => remove(item.productId)} style={{ background: "none", border: "none", color: theme.inkSoft, cursor: "pointer" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: theme.ink }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: theme.ink }}>₹{Number(total).toLocaleString("en-IN")}</span>
            </div>

            <button onClick={() => navigate("/checkout")} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: theme.wine, color: "#fff",
              border: "none", borderRadius: 12, padding: "14px 0", fontWeight: 700, fontSize: 14.5, cursor: "pointer",
            }}>
              Proceed to checkout <ArrowRight size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function qtyBtn() {
  return { width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${theme.line}`, background: "#fff", color: theme.ink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, ShieldAlert } from "lucide-react";
import { theme } from "../theme";
import { Logo, Spinner } from "../components/Shared";
import { useCart } from "../components/CartContext";
import { useAuth } from "../components/AuthContext";
import { placeOrder } from "../lib/orders";
import { usePageTranslation } from "../components/I18nContext";

function fieldStyle() {
  return { width: "100%", padding: "11px 14px", borderRadius: 11, border: `1.5px solid ${theme.line}`, fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream };
}

const STRINGS = [
  "Order confirmed!", "This is a demo checkout — no real payment was taken.", "View my orders", "Keep shopping",
  "Back to cart", "Checkout", "Demo checkout — an order is recorded, but no real payment is processed.",
  "Your cart is empty —", "browse the marketplace", "Shipping address", "Full name", "Address",
  "House no., street, area", "City", "Pincode", "Phone", "Order summary", "Total", "Placing order…", "Place order",
  "Couldn't place the order just now.",
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const t = usePageTranslation(STRINGS);
  const { user } = useAuth();
  const { cart, total, refresh } = useCart();
  const [address, setAddress] = useState({ name: user?.businessName || "", line1: "", city: "", pincode: "", phone: "" });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  function setField(field, value) {
    setAddress((a) => ({ ...a, [field]: value }));
  }

  async function handlePlace(e) {
    e.preventDefault();
    setPlacing(true);
    setError("");
    try {
      const placed = await placeOrder(address);
      setOrder(placed);
      await refresh();
    } catch (err) {
      setError(err.message || t("Couldn't place the order just now."));
    } finally {
      setPlacing(false);
    }
  }

  if (order) {
    return (
      <div style={{ background: theme.cream, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: theme.white, borderRadius: 20, padding: 40, maxWidth: 440, width: "100%", textAlign: "center" }}>
          <CircleCheck size={40} color="#2c6e49" style={{ marginBottom: 14 }} />
          <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 24, color: theme.ink, margin: "0 0 8px" }}>{t("Order confirmed!")}</h1>
          <p style={{ fontSize: 13.5, color: theme.inkSoft, marginBottom: 6 }}>Order #{order.id.slice(0, 8)} · ₹{Number(order.total).toLocaleString("en-IN")}</p>
          <p style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 24 }}>{t("This is a demo checkout — no real payment was taken.")}</p>
          <button onClick={() => navigate("/orders")} style={{ background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginRight: 10 }}>
            {t("View my orders")}
          </button>
          <button onClick={() => navigate("/marketplace")} style={{ background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 12, padding: "12px 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", color: theme.ink }}>
            {t("Keep shopping")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: theme.cream, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white }}>
        <a href="/marketplace"><Logo size={26} /></a>
        <a href="/cart" style={{ fontSize: 13.5, fontWeight: 600, color: theme.wine, textDecoration: "none" }}>{t("Back to cart")}</a>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px 90px" }}>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, color: theme.ink, margin: "0 0 8px" }}>{t("Checkout")}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: theme.wineTint, borderRadius: 10, padding: "9px 14px", marginBottom: 24 }}>
          <ShieldAlert size={14} color={theme.wine} />
          <p style={{ fontSize: 12, color: theme.wine, margin: 0, fontWeight: 600 }}>{t("Demo checkout — an order is recorded, but no real payment is processed.")}</p>
        </div>

        {!cart.items.length ? (
          <p style={{ fontSize: 14, color: theme.inkSoft }}>{t("Your cart is empty —")} <a href="/marketplace" style={{ color: theme.wine }}>{t("browse the marketplace")}</a>.</p>
        ) : (
          <form onSubmit={handlePlace}>
            <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: theme.ink, marginBottom: 16 }}>{t("Shipping address")}</p>
              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>{t("Full name")}</span>
                <input required value={address.name} onChange={(e) => setField("name", e.target.value)} style={fieldStyle()} />
              </label>
              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>{t("Address")}</span>
                <input required value={address.line1} onChange={(e) => setField("line1", e.target.value)} placeholder={t("House no., street, area")} style={fieldStyle()} />
              </label>
              <div style={{ display: "flex", gap: 14 }}>
                <label style={{ flex: 1, display: "block", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>{t("City")}</span>
                  <input required value={address.city} onChange={(e) => setField("city", e.target.value)} style={fieldStyle()} />
                </label>
                <label style={{ flex: 1, display: "block", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>{t("Pincode")}</span>
                  <input required value={address.pincode} onChange={(e) => setField("pincode", e.target.value)} style={fieldStyle()} />
                </label>
              </div>
              <label style={{ display: "block" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>{t("Phone")}</span>
                <input required value={address.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+91 98765 43210" style={fieldStyle()} />
              </label>
            </div>

            <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: theme.ink, marginBottom: 14 }}>{t("Order summary")}</p>
              {cart.items.map((item) => (
                <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: theme.inkSoft, marginBottom: 8 }}>
                  <span>{item.product.name} × {item.quantity}</span>
                  <span>₹{Number(item.product.price * item.quantity).toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, marginTop: 8, borderTop: `1px solid ${theme.line}`, fontWeight: 700, fontSize: 15, color: theme.ink }}>
                <span>{t("Total")}</span>
                <span>₹{Number(total).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {error && <p style={{ color: "#a32d2d", fontSize: 12.5, marginBottom: 14 }}>{error}</p>}

            <button type="submit" disabled={placing} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: theme.wine, color: "#fff",
              border: "none", borderRadius: 12, padding: "14px 0", fontWeight: 700, fontSize: 14.5, cursor: placing ? "default" : "pointer", opacity: placing ? 0.7 : 1,
            }}>
              {placing && <Spinner />} {placing ? t("Placing order…") : t("Place order")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

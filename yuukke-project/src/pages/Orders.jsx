import React, { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { theme } from "../theme";
import { Logo, Spinner } from "../components/Shared";
import { useAuth } from "../components/AuthContext";
import { fetchOrders } from "../lib/orders";

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchOrders().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, [user]);

  return (
    <div style={{ background: theme.cream, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 40px", borderBottom: `1px solid ${theme.line}`, background: theme.white }}>
        <a href="/marketplace"><Logo size={26} /></a>
        <a href="/marketplace" style={{ fontSize: 13.5, fontWeight: 600, color: theme.wine, textDecoration: "none" }}>Back to marketplace</a>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 90px" }}>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, color: theme.ink, margin: "0 0 24px" }}>My orders</h1>

        {!authLoading && !user && <p style={{ fontSize: 14, color: theme.inkSoft }}>Log in from the marketplace to see your orders.</p>}

        {user && loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.inkSoft }}>
            <Spinner size={16} color={theme.wine} /> Loading your orders…
          </div>
        )}

        {user && !loading && orders.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", background: theme.white, borderRadius: 18, border: `1px solid ${theme.line}` }}>
            <Package size={30} color={theme.inkSoft} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: theme.fontDisplay, fontSize: 18, color: theme.ink, margin: "0 0 6px" }}>No orders yet</p>
            <p style={{ fontSize: 13.5, color: theme.inkSoft, margin: 0 }}>Orders you place will show up here.</p>
          </div>
        )}

        {user && !loading && orders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {orders.map((order) => (
              <div key={order.id} style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: theme.ink, margin: "0 0 2px" }}>Order #{order.id.slice(0, 8)}</p>
                    <p style={{ fontSize: 11.5, color: theme.inkSoft, margin: 0 }}>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#2c6e49", background: "#e6f2ea", padding: "4px 12px", borderRadius: 999, textTransform: "capitalize" }}>{order.status}</span>
                </div>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: theme.inkSoft, marginBottom: 6 }}>
                    <span>{item.name} × {item.quantity}</span>
                    <span>₹{Number(item.price * item.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTop: `1px solid ${theme.line}`, fontWeight: 700, fontSize: 14, color: theme.ink }}>
                  <span>Total</span>
                  <span>₹{Number(order.total).toLocaleString("en-IN")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

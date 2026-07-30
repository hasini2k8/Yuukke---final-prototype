import React, { useState } from "react";
import { X, Mail, Lock } from "lucide-react";
import { theme } from "../theme";
import { Logo } from "./Shared";

export default function LoginModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 250, background: "rgba(20,14,16,.6)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: theme.white, borderRadius: 20, padding: 32, maxWidth: 380, width: "100%", position: "relative" }}>
        <button aria-label="Close" onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: theme.inkSoft, cursor: "pointer" }}>
          <X size={18} />
        </button>

        <div style={{ marginBottom: 22 }}><Logo size={26} /></div>
        <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 22, color: theme.ink, margin: "0 0 6px" }}>Welcome back</h2>
        <p style={{ fontSize: 13.5, color: theme.inkSoft, marginBottom: 22, fontFamily: theme.fontBody }}>Log in to manage your Yuukke store.</p>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>Email or mobile number</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${theme.line}`, borderRadius: 11, padding: "11px 14px", background: theme.cream }}>
            <Mail size={15} color={theme.inkSoft} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@business.com" style={{ border: "none", outline: "none", background: "none", flex: 1, fontSize: 13.5, fontFamily: theme.fontBody }} />
          </div>
        </label>

        <label style={{ display: "block", marginBottom: 22 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>Password</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${theme.line}`, borderRadius: 11, padding: "11px 14px", background: theme.cream }}>
            <Lock size={15} color={theme.inkSoft} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ border: "none", outline: "none", background: "none", flex: 1, fontSize: 13.5, fontFamily: theme.fontBody }} />
          </div>
        </label>

        <button style={{ width: "100%", background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 14 }}>
          Log in
        </button>
        <p style={{ fontSize: 12.5, color: theme.inkSoft, textAlign: "center" }}>
          New to Yuukke? <span style={{ color: theme.wine, fontWeight: 700, cursor: "pointer" }}>Register your business</span>
        </p>
      </div>
    </div>
  );
}

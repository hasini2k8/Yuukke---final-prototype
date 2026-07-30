import React, { useState } from "react";
import { X, Mail, Lock, User as UserIcon } from "lucide-react";
import { theme } from "../theme";
import { Logo, Spinner } from "./Shared";
import { useAuth } from "./AuthContext";
import { usePageTranslation } from "./I18nContext";

function fieldWrap() {
  return { display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${theme.line}`, borderRadius: 11, padding: "11px 14px", background: theme.cream };
}
function fieldInput() {
  return { border: "none", outline: "none", background: "none", flex: 1, fontSize: 13.5, fontFamily: theme.fontBody };
}

const STRINGS = [
  "Welcome back", "Create your account", "Log in to shop, save favorites, and track orders.",
  "Join Yuukke to shop, save favorites, and track orders.", "Business or full name", "Email", "Password",
  "Log in", "Create account", "New to Yuukke? ", "Already have an account? ", "Create an account",
  "Something went wrong — please try again.",
];

export default function LoginModal({ onClose }) {
  const t = usePageTranslation(STRINGS);
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login({ email, password });
      else await signup({ email, password, businessName });
      onClose();
    } catch (err) {
      setError(err.message || t("Something went wrong — please try again."));
    } finally {
      setLoading(false);
    }
  }

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
        <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 22, color: theme.ink, margin: "0 0 6px" }}>
          {mode === "login" ? t("Welcome back") : t("Create your account")}
        </h2>
        <p style={{ fontSize: 13.5, color: theme.inkSoft, marginBottom: 22, fontFamily: theme.fontBody }}>
          {mode === "login" ? t("Log in to shop, save favorites, and track orders.") : t("Join Yuukke to shop, save favorites, and track orders.")}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>{t("Business or full name")}</span>
              <div style={fieldWrap()}>
                <UserIcon size={15} color={theme.inkSoft} />
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Anjali Handlooms" style={fieldInput()} />
              </div>
            </label>
          )}

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>{t("Email")}</span>
            <div style={fieldWrap()}>
              <Mail size={15} color={theme.inkSoft} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@business.com" style={fieldInput()} />
            </div>
          </label>

          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>{t("Password")}</span>
            <div style={fieldWrap()}>
              <Lock size={15} color={theme.inkSoft} />
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={fieldInput()} />
            </div>
          </label>

          {error && <p style={{ color: "#a32d2d", fontSize: 12.5, marginBottom: 14 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: theme.wine, color: "#fff",
            border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1, marginBottom: 14,
          }}>
            {loading && <Spinner />} {mode === "login" ? t("Log in") : t("Create account")}
          </button>
        </form>

        <p style={{ fontSize: 12.5, color: theme.inkSoft, textAlign: "center" }}>
          {mode === "login" ? t("New to Yuukke? ") : t("Already have an account? ")}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ color: theme.wine, fontWeight: 700, cursor: "pointer" }}>
            {mode === "login" ? t("Create an account") : t("Log in")}
          </span>
        </p>
      </div>
    </div>
  );
}

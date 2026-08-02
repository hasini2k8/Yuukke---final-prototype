import React, { useState } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { theme } from "../theme";
import { useAuth } from "./AuthContext";

export default function AccountMenu({ label }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const name = label || user.businessName || "Your account";
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open profile menu" style={{
        display: "flex", alignItems: "center", gap: 8, border: `1px solid ${theme.line}`, background: theme.white,
        borderRadius: 999, padding: "6px 10px 6px 6px", cursor: "pointer", color: theme.ink,
      }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: theme.wineTint, color: theme.wine, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
          {name.trim()[0]?.toUpperCase() || <User size={14} />}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: 46, right: 0, minWidth: 220, padding: 14, background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 14, boxShadow: "0 14px 30px rgba(0,0,0,.18)", zIndex: 100 }}>
          <p style={{ fontSize: 12.5, fontWeight: 800, color: theme.ink, margin: "0 0 3px" }}>{name}</p>
          <p style={{ fontSize: 11.5, color: theme.inkSoft, margin: "0 0 10px", wordBreak: "break-word" }}>{user.email}</p>
          <button onClick={async () => { await logout(); setOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "9px 0 0", border: "none",
            borderTop: `1px solid ${theme.line}`, background: "none", color: "#a3512c", fontSize: 12.5, fontWeight: 800, cursor: "pointer",
          }}>
            <LogOut size={14} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

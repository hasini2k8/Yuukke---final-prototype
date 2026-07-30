import React, { useState } from "react";
import { Type, Contrast, X } from "lucide-react";
import { theme } from "../theme";

const smallBtn = { width: 24, height: 24, borderRadius: 6, border: `1px solid ${theme.line}`, background: theme.cream, cursor: "pointer", fontWeight: 700, color: theme.ink };

export default function AccessibilityBar({ fontScale, setFontScale, highContrast, setHighContrast }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "fixed", bottom: 26, left: 26, zIndex: 90 }}>
      {open && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 18, marginBottom: 12, boxShadow: "0 14px 30px rgba(0,0,0,.18)", width: 220 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: theme.ink, marginBottom: 12 }}>Accessibility</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12.5, color: theme.inkSoft, display: "flex", alignItems: "center", gap: 6 }}><Type size={14} /> Text size</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button aria-label="Decrease text size" onClick={() => setFontScale((s) => Math.max(0.85, +(s - 0.1).toFixed(2)))} style={smallBtn}>−</button>
              <button aria-label="Increase text size" onClick={() => setFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))} style={smallBtn}>+</button>
            </div>
          </div>
          <div onClick={() => setHighContrast(!highContrast)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <span style={{ fontSize: 12.5, color: theme.inkSoft, display: "flex", alignItems: "center", gap: 6 }}><Contrast size={14} /> High contrast</span>
            <div style={{ width: 36, height: 20, borderRadius: 999, background: highContrast ? theme.wine : theme.line, padding: 2 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", transform: highContrast ? "translateX(16px)" : "translateX(0)", transition: "all .2s ease" }} />
            </div>
          </div>
          <p style={{ fontSize: 11, color: theme.inkSoft, marginTop: 12, lineHeight: 1.5 }}>
            Look for the mic icon to speak instead of type, and the speaker icon to hear assistant messages read aloud.
          </p>
        </div>
      )}
      <button aria-label="Open accessibility options" onClick={() => setOpen(!open)} style={{
        width: 52, height: 52, borderRadius: "50%", background: theme.wine, border: "none", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 20px rgba(0,0,0,.2)",
      }}>
        {open ? <X size={22} /> : <Contrast size={22} />}
      </button>
    </div>
  );
}

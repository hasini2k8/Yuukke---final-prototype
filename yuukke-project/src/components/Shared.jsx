import React from "react";
import { Loader2 } from "lucide-react";
import { theme } from "../theme";

export function GoogleFonts() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      @keyframes floaty { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-14px) rotate(2deg); } }
      @keyframes fadeUp { from { opacity:0; transform: translateY(18px);} to {opacity:1; transform: translateY(0);} }
      @keyframes popIn { from { opacity:0; transform: scale(.94);} to {opacity:1; transform: scale(1);} }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes cardIn { from { opacity:0; transform: translateY(14px) scale(.96);} to {opacity:1; transform: translateY(0) scale(1);} }
      @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(125,25,53,.4);} 50% { box-shadow: 0 0 0 8px rgba(125,25,53,0);} }
      ::selection { background: ${theme.gold}; color: ${theme.white}; }
      textarea:focus, input:focus { outline: 2px solid ${theme.wine}44; }
    `}</style>
  );
}

export function Logo({ size = 34, dark }) {
  const c1 = dark ? theme.white : theme.wine;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <circle cx="13" cy="14" r="9" fill={c1} opacity="0.55" />
        <path d="M27 4 C33 4 34 10 30 16 L21 34 C19 37 15 36 15 32 C15 29 17 27 18.5 24 L25 10 C26.5 6.5 24 4 27 4Z" fill={c1} />
      </svg>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: size * 0.62, color: dark ? theme.white : theme.ink, letterSpacing: -0.5 }}>
          Yuukke<sup style={{ fontSize: size * 0.22 }}>®</sup>
        </div>
        <div style={{ fontSize: size * 0.19, color: theme.wine, fontWeight: 600, marginTop: -2 }}>
          Buy Better <span style={{ color: theme.inkSoft }}>Live Better</span>
        </div>
      </div>
    </div>
  );
}

export function Pill({ children, active, outline, dark, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      border: outline ? `1.5px solid ${dark ? "rgba(255,255,255,.4)" : theme.wine}` : "none",
      background: active ? theme.wine : outline ? "transparent" : theme.wine,
      color: active ? theme.white : outline ? (dark ? theme.white : theme.wine) : theme.white,
      borderRadius: 999, padding: "9px 20px", fontSize: 13.5, fontWeight: 600,
      cursor: "pointer", whiteSpace: "nowrap", fontFamily: theme.fontBody,
      transition: "all .18s ease", display: "flex", alignItems: "center", gap: 6, ...style,
    }}>{children}</button>
  );
}

export function IconCircle({ children, onClick, label }) {
  return (
    <div onClick={onClick} role="button" aria-label={label} tabIndex={0} style={{
      width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${theme.line}`,
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: theme.ink,
    }}>{children}</div>
  );
}

export function Spinner({ size = 15, color = "#fff" }) {
  return <Loader2 size={size} color={color} style={{ animation: "spin .8s linear infinite" }} />;
}

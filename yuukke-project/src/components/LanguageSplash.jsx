import React from "react";
import { theme } from "../theme";
import { Logo } from "./Shared";
import { LANGUAGES } from "../lib/languages";

export default function LanguageSplash({ onSelect }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, background: theme.cream, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", overflowY: "auto",
    }}>
      <div style={{ marginBottom: 28 }}><Logo size={30} /></div>

      <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 30, color: theme.ink, textAlign: "center", margin: "0 0 6px" }}>
        CHOOSE YOUR LANGUAGE
      </h1>
      <p style={{ fontFamily: theme.fontDisplay, fontSize: 20, color: theme.wine, textAlign: "center", margin: "0 0 10px" }}>
        अपनी भाषा चुनिए
      </p>
      <p style={{ fontSize: 14, color: theme.inkSoft, textAlign: "center", maxWidth: 460, marginBottom: 34, fontFamily: theme.fontBody }}>
        Yuukke works with you in the language you're most comfortable with.
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14,
        maxWidth: 900, width: "100%",
      }}>
        {LANGUAGES.map((lang) => (
          <button key={lang.code} onClick={() => onSelect(lang)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 12px",
            background: theme.white, border: `1.5px solid ${theme.line}`, borderRadius: 16, cursor: "pointer",
            fontFamily: theme.fontBody,
          }}>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: theme.wineTint, color: theme.wine, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
              {lang.letter}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.ink }}>{lang.native}</span>
            <span style={{ fontSize: 11.5, color: theme.inkSoft }}>{lang.name}</span>
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11.5, color: theme.inkSoft, textAlign: "center", maxWidth: 480, marginTop: 30, lineHeight: 1.6 }}>
        Every page translates automatically as you browse — powered by AI, in real time.
      </p>
    </div>
  );
}

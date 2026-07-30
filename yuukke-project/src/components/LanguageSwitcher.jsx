import React, { useState } from "react";
import { Globe } from "lucide-react";
import { theme } from "../theme";
import { LANGUAGES } from "../lib/languages";
import { useI18n } from "./I18nContext";

export default function LanguageSwitcher() {
  const { language, setLanguage, translating } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <span onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: theme.ink, cursor: "pointer" }}>
        <Globe size={15} /> {language.code.toUpperCase()}{translating ? "…" : ""}
      </span>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
          <div style={{
            position: "absolute", top: 26, right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 14px 30px rgba(0,0,0,.18)",
            padding: 8, minWidth: 170, maxHeight: 320, overflowY: "auto", zIndex: 10,
          }}>
            {LANGUAGES.map((lang) => (
              <div
                key={lang.code}
                onClick={() => { setLanguage(lang); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                  background: language.code === lang.code ? theme.wineTint : "transparent",
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.wine, width: 18 }}>{lang.letter}</span>
                <span style={{ fontSize: 12.5, color: theme.ink }}>{lang.native}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

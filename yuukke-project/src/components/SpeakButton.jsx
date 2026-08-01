import React from "react";
import { Volume2 } from "lucide-react";
import { theme } from "../theme";
import { speak } from "../lib/speech";

// Reusable "read this aloud" trigger — extracted from AskYuukke.jsx's inline
// "Listen" control, now shared by every AI-generated result a seller might
// want to hear instead of read.
export default function SpeakButton({ text, lang, label = "Listen", color }) {
  if (!text) return null;
  return (
    <button type="button" aria-label={`Read this aloud`} onClick={() => speak(text, lang)} style={{
      display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer",
      color: color || theme.wine, padding: 0, fontSize: 11, fontWeight: 700,
    }}>
      <Volume2 size={12} /> {label}
    </button>
  );
}

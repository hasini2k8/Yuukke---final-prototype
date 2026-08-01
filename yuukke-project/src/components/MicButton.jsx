import React from "react";
import { Mic, MicOff } from "lucide-react";
import { theme } from "../theme";
import { useVoiceInput } from "../lib/speech";

// Reusable voice-input trigger — extracted from the near-identical inline
// mic buttons that used to live separately in ListProducts.jsx and
// AskYuukke.jsx, now shared by every seller-facing text field. `onResult`
// receives the transcript; the caller decides whether to append it to an
// existing value or replace one.
export default function MicButton({ lang, onResult, size = 34, label = "Speak instead of typing" }) {
  const { listening, toggle, supported } = useVoiceInput(lang, onResult);
  return (
    <button
      type="button"
      aria-label={listening ? "Stop voice input" : label}
      onClick={toggle}
      disabled={!supported}
      style={{
        width: size, height: size, borderRadius: "50%", border: "none", flexShrink: 0, cursor: supported ? "pointer" : "default",
        background: listening ? theme.wine : theme.creamDark, color: listening ? "#fff" : theme.inkSoft,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: listening ? "pulse 1.4s ease-in-out infinite" : "none", opacity: supported ? 1 : 0.4,
      }}
    >
      {listening ? <Mic size={Math.round(size * 0.44)} /> : <MicOff size={Math.round(size * 0.44)} />}
    </button>
  );
}

import React, { useState } from "react";
import { Wand2 } from "lucide-react";
import { theme } from "../theme";
import { Spinner } from "./Shared";
import MicButton from "./MicButton";

// Talk-or-type bar shared by the business platform's voice-driven onboarding
// steps (brand guidelines, logo, website) — mic dictation and typing both
// just fill the same instruction field, then submitting runs the same
// talk/analyse/execute loop (see src/hooks/useTalkAnalyseExecute.js) either
// way, so a seller never has to choose between "voice mode" and "type mode."
export default function TalkAnalyseExecuteBar({ placeholder, busy, error, onSubmit, speechLang, busyLabel = "Working…", idleLabel = "Go" }) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim() || busy) return;
    onSubmit(value.trim());
    setValue("");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
        <textarea
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${theme.line}`, fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream, resize: "vertical" }}
        />
        <MicButton size={34} lang={speechLang} onResult={(t) => setValue((v) => (v ? `${v} ${t}` : t))} />
      </div>
      {error && <p style={{ color: "#a32d2d", fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <button onClick={submit} disabled={busy || !value.trim()} style={{
        display: "flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none",
        borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: !value.trim() ? "default" : "pointer",
        opacity: !value.trim() ? 0.5 : 1,
      }}>
        {busy ? <Spinner size={13} /> : <Wand2 size={13} />} {busy ? busyLabel : idleLabel}
      </button>
    </div>
  );
}

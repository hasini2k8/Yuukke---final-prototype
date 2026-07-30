import React, { useRef, useState } from "react";
import { Upload, Volume2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { theme } from "../theme";
import { Spinner } from "./Shared";
import { askGeminiVisionJSON } from "../lib/ai";
import { speak } from "../lib/speech";

const SYSTEM_PROMPT =
  'You are an accessibility-focused document-reading assistant for Yuukke, helping small-business owners in India — many with limited reading confidence — understand documents they\'re uploading for seller verification. Look at the uploaded image of a document. Respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"documentLooksValid": boolean (does this look like a real, legible document, not a blank/blurry/unrelated photo?), "summary": string (2-3 short plain sentences reading out and explaining what the document says and shows, in the simplest possible words, as if reading it aloud to someone), "fields": array of up to 5 {"label": string, "value": string} pairs for key details you can read off it (e.g. name, number, date) — omit any you can\'t read clearly}';

// AI Document Reader — reads an uploaded ID/business document aloud in plain
// language and pulls out the key details, for sellers who find dense
// government paperwork hard to read or verify themselves.
export default function DocumentReaderRow({ label, speechLang }) {
  const [status, setStatus] = useState("idle"); // idle | analyzing | done | error
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStatus("analyzing");
    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = await askGeminiVisionJSON(
          SYSTEM_PROMPT,
          `This is a photo of the seller's "${label}" document. Read it and describe it as instructed.`,
          reader.result
        );
        setResult(data);
        setStatus("done");
      } catch (err) {
        setErrorMsg(err.message || "Couldn't read that document just now.");
        setStatus("error");
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ border: `1.5px dashed ${theme.line}`, borderRadius: 12, padding: "14px 18px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 13.5, color: theme.ink, fontWeight: 600 }}>{label}</span>
          {fileName && <p style={{ fontSize: 11.5, color: theme.inkSoft, margin: "3px 0 0" }}>{fileName}</p>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <button onClick={() => inputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: theme.wine, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <Upload size={14} /> {fileName ? "Replace" : "Upload"}
        </button>
      </div>

      {status === "analyzing" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: theme.inkSoft }}>
          <Spinner size={13} color={theme.wine} /> Reading your document…
        </div>
      )}

      {status === "error" && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 10, background: "#fdf0ea", borderRadius: 10, padding: 10 }}>
          <AlertTriangle size={13} color="#a3512c" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 11.5, color: "#7a3a1f", margin: 0, lineHeight: 1.5 }}>{errorMsg}</p>
        </div>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: 12, background: theme.wineTint, borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            {result.documentLooksValid ? <CheckCircle2 size={13} color="#2c6e49" /> : <AlertTriangle size={13} color="#a3512c" />}
            <span style={{ fontSize: 11, fontWeight: 700, color: result.documentLooksValid ? "#2c6e49" : "#a3512c" }}>
              {result.documentLooksValid ? "Looks like a valid document" : "Couldn't clearly read this — try a clearer photo"}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: theme.ink, margin: "0 0 8px", lineHeight: 1.6 }}>{result.summary}</p>
          <button onClick={() => speak(result.summary, speechLang)} style={{
            display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: theme.wine,
            fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: result.fields?.length ? 10 : 0,
          }}>
            <Volume2 size={12} /> Listen
          </button>
          {result.fields?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {result.fields.map((f, i) => (
                <span key={i} style={{ fontSize: 11, background: "#fff", borderRadius: 999, padding: "5px 10px", color: theme.ink }}>
                  <strong>{f.label}:</strong> {f.value}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React from "react";
import { Bot, Volume2, Sparkles, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { theme } from "../theme";
import { speak } from "../lib/speech";

export function ChatBubble({ msg, speechLang }) {
  if (msg.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ background: theme.wine, color: "#fff", padding: "10px 16px", borderRadius: "16px 16px 4px 16px", maxWidth: "78%", fontSize: 13.5, fontFamily: theme.fontBody, lineHeight: 1.5 }}>{msg.content}</div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12, gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: theme.wineTint, color: theme.wine, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Bot size={15} /></div>
      <div style={{ background: theme.white, border: `1px solid ${theme.line}`, padding: "10px 16px", borderRadius: "16px 16px 16px 4px", maxWidth: "78%" }}>
        <p style={{ margin: 0, fontSize: 13.5, fontFamily: theme.fontBody, color: theme.ink, lineHeight: 1.5 }}>{msg.content}</p>
        <button aria-label="Read this message aloud" onClick={() => speak(msg.content, speechLang)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.inkSoft, padding: 0, marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
          <Volume2 size={13} /> Listen
        </button>
      </div>
    </div>
  );
}

export function UniquenessCard({ msg, onConfirm, onDecline, onRetry, speechLang }) {
  return (
    <div style={{ background: theme.white, border: `1.5px solid ${theme.wineTint}`, borderRadius: 16, padding: 18, marginBottom: 14, animation: "cardIn .3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Sparkles size={15} color={theme.wine} />
        <span style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 0.5 }}>ORIGINALITY CHECK</span>
      </div>
      <p style={{ fontSize: 12.5, color: theme.inkSoft, marginBottom: 12, fontFamily: theme.fontBody }}>{msg.matchNote}</p>
      <div style={{ background: theme.cream, borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: theme.inkSoft, marginBottom: 6, letterSpacing: 0.5 }}>SUGGESTED REWRITE</p>
        <p style={{ fontSize: 13.5, color: theme.ink, margin: 0, fontFamily: theme.fontBody, lineHeight: 1.6 }}>{msg.rewritten}</p>
        <button aria-label="Read the suggested rewrite aloud" onClick={() => speak(msg.rewritten, speechLang)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.wine, padding: 0, marginTop: 8, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
          <Volume2 size={13} /> Listen to this
        </button>
      </div>
      {msg.status === "pending" ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onConfirm} style={{ display: "flex", alignItems: "center", gap: 6, background: theme.wine, color: "#fff", border: "none", borderRadius: 999, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}><ThumbsUp size={13} /> Use this</button>
          <button onClick={onDecline} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", color: theme.inkSoft, border: `1.5px solid ${theme.line}`, borderRadius: 999, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}><ThumbsDown size={13} /> Decline</button>
          <button onClick={onRetry} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", color: theme.wine, border: `1.5px solid ${theme.wine}`, borderRadius: 999, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}><RotateCcw size={13} /> Retry</button>
        </div>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 700, color: msg.status === "confirmed" ? "#2c6e49" : theme.inkSoft }}>
          {msg.status === "confirmed" ? "✓ Saved to your listing" : "Discarded — describe it differently above"}
        </span>
      )}
    </div>
  );
}

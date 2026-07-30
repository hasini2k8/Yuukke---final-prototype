import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Mic, MicOff, Volume2 } from "lucide-react";
import { theme } from "../theme";
import { Spinner } from "./Shared";
import { askGeminiChat } from "../lib/ai";
import { speak, useVoiceInput } from "../lib/speech";

const PAGE_NAMES = {
  dashboard: "the dashboard overview",
  listProducts: "the product listing page, where sellers describe products, add measurements, and generate 3D previews",
  customizeStore: "the storefront customization page",
};

function buildSystemPrompt(pageId, businessName) {
  const pageContext = PAGE_NAMES[pageId] || "the Yuukke seller dashboard";
  return `You are "Ask Yuukke", a patient, encouraging in-app helper for ${businessName || "a small-business owner"} selling on Yuukke, a marketplace for women-owned businesses in India. Many sellers are new to selling online, may have limited reading confidence, or prefer speaking over typing. The seller is currently on ${pageContext}. Answer their question simply, in short plain sentences (2-4 sentences max), avoiding jargon — explain any business/tech term you must use (like GST, MSME, SEO) in one plain phrase. Be warm and never make them feel behind.`;
}

export default function AskYuukke({ pageId, businessName, speechLang }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const { listening, toggle, supported } = useVoiceInput(speechLang, (t) => setInput((prev) => (prev ? prev + " " + t : t)));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(text) {
    const value = (text ?? input).trim();
    if (!value) return;
    const next = [...messages, { role: "user", content: value }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await askGeminiChat(buildSystemPrompt(pageId, businessName), next);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: e.message || "Sorry, I couldn't answer that just now — please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", bottom: 26, right: 26, zIndex: 90, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {open && (
        <div style={{
          width: 320, maxWidth: "calc(100vw - 40px)", height: 420, background: "#fff", borderRadius: 18,
          boxShadow: "0 18px 40px rgba(0,0,0,.22)", marginBottom: 12, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ background: theme.wine, color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} />
            <span style={{ fontWeight: 700, fontSize: 14, fontFamily: theme.fontDisplay }}>Ask Yuukke</span>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {messages.length === 0 && (
              <p style={{ fontSize: 12.5, color: theme.inkSoft, lineHeight: 1.6, margin: 0 }}>
                Ask me anything about selling on Yuukke — "How do I add a product?", "What does GST mean?" — by typing or by voice.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "85%", padding: "9px 13px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user" ? theme.wine : theme.cream, color: msg.role === "user" ? "#fff" : theme.ink,
                  fontSize: 13, lineHeight: 1.5, fontFamily: theme.fontBody,
                }}>
                  {msg.content}
                  {msg.role === "assistant" && (
                    <button aria-label="Read this message aloud" onClick={() => speak(msg.content, speechLang)} style={{
                      display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer",
                      color: theme.wine, padding: 0, marginTop: 6, fontSize: 10.5,
                    }}>
                      <Volume2 size={11} /> Listen
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: theme.inkSoft, fontSize: 12 }}>
                <Spinner size={12} color={theme.wine} /> Thinking…
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, padding: 10, borderTop: `1px solid ${theme.line}` }}>
            <button
              aria-label={listening ? "Stop voice input" : "Speak your question"}
              onClick={toggle}
              disabled={!supported}
              style={{
                width: 34, height: 34, borderRadius: "50%", border: "none", flexShrink: 0, cursor: supported ? "pointer" : "default",
                background: listening ? theme.wine : theme.creamDark, color: listening ? "#fff" : theme.inkSoft,
                display: "flex", alignItems: "center", justifyContent: "center", opacity: supported ? 1 : 0.4,
              }}
            >
              {listening ? <Mic size={15} /> : <MicOff size={15} />}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="Type your question…"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${theme.line}`, fontSize: 12.5, fontFamily: theme.fontBody, outline: "none" }}
            />
            <button aria-label="Send" onClick={() => handleSend()} style={{
              width: 34, height: 34, borderRadius: "50%", border: "none", background: theme.wine, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
            }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <button aria-label={open ? "Close Ask Yuukke" : "Open Ask Yuukke, your AI dashboard helper"} onClick={() => setOpen(!open)} style={{
        width: 54, height: 54, borderRadius: "50%", background: theme.wine, border: "none", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 20px rgba(0,0,0,.2)",
      }}>
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
    </div>
  );
}

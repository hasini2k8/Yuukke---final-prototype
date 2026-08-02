import React, { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { theme } from "../theme";
import { askOpenAIJSON, buildEditContext, BUSINESS_SITE_SYSTEM_PROMPT } from "../lib/ai";
import MicButton from "./MicButton";
import { Spinner } from "./Shared";

function productContext(products) {
  return products.map((product) => ({
    name: product.name,
    category: product.category,
    price: product.price,
    description: product.description,
  }));
}

export default function WebsiteGeneratorChat({ config, products, onChange, speechLang }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: products.length ? `I built this website from your ${products.length} listed product${products.length === 1 ? "" : "s"}. Tell me any change you want and I’ll update the preview.` : "List a product first, then I’ll build a website around it." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const instruction = input.trim();
    if (!instruction || busy || !products.length) return;
    setMessages((items) => [...items, { role: "user", content: instruction }]);
    setInput("");
    setBusy(true);
    try {
      const base = `Design only for these seller-owned product listings. Do not invent products, services, claims, testimonials, reviews, or categories not present here:\n${JSON.stringify(productContext(products))}`;
      const current = {
        businessName: config.businessName, tagline: config.tagline, about: config.about,
        accentColor: config.accentColor, heroStyle: config.heroStyle, sections: config.sections,
        category: config.category, isTech: config.isTech, logoPrompt: config.logoPrompt,
        websiteContent: config.websiteContent,
      };
      const result = await askOpenAIJSON(BUSINESS_SITE_SYSTEM_PROMPT, buildEditContext({ base, current, instruction }));
      onChange(result);
      setMessages((items) => [...items, { role: "assistant", content: "Done — the live preview has been updated. You can ask for another change." }]);
    } catch (error) {
      setMessages((items) => [...items, { role: "assistant", content: error.message || "I couldn’t update the website just now." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 18, marginBottom: 20 }}>
      <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 800, color: theme.ink, margin: "0 0 4px" }}><Sparkles size={14} color={theme.wine} /> Website design assistant</p>
      <p style={{ fontSize: 11.5, color: theme.inkSoft, margin: "0 0 10px" }}>Edit the hero, descriptions, sections, story, FAQs, contact details, policies, calls to action and newsletter by typing or speaking. Ask here if you want the AI to add, configure or remove a customer chatbot.</p>
      <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
        {messages.map((message, index) => <p key={index} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", padding: "8px 10px", borderRadius: 10, margin: 0, fontSize: 12, lineHeight: 1.45, background: message.role === "user" ? theme.wine : theme.cream, color: message.role === "user" ? "#fff" : theme.ink }}>{message.content}</p>)}
        {busy && <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: theme.inkSoft }}><Spinner size={11} /> Updating live preview…</span>}
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} disabled={!products.length} placeholder={products.length ? "e.g. add FAQs, enable the chatbot and make the hero more premium" : "List a product first"} style={{ flex: 1, minWidth: 0, padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${theme.line}`, background: theme.cream, fontFamily: theme.fontBody }} />
        <MicButton size={34} lang={speechLang} onResult={(text) => setInput((value) => value ? `${value} ${text}` : text)} />
        <button onClick={submit} disabled={!input.trim() || busy || !products.length} aria-label="Update website" style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: theme.wine, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", opacity: !input.trim() || !products.length ? .5 : 1 }}><Send size={13} /></button>
      </div>
    </div>
  );
}

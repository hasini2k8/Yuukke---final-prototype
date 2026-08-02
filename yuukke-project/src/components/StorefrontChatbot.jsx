import React, { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { theme } from "../theme";

export default function StorefrontChatbot({ site, products }) {
  const bot = site?.websiteContent?.chatbot || {};
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", content: bot.welcome || `Hello! Welcome to ${site?.businessName}. How can I help?` }]);
  if (bot.enabled === false) return null;

  function answer(question) {
    const q = question.toLowerCase();
    const product = products.find((item) => q.includes(String(item.name).toLowerCase()));
    if (product) return `${product.name} is ${product.inStock === false ? "currently unavailable" : "available"} for ₹${Number(product.price || 0).toLocaleString("en-IN")}. ${product.description || ""}`;
    if (/price|cost|product|sell|available|catalog/.test(q)) return products.length ? `We currently have ${products.map((item) => `${item.name} (₹${Number(item.price || 0).toLocaleString("en-IN")})`).join(", ")}.` : "New products will be added soon.";
    if (/contact|phone|email|whatsapp/.test(q)) { const c = site.websiteContent?.contact || {}; return [c.email && `Email: ${c.email}`, c.phone && `Phone: ${c.phone}`, c.whatsapp && `WhatsApp: ${c.whatsapp}`].filter(Boolean).join(" · ") || "Please use the contact section on this website to reach the business."; }
    const faq = (site.websiteContent?.faqs || []).find((item) => q.includes(String(item.question).toLowerCase().split(" ").find((word) => word.length > 5) || "__none__"));
    if (faq) return faq.answer;
    if (/about|story|business|who/.test(q)) return site.about || site.websiteContent?.story || `${site.businessName} is an independent business on Yuukke.`;
    return `I can help with products, prices, availability, the business story, FAQs and contact details. Try asking about ${products[0]?.name || "our products"}.`;
  }

  function submit(text = input) {
    const value = text.trim(); if (!value) return;
    setMessages((items) => [...items, { role: "user", content: value }, { role: "assistant", content: answer(value) }]); setInput("");
  }

  return <div style={{ position: "fixed", right: 22, bottom: 22, zIndex: 30, fontFamily: theme.fontBody }}>
    {open && <div style={{ width: "min(340px, calc(100vw - 32px))", height: 430, background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, boxShadow: "0 20px 60px rgba(35,16,23,.2)", marginBottom: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "13px 15px", background: site.accentColor || theme.wine, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong style={{ fontSize: 13 }}>{bot.name || `${site.businessName} assistant`}</strong><button onClick={() => setOpen(false)} aria-label="Close chat" style={{ border: 0, background: "none", color: "#fff", cursor: "pointer" }}><X size={16} /></button></div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>{messages.map((message, i) => <p key={i} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", margin: 0, padding: "8px 10px", borderRadius: 10, background: message.role === "user" ? (site.accentColor || theme.wine) : theme.cream, color: message.role === "user" ? "#fff" : theme.ink, fontSize: 12, lineHeight: 1.45 }}>{message.content}</p>)}</div>
      <div style={{ padding: "0 10px 8px", display: "flex", gap: 5, overflowX: "auto" }}>{(bot.quickQuestions || []).map((q) => <button key={q} onClick={() => submit(q)} style={{ whiteSpace: "nowrap", border: `1px solid ${theme.line}`, background: theme.white, borderRadius: 999, padding: "5px 8px", fontSize: 9.5, cursor: "pointer" }}>{q}</button>)}</div>
      <div style={{ padding: 10, borderTop: `1px solid ${theme.line}`, display: "flex", gap: 7 }}><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Ask about products or the business" style={{ flex: 1, minWidth: 0, border: `1px solid ${theme.line}`, borderRadius: 9, padding: "8px 9px", fontSize: 11.5 }} /><button onClick={() => submit()} aria-label="Send" style={{ width: 32, border: 0, borderRadius: 9, background: site.accentColor || theme.wine, color: "#fff" }}><Send size={13} /></button></div>
    </div>}
    <button onClick={() => setOpen((value) => !value)} aria-label="Open business chat" style={{ marginLeft: "auto", width: 52, height: 52, borderRadius: "50%", border: 0, background: site.accentColor || theme.wine, color: "#fff", boxShadow: "0 10px 28px rgba(35,16,23,.24)", display: "grid", placeItems: "center", cursor: "pointer" }}><MessageCircle size={22} /></button>
  </div>;
}

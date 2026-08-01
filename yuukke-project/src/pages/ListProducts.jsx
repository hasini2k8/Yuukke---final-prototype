import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Wand2, Plus, Trash2, Send, Ruler, RotateCcw, ImagePlus } from "lucide-react";
import { theme } from "../theme";
import DashboardShell from "../components/DashboardShell";
import { Spinner } from "../components/Shared";
import { ChatBubble, UniquenessCard, PhotoInsightCard } from "../components/ChatMessages";
import ProductDetailCard from "../components/ProductDetailCard";
import SplatViewer from "../components/SplatViewer";
import MicButton from "../components/MicButton";
import { askGeminiJSON, askGeminiChat, askGeminiVision, checkUniqueness, buildSurveyContext, PRODUCT_LISTING_SYSTEM_PROMPT, PRODUCT_UNIQUENESS_VISION_PROMPT, CHAT_SYSTEM_PROMPT } from "../lib/ai";
import { saveProduct } from "../lib/products";
import { isVoiceInputSupported } from "../lib/speech";
import { EN_STRINGS } from "../lib/strings";

function miniInput(bold) {
  return {
    width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${theme.line}`,
    fontSize: 13, fontFamily: theme.fontBody, outline: "none", marginBottom: 8, background: theme.cream,
    fontWeight: bold ? 700 : 400, color: theme.ink,
  };
}

export default function ListProductsPage({ goTo, products, setProducts, businessProfile, speechLang }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! Tell me a bit about what you make or sell — you can type, or tap the mic and speak." },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [savedDescriptions, setSavedDescriptions] = useState([]);
  const [draft, setDraft] = useState(products.length ? products : []);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [openDetailIndex, setOpenDetailIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const scrollRef = useRef(null);
  const imageInputRef = useRef(null);
  const voiceSupported = isVoiceInputSupported();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function runUniquenessCheck(text) {
    setCheckLoading(true);
    try {
      const result = await checkUniqueness(text);
      setMessages((m) => [...m, { role: "unique-check", original: text, matchNote: result.matchNote, rewritten: result.rewritten, status: "pending" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn't complete the originality check just now — you're welcome to keep your description as written, or try rephrasing it." }]);
    } finally {
      setCheckLoading(false);
    }
  }

  async function handleSend(text) {
    const value = text ?? input;
    if (!value.trim()) return;
    const userMsg = { role: "user", content: value };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    const hasBullets = /(^|\n)\s*([-*•]|\d+[.)])\s+/.test(value);
    if (hasBullets) {
      await runUniquenessCheck(value);
    } else {
      setChatLoading(true);
      try {
        const chatSystemPrompt = businessProfile ? `${CHAT_SYSTEM_PROMPT}\n\n${buildSurveyContext(businessProfile)}Use that context instead of asking them to repeat it.` : CHAT_SYSTEM_PROMPT;
        const reply = await askGeminiChat(chatSystemPrompt, nextMessages);
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
      } catch (e) {
        setMessages((m) => [...m, { role: "assistant", content: "Sorry, I had trouble responding just now — could you try again?" }]);
      } finally {
        setChatLoading(false);
      }
    }
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const id = crypto.randomUUID();
      setMessages((m) => [...m, { id, role: "photo-insight", image: dataUrl, text: "", status: "analyzing" }]);
      analyzePhoto(id, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function analyzePhoto(id, dataUrl) {
    try {
      const text = await askGeminiVision(
        PRODUCT_UNIQUENESS_VISION_PROMPT,
        "What makes this product stand out from a generic version of the same kind of item?",
        dataUrl
      );
      setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text, status: "pending" } : msg)));
    } catch (e) {
      setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text: e.message || "I couldn't take a look at that photo just now — feel free to try another.", status: "error" } : msg)));
    }
  }

  function saveInsight(id, text) {
    setSavedDescriptions((d) => [...d, text]);
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, status: "saved" } : msg)));
  }
  function dismissInsight(id) {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, status: "dismissed" } : msg)));
  }

  function updateCheckMsg(i, status) {
    setMessages((m) => m.map((msg, idx) => (idx === i ? { ...msg, status } : msg)));
  }
  function confirmCheck(i, msg) {
    updateCheckMsg(i, "confirmed");
    setSavedDescriptions((d) => [...d, msg.rewritten]);
    setMessages((m) => [...m, { role: "assistant", content: "Great — I've saved that description. Tell me about another product whenever you're ready." }]);
  }
  function declineCheck(i) {
    updateCheckMsg(i, "declined");
  }
  function retryCheck(i, msg) {
    setMessages((m) => m.filter((_, idx) => idx !== i));
    runUniquenessCheck(msg.original);
  }

  async function generateListings() {
    setGenLoading(true);
    setGenError("");
    try {
      const summary =
        buildSurveyContext(businessProfile) +
        messages.filter((m) => m.role === "user").map((m) => m.content).join("\n") +
        "\n\nConfirmed descriptions:\n" + savedDescriptions.join("\n");
      const result = await askGeminiJSON(PRODUCT_LISTING_SYSTEM_PROMPT, summary);
      setDraft(Array.isArray(result) ? result : []);
    } catch (e) {
      setGenError("Couldn't generate listings just now — you can add products manually below.");
      setDraft((d) => (d.length ? d : [{ name: "", category: "", price: 0, description: "" }]));
    } finally {
      setGenLoading(false);
    }
  }
  function updateItem(i, field, value) {
    setDraft((d) => d.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  }
  function removeItem(i) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
  }
  function addBlank() {
    setDraft((d) => [...d, { name: "", category: "", price: 0, description: "" }]);
  }
  function attachDetails(i, details) {
    setDraft((d) => d.map((item, idx) => (idx === i ? {
      ...item,
      name: details.name || item.name,
      dimensions: { length: details.length, width: details.width, height: details.height },
      imagePreview: details.imagePreview,
      modelUrl: details.modelUrl,
      previewColor: details.previewColor,
    } : item)));
    setOpenDetailIndex(null);
  }
  async function save() {
    // Draft items carried over from already-saved products (via the
    // `products` prop) already have a server `id` — only POST genuinely new
    // ones (from AI generation or "Add manually") so re-saving doesn't
    // create duplicate listings.
    const toCreate = draft.filter((p) => p.name.trim() && !p.id);
    setSaving(true);
    setSaveError("");
    try {
      const created = await Promise.all(toCreate.map((p) => saveProduct(p)));
      setProducts((prev) => [...prev, ...created]);
      goTo("dashboard");
    } catch (e) {
      setSaveError("Couldn't publish these to the marketplace catalog just now — you can try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell goTo={goTo} active="listProducts" businessName={null} t={(k) => EN_STRINGS[k] || k} speechLang={speechLang}>
      <span onClick={() => goTo("dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: theme.wine, cursor: "pointer", marginBottom: 18 }}>
        <ArrowLeft size={14} /> Back to dashboard
      </span>
      <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, color: theme.ink, margin: "0 0 8px" }}>List your products</h1>
      <p style={{ fontSize: 14.5, color: theme.inkSoft, marginBottom: 22, fontFamily: theme.fontBody, maxWidth: 560 }}>
        Chat with Yuukke's AI assistant about what you sell. Paste or say bullet points for a description and the assistant will reword it into unique, customer-worthy copy — or upload a photo and it'll point out what makes this piece stand out.
      </p>

      <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 20, marginBottom: 24 }}>
        <div ref={scrollRef} style={{ maxHeight: 380, overflowY: "auto", paddingRight: 6, marginBottom: 14 }}>
          {messages.map((msg, i) =>
            msg.role === "unique-check" ? (
              <UniquenessCard key={i} msg={msg} speechLang={speechLang} onConfirm={() => confirmCheck(i, msg)} onDecline={() => declineCheck(i)} onRetry={() => retryCheck(i, msg)} />
            ) : msg.role === "photo-insight" ? (
              <PhotoInsightCard key={msg.id} msg={msg} speechLang={speechLang} onSave={() => saveInsight(msg.id, msg.text)} onDismiss={() => dismissInsight(msg.id)} />
            ) : (
              <ChatBubble key={i} msg={msg} speechLang={speechLang} />
            )
          )}
          {(chatLoading || checkLoading) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.inkSoft, fontSize: 12.5, marginTop: 6 }}>
              <Spinner size={13} color={theme.wine} /> {checkLoading ? "Rewriting your description…" : "Thinking…"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} style={{ display: "none" }} />
          <button
            aria-label="Upload a product photo for unique selling points"
            onClick={() => imageInputRef.current?.click()}
            style={{
              width: 42, height: 42, borderRadius: "50%", border: "none", flexShrink: 0, cursor: "pointer",
              background: theme.creamDark, color: theme.inkSoft,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ImagePlus size={18} />
          </button>
          <MicButton size={42} lang={speechLang} onResult={(t) => setInput((prev) => (prev ? prev + " " + t : t))} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type, or tap the mic to speak…"
            rows={1}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${theme.line}`, fontFamily: theme.fontBody, fontSize: 13.5, outline: "none", resize: "none", background: theme.cream }}
          />
          <button aria-label="Send message" onClick={() => handleSend()} style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: theme.wine, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Send size={16} />
          </button>
        </div>
        {!voiceSupported && <p style={{ fontSize: 11, color: theme.inkSoft, marginTop: 8 }}>Voice input isn't supported in this browser — typing still works fully.</p>}
      </div>

      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <button onClick={generateListings} disabled={genLoading} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: theme.ink, color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 13.5, cursor: genLoading ? "default" : "pointer", opacity: genLoading ? 0.6 : 1 }}>
          {genLoading ? <Spinner /> : <Wand2 size={15} />} Turn this conversation into listings
        </button>
        {genError && <p style={{ color: "#a32d2d", fontSize: 12.5, marginTop: 10 }}>{genError}</p>}
      </div>

      {draft.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontFamily: theme.fontDisplay, fontSize: 18, color: theme.ink, margin: 0 }}>Draft listings ({draft.length})</h2>
            <button onClick={addBlank} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, color: theme.ink, cursor: "pointer" }}>
              <Plus size={13} /> Add manually
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 30 }}>
            {draft.map((item, i) => (
              <div key={i} style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} placeholder="Product name" style={miniInput(true)} />
                  <button aria-label="Remove product" onClick={() => removeItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.inkSoft, marginLeft: 8 }}><Trash2 size={15} /></button>
                </div>
                <input value={item.category} onChange={(e) => updateItem(i, "category", e.target.value)} placeholder="Category" style={miniInput()} />
                <input type="number" value={item.price} onChange={(e) => updateItem(i, "price", +e.target.value)} placeholder="Price (₹)" style={miniInput()} />
                <textarea value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Short description" rows={2} style={{ ...miniInput(), resize: "vertical" }} />

                {item.modelUrl ? (
                  <div style={{ marginTop: 4 }}>
                    <SplatViewer modelUrl={item.modelUrl} height={200} backgroundColor={item.previewColor || undefined} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontSize: 11.5, color: theme.inkSoft, fontFamily: theme.fontBody }}>
                        {item.dimensions?.length}" L × {item.dimensions?.width}" W × {item.dimensions?.height}" H
                      </span>
                      <button onClick={() => setOpenDetailIndex(i)} aria-label="Redo measurements and 3D preview" style={{ background: "none", border: "none", color: theme.wine, cursor: "pointer", padding: 4, display: "flex" }}>
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>
                ) : openDetailIndex === i ? (
                  <ProductDetailCard draft={item} onCancel={() => setOpenDetailIndex(null)} onComplete={(details) => attachDetails(i, details)} speechLang={speechLang} />
                ) : (
                  <>
                    {item.dimensions && (
                      <p style={{ fontSize: 11.5, color: theme.inkSoft, fontFamily: theme.fontBody, margin: "0 0 6px" }}>
                        Saved: {item.dimensions.length}" L × {item.dimensions.width}" W × {item.dimensions.height}" H — no 3D preview yet
                      </p>
                    )}
                    <button onClick={() => setOpenDetailIndex(i)} style={{
                      display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", marginTop: 4,
                      background: theme.wineTint, border: "none", borderRadius: 10, padding: "9px 12px", fontSize: 12, fontWeight: 700, color: theme.wine, cursor: "pointer",
                    }}>
                      <Ruler size={13} /> {item.dimensions ? "Retry 3D preview" : "Add measurements & 3D preview"}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <button onClick={save} disabled={saving} style={{
            display: "flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none", borderRadius: 12,
            padding: "13px 28px", fontWeight: 700, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
          }}>
            {saving && <Spinner />} {saving ? "Publishing…" : "Save listings & continue"}
          </button>
          {saveError && <p style={{ color: "#a32d2d", fontSize: 12.5, marginTop: 10 }}>{saveError}</p>}
        </>
      )}
    </DashboardShell>
  );
}

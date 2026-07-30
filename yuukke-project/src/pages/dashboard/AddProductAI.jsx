import React, { useState } from "react";
import { Sparkles, RotateCcw, Check, ArrowLeft } from "lucide-react";
import { theme } from "../../theme";
import { Spinner } from "../../components/Shared";
import ProductPreview from "./ProductPreview";

const CATEGORIES = ["Home Decor", "Fashion & Apparel", "Wellness", "Handicrafts", "Personal Care", "Kitchen & Dining", "Festive Gifting"];

async function draftListingWithAI({ category, description }) {
  const system = `You are Yuukke's product listing assistant, helping women entrepreneurs list handmade and small-business products on the Yuukke marketplace.
Given a product category and the seller's own rough description, respond with ONLY a raw JSON object (no markdown fences, no commentary) with exactly these keys:
{
  "title": short catchy product title (under 8 words),
  "description": 2-3 warm, plain-language sentences describing the product,
  "price": a reasonable price in INR as a plain number (no currency symbol, no commas),
  "tags": an array of 3-5 short lowercase tags,
  "layout": pick exactly one of "visual-grid", "story-driven", or "spec-sheet" — whichever best fits how this specific product should be displayed. Use "story-driven" for handcrafted/artisanal goods with a maker story, "spec-sheet" for wellness, personal care, or anything with measurable specs/ingredients, and "visual-grid" for fashion, decor, or visually-led products,
  "highlights": an array of exactly 3 short strings. If layout is "spec-sheet", format each as "Label: value" (e.g. "Weight: 250g"). Otherwise write them as short benefit phrases.
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: [
        { role: "user", content: `Category: ${category}\nSeller's description: ${description}` },
      ],
    }),
  });

  const data = await response.json();
  const textBlocks = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const cleaned = textBlocks.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!["visual-grid", "story-driven", "spec-sheet"].includes(parsed.layout)) parsed.layout = "visual-grid";
  return parsed;
}

export default function AddProductAI({ setView, onPublish }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error | preview
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setStatus("loading");
    setError("");
    try {
      const result = await draftListingWithAI({ category, description });
      setListing(result);
      setStatus("preview");
    } catch (e) {
      setError("Couldn't draft a listing just now. Try simplifying your description and generate again.");
      setStatus("error");
    }
  }

  function startOver() {
    setListing(null);
    setStatus("idle");
    setError("");
  }

  function publish() {
    onPublish(listing);
    setView("products");
  }

  if (status === "preview" && listing) {
    return (
      <div style={{ maxWidth: 620 }}>
        <button onClick={startOver} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: theme.wine, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 18 }}>
          <ArrowLeft size={14} /> Back to description
        </button>
        <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, margin: "0 0 6px" }}>YOUR AI-DRAFTED LISTING</p>
        <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 24, color: theme.ink, margin: "0 0 6px" }}>Here's how it will look</h1>
        <p style={{ fontSize: 13.5, color: theme.inkSoft, marginBottom: 22 }}>
          Yuukke picked the <strong style={{ color: theme.ink }}>{listing.layout.replace("-", " ")}</strong> layout for this kind of product. Publish it as is, or start over with a different description.
        </p>

        <ProductPreview listing={listing} />

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={startOver} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12,
            border: `1.5px solid ${theme.line}`, background: "#fff", color: theme.ink, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>
            <RotateCcw size={14} /> Start over
          </button>
          <button onClick={publish} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12,
            border: "none", background: theme.wine, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>
            <Check size={14} /> Publish listing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Sparkles size={17} color={theme.wine} />
        <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, margin: 0 }}>AI LISTING ASSISTANT</p>
      </div>
      <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 26, color: theme.ink, margin: "0 0 8px" }}>What are you selling?</h1>
      <p style={{ fontSize: 13.5, color: theme.inkSoft, marginBottom: 26, lineHeight: 1.6 }}>
        Pick a category and describe the product in your own words. Yuukke will draft the title, description, tags,
        price and choose a display layout suited to what you're selling.
      </p>

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{
          width: "100%", padding: "11px 14px", borderRadius: 11, border: `1.5px solid ${theme.line}`,
          fontSize: 13.5, fontFamily: theme.fontBody, background: theme.cream, outline: "none",
        }}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 18 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 7 }}>Describe it in a sentence or two</span>
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. hand-block-printed cotton table runners in indigo and rust, made by our weaving collective, roughly 180cm long"
          style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${theme.line}`, fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream, resize: "vertical" }} />
      </label>

      {status === "error" && <p style={{ color: "#a32d2d", fontSize: 12.5, margin: "0 0 12px" }}>{error}</p>}

      <button onClick={handleGenerate} disabled={status === "loading" || !description.trim()} style={{
        display: "flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none",
        borderRadius: 12, padding: "13px 24px", fontWeight: 700, fontSize: 14, cursor: !description.trim() ? "default" : "pointer",
        opacity: !description.trim() ? 0.5 : 1,
      }}>
        {status === "loading" ? <Spinner /> : <Sparkles size={15} />}
        {status === "loading" ? "Writing your listing…" : "Generate listing"}
      </button>
    </div>
  );
}

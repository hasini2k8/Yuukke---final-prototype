async function callClaude(body) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, ...body }),
  });
  const data = await response.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function callGemini(contents, system) {
  if (!GEMINI_API_KEY) {
    throw new Error("This AI feature isn't set up yet — add a Gemini API key (VITE_GEMINI_API_KEY) to enable it.");
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    body: JSON.stringify({ contents, system_instruction: { parts: [{ text: system }] } }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
  }
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

export async function askGeminiChat(system, history) {
  const contents = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  return callGemini(contents, system);
}

// Sends an image (data: URL) plus a prompt to Gemini's multimodal vision
// input. Used for the AI Document Reader and the photo accessibility check —
// both read visual content aloud in plain language for sellers who have
// trouble reading small print or seeing the image clearly themselves.
export async function askGeminiVision(system, prompt, imageDataUrl) {
  const match = imageDataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) throw new Error("Expected a base64 data URL image.");
  const [, mimeType, base64] = match;
  const contents = [{
    role: "user",
    parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }],
  }];
  return callGemini(contents, system);
}

export async function askGeminiVisionJSON(system, prompt, imageDataUrl) {
  const text = await askGeminiVision(system, prompt, imageDataUrl);
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export async function askClaudeJSON(system, user) {
  const text = await callClaude({ system, messages: [{ role: "user", content: user }] });
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export async function askClaudeChat(system, history) {
  const messages = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
  return (await callClaude({ system, messages })).trim();
}

// Web-search-backed originality check for bullet-point descriptions.
// Uses the Anthropic web_search tool so the model can look for matching
// phrasing already in use by other sellers before proposing a rewrite.
export async function checkUniqueness(text) {
  const raw = await callClaude({
    system:
      'You are an originality checker and copywriter for Yuukke, a marketplace for women-owned small businesses in India. The seller gave you a bullet-point product description. Search the web for similar or matching phrasing already used by other sellers. Then respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"isDuplicate": boolean, "matchNote": string (one short sentence — either what you found, or "No matching descriptions found online."), "rewritten": string (a warm, customer-facing paragraph rewritten from the bullets, unique wording, 2-3 sentences)}',
    messages: [{ role: "user", content: text }],
    tools: [{ type: "web_search_20250305", name: "web_search" }],
  });
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

export const PRODUCT_LISTING_SYSTEM_PROMPT =
  'You are a product listing assistant for Yuukke, a marketplace for women-owned small businesses in India. Based on the conversation, generate 3 to 6 realistic product listings. Respond with ONLY a JSON array, no markdown fences, no prose, in exactly this shape: [{"name": string, "category": string, "price": number (a realistic INR price), "description": string (one appealing, customer-worthy sentence)}]';

export const STOREFRONT_SYSTEM_PROMPT =
  'You are a storefront design assistant for Yuukke, a marketplace for women-owned small businesses. Given a seller\'s description of the look and feel they want, respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"accentColor": string (a hex code fitting the mood), "tagline": string (a catchy tagline under 10 words), "heroStyle": one of "minimal", "bold", "warm", "festive", "sections": an array picking 3 to 5 items from ["Hero banner","Best sellers","Categories","About the maker","Customer reviews","Instagram feed","Newsletter signup"]}';

export const CHAT_SYSTEM_PROMPT =
  "You are Yuukke's friendly product-listing assistant, speaking with a small-business owner in India who may be new to online selling. Keep replies short (2-4 sentences), warm, plain-spoken, and encouraging. Help them describe what they sell, and when they give you rough notes, offer to turn them into polished, customer-worthy copy. Ask at most one question at a time.";

export function buildTranslatePrompt(languageName) {
  return `Translate the values of the following JSON object into ${languageName} as spoken in India, for a small-business marketplace website's interface. Keep all keys exactly the same. Respond with ONLY the JSON object, no markdown fences, no prose.`;
}

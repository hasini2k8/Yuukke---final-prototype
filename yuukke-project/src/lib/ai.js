const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function callGemini(contents, system, tools) {
  if (!GEMINI_API_KEY) {
    throw new Error("This AI feature isn't set up yet — add a Gemini API key (VITE_GEMINI_API_KEY) to enable it.");
  }
  const body = { contents, system_instruction: { parts: [{ text: system }] } };
  if (tools) body.tools = tools;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
  }
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

// Generates an image (a logo, a social-post graphic) from a text prompt via
// OpenAI's image model, proxied through /api/openai/image so the billable
// OpenAI key stays server-side (unlike the Gemini key above, which is a
// VITE_-exposed client-side key — an existing precedent for the text calls,
// but not one worth repeating for a second paid key). Returns a data: URL,
// matching the convention already used for uploaded photos elsewhere in the
// app (ProductDetailCard).
export async function generateImage(prompt) {
  const response = await fetch("/api/openai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.dataUrl) {
    throw new Error(data?.message || `Image generation failed (${response.status})`);
  }
  return data.dataUrl;
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

export async function askGeminiJSON(system, prompt) {
  const text = await callGemini([{ role: "user", parts: [{ text: prompt }] }], system);
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// Rewrites a bullet-point product description into unique, customer-facing
// copy. (Google Search grounding was tried here but Gemini's grounding tool
// needs a billed API key and 429s on the free tier, so this checks phrasing
// against the model's own judgment rather than a live web search.)
export async function checkUniqueness(text) {
  const system =
    'You are a copywriter for Yuukke, a marketplace for small businesses in India. The seller gave you a bullet-point product description. Respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"isDuplicate": boolean (true only if the bullets read like generic, overused marketplace boilerplate), "matchNote": string (one short sentence about the phrasing), "rewritten": string (a warm, customer-facing paragraph rewritten from the bullets, unique wording, 2-3 sentences)}';
  const raw = await callGemini([{ role: "user", parts: [{ text }] }], system);
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

export const PRODUCT_LISTING_SYSTEM_PROMPT =
  'You are a product listing assistant for Yuukke, a marketplace for small businesses in India. Based on the conversation, generate 3 to 6 realistic product listings. Respond with ONLY a JSON array, no markdown fences, no prose, in exactly this shape: [{"name": string, "category": string, "price": number (a realistic INR price), "description": string (one appealing, customer-worthy sentence)}]';

// Drives the "Customize storefront" page's AI generation — beyond the
// original theme fields (accentColor/tagline/heroStyle/sections) this also
// invents a business identity (name, about blurb, category) and a prompt
// for a separate image-generation call to design the business's logo.
export const BUSINESS_SITE_SYSTEM_PROMPT =
  'You are a brand and storefront design assistant for Yuukke, a marketplace for small businesses in India. Given a seller\'s description of the look and feel they want (and what they sell, if mentioned), respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"businessName": string (a warm, plausible small-business name under 4 words, not generic like "My Store"), "tagline": string (a catchy tagline under 10 words), "about": string (2-3 warm, customer-facing sentences about the business, written as if by the owner), "accentColor": string (a hex code fitting the mood), "heroStyle": one of "minimal", "bold", "warm", "festive", "sections": an array picking 3 to 5 items from ["Hero banner","Best sellers","Categories","About the maker","Customer reviews","Instagram feed","Newsletter signup"], "category": string (a short product category like "Home Decor", "Fashion & Apparel", "Tech Accessories"), "isTech": boolean (true only if the business genuinely sells technology products/services), "logoPrompt": string (a vivid, concrete visual description for an AI image generator to design a simple, flat, modern logo mark for this business — describe motifs, colors, and style, not text)}';

// Drives the Content Calendar's "Generate post" button — one theme, one
// generated image, but a caption tailored to each connected platform's own
// tone, so a single click can publish everywhere at once instead of
// repeating the process per platform.
export const MULTI_PLATFORM_POST_SYSTEM_PROMPT =
  'You are a social media assistant for Yuukke, a marketplace for small businesses in India. Given the business\'s name, tagline, category, a short theme the seller gave you for this post, and a list of target platforms, respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"captions": object mapping each given platform name to a warm, on-brand caption suited to that platform\'s own tone (1-3 sentences; Instagram and Pinterest may include 2-4 relevant hashtags; LinkedIn should read as a short professional update with no hashtags), "imagePrompt": string (one vivid, concrete visual description for an AI image generator to create a single graphic shared across all the platforms — describe the scene, mood, and colors, matching the business\'s branding)}';

// Drives the Brand workbench's "Generate guidelines" button — a structured
// reference document the seller can keep coming back to, built from the
// business identity already generated on the Storefront tab.
export const BRAND_GUIDELINES_SYSTEM_PROMPT =
  'You are a brand consultant for Yuukke, a marketplace for small businesses in India. Given a business\'s name, tagline, about blurb, category, and accent color, respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"palette": array of 4-5 objects {"hex": string, "name": string (a warm, evocative color name, not just "blue"), "usage": string (one short phrase on where to use it, e.g. "backgrounds and packaging")} (the given accent color should be one of them), "fonts": {"heading": string (a real, common Google Font name fitting the mood), "body": string (a real, common Google Font name that pairs well), "pairingNote": string (one short sentence on why they work together)}, "toneOfVoice": string (2-3 sentences describing how this business should sound when writing captions, listings, and replies to customers), "dos": array of 3-5 short, concrete phrases, "donts": array of 3-5 short, concrete phrases}';

// Builds the prompt for the Brand workbench's mascot/character generator —
// reuses generateImage (OpenAI) from this file, same as the logo and social
// post images. seedDescription is the seller's own words if they gave any;
// otherwise falls back to inventing something fitting from the business
// identity alone.
export function buildCharacterPrompt({ businessName, category, accentColor, seedDescription }) {
  const subject = seedDescription?.trim()
    || `a friendly mascot character that fits a small business called "${businessName || "this business"}" in the ${category || "handmade goods"} space`;
  return `A cute, simple, flat-illustration mascot character: ${subject}. Warm and approachable, rounded shapes, minimal detail, plain solid background, primary color ${accentColor || "#7d1935"}, no text, single character centered in frame.`;
}

export const CHAT_SYSTEM_PROMPT =
  "You are Yuukke's friendly product-listing assistant, speaking with a small-business owner in India who may be new to online selling. Keep replies short (2-4 sentences), warm, plain-spoken, and encouraging. Help them describe what they sell, and when they give you rough notes, offer to turn them into polished, customer-worthy copy. Ask at most one question at a time.";

// Note: this looks at the photo only — there's no live web search available
// (Gemini's Google Search grounding needs a billed API key; see checkUniqueness
// above), so it can't literally compare against other companies' real listings.
// It calls out concrete, visible details a generic/mass-produced version of
// the same product likely wouldn't have, framed as selling points for the listing.
export const PRODUCT_UNIQUENESS_VISION_PROMPT =
  "You are a product analyst for Yuukke, a marketplace for small businesses in India. Look closely at this product photo and point out what specifically sets it apart from a generic, mass-produced version of the same kind of product — unusual color combinations, visible hand-craftsmanship or tool marks, motifs, construction details, materials, or finishing touches. Name the actual details you can see; avoid generic marketing phrases like 'high quality' or 'unique design' with nothing concrete behind them. Write 2-4 short, plain-spoken sentences a seller could use as talking points in their listing. If the photo is too unclear to make out real detail, say so plainly instead of guessing. Respond with plain text only — no markdown, no JSON.";

// Turns the seller's post-signup "what do you want to sell" survey answers
// into a short block of grounding context to prepend before whatever the
// seller types into the storefront-generator or product-listing chat — so
// AI generation across the app reflects what they actually told us, not
// just this one message.
export function buildSurveyContext(profile) {
  if (!profile || (!profile.sellsWhat && !profile.category)) return "";
  const lines = [
    profile.sellsWhat && `Sells: ${profile.sellsWhat}`,
    profile.category && `Category: ${profile.category}`,
    profile.targetCustomers && `Target customers: ${profile.targetCustomers}`,
    profile.priceRange && `Price range: ${profile.priceRange}`,
    profile.styleMood && `Preferred style/mood: ${profile.styleMood}`,
  ].filter(Boolean);
  return `The seller told us this about their business when they signed up:\n${lines.join("\n")}\n\n`;
}

export function buildTranslatePrompt(languageName) {
  return `Translate the values of the following JSON object into ${languageName} as spoken in India, for a small-business marketplace website's interface. Keep all keys exactly the same. Respond with ONLY the JSON object, no markdown fences, no prose.`;
}

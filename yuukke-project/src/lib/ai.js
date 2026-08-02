// Every text AI call in this app goes through OpenAI's Chat Completions API,
// proxied through /api/openai/chat (server/openaiText.js) so the billable
// key stays server-side — unlike the Gemini key this replaced, which was a
// VITE_-exposed client-side key.
async function callOpenAI(system, messages, { json } = {}) {
  const response = await fetch("/api/openai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, json: !!json }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `AI request failed (${response.status})`);
  }
  return (data?.text || "").trim();
}

// Generates an image (a logo, a social-post graphic) from a text prompt via
// OpenAI's image model, proxied through /api/openai/image so the billable
// key stays server-side, same as callOpenAI above. Returns a data: URL,
// matching the convention already used for uploaded photos elsewhere in the
// app (ProductDetailCard).
export async function generateImage(prompt, referenceImageDataUrl = "") {
  const response = await fetch("/api/openai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, referenceImageDataUrl }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.dataUrl) {
    throw new Error(data?.message || `Image generation failed (${response.status})`);
  }
  return data.dataUrl;
}

export async function askOpenAIChat(system, history) {
  const messages = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
  return callOpenAI(system, messages);
}

// Sends an image (data: URL) plus a prompt to OpenAI's vision input. Used
// for the AI Document Reader and the photo accessibility check — both read
// visual content aloud in plain language for sellers who have trouble
// reading small print or seeing the image clearly themselves.
export async function askOpenAIVision(system, prompt, imageDataUrl) {
  const messages = [{
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: imageDataUrl } },
    ],
  }];
  return callOpenAI(system, messages);
}

export async function askOpenAIVisionJSON(system, prompt, imageDataUrl) {
  const text = await askOpenAIVision(system, prompt, imageDataUrl);
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export async function askOpenAIJSON(system, prompt) {
  const text = await callOpenAI(system, [{ role: "user", content: prompt }], { json: true });
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// Rewrites a bullet-point product description into unique, customer-facing
// copy. (There's no live web search available here, so this checks phrasing
// against the model's own judgment rather than a live web search.)
export async function checkUniqueness(text) {
  const system =
    'You are a copywriter for Yuukke, a marketplace for small businesses in India. The seller gave you a bullet-point product description. Respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"isDuplicate": boolean (true only if the bullets read like generic, overused marketplace boilerplate), "matchNote": string (one short sentence about the phrasing), "rewritten": string (a warm, customer-facing paragraph rewritten from the bullets, unique wording, 2-3 sentences)}';
  const raw = await callOpenAI(system, [{ role: "user", content: text }], { json: true });
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// The `listings` wrapper (rather than a bare top-level array) is required
// by OpenAI's JSON response mode, which only ever returns a JSON object at
// the root — askOpenAIJSON's caller unwraps `result.listings`.
export const PRODUCT_LISTING_SYSTEM_PROMPT =
  'You are a product listing assistant for Yuukke, a marketplace for small businesses in India. Based on the conversation, generate realistic product listings — one per distinct product actually described (at least 1; up to 6). Respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"listings": [{"name": string, "category": string, "price": number (a realistic INR price), "description": string (one appealing, customer-worthy sentence)}]}';

// Drives the "Customize storefront" page's AI generation — beyond the
// original theme fields (accentColor/tagline/heroStyle/sections) this also
// invents a business identity (name, about blurb, category) and a prompt
// for a separate image-generation call to design the business's logo.
export const BUSINESS_SITE_SYSTEM_PROMPT =
  'You are a brand and full business-website design assistant for Yuukke, a marketplace for small businesses in India. Use only facts and products supplied by the seller; never invent reviews, awards, certifications, addresses, contact details, or guarantees. Respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"businessName": string, "tagline": string, "about": string (rich 3-5 sentence business description written as the owner), "accentColor": valid hex string, "heroStyle": one of "minimal", "bold", "warm", "festive", "sections": array choosing from ["Hero banner","Featured products","Categories","About the business","Our story","Why choose us","FAQ","Contact","Instagram feed","Newsletter signup","Customer chatbot"], "category": string, "isTech": boolean, "logoPrompt": string, "websiteContent": {"announcement": string, "heroHeadline": string, "heroSubheadline": string, "primaryCTA": string, "secondaryCTA": string, "mission": string, "story": string, "featuredTitle": string, "trustPoints": array of 3 short strings grounded in seller facts, "faqs": array of 4 objects {"question": string, "answer": string} answerable from supplied facts, "contact": {"email": string (preserve supplied value or blank), "phone": string (preserve supplied value or blank), "whatsapp": string (preserve supplied value or blank)}, "policies": {"shipping": string, "returns": string, "customOrders": string} using cautious non-guaranteed wording, "newsletterHeading": string, "newsletterText": string, "chatbot": {"enabled": boolean, "name": string, "welcome": string, "quickQuestions": array of 3 short strings}}}. For edits, preserve every current field unless the seller asks to change it.';

// Drives the storefront's post-generation chat (PostGeneratorChat.jsx) — one
// theme, but a genuinely distinct caption AND image per platform (not a
// shared graphic with a reworded caption), since Instagram and LinkedIn
// audiences expect different things: Instagram rewards a scroll-stopping,
// personality-driven visual and caption; LinkedIn rewards a polished,
// business-credible one. A single click still drafts both at once instead
// of repeating the process per platform.
export const MULTI_PLATFORM_POST_SYSTEM_PROMPT =
  'You are a social media assistant for Yuukke, a marketplace for small businesses in India. Given the business\'s name, tagline, category, a short theme the seller gave you for this post, and a list of target platforms, respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"captions": object mapping each given platform name to a caption written specifically for that platform\'s audience and tone (1-3 sentences) — for "instagram": upbeat, fun, and genuinely interesting to scroll past on, conversational voice, emoji welcome, end with 2-4 relevant hashtags; for "linkedin": polished and professional, reads like a short business update a client or partner would take seriously, no emoji, no hashtags, "imagePrompts": object mapping each given platform name to its OWN vivid, concrete visual description for an AI image generator — these must describe genuinely different images, not the same scene reworded: for "instagram" describe an eye-catching, lifestyle-style shot with warmth and personality (close-up detail, candid framing, or a styled flat-lay); for "linkedin" describe a clean, professional, business-appropriate shot (well-lit product or workspace shot, minimal clutter, neutral background) — both must still match the business\'s own branding/colors/mood}';

// Drives the calendar's "move a post" chatbot — resolves a spoken/typed
// instruction like "move post 3 to Friday" against today's real IST date
// and the currently visible numbered posts, so the frontend can just apply
// {postNumber, newDate} directly rather than parsing dates itself.
export const MOVE_POST_SYSTEM_PROMPT =
  'You are a scheduling assistant for Yuukke, a marketplace for small businesses in India. Given today\'s IST date, a numbered list of a seller\'s draft social posts with current dates and times, and an instruction about moving one post, respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"postNumber": integer (the numbered post), "newDate": string (resolved YYYY-MM-DD, interpreting weekdays relative to today), "newTime": string (resolved 24-hour HH:mm in IST)}. If the seller changes only the date, preserve that post\'s current time. If they change only the time, preserve its current date. Understand natural expressions such as "4 PM", "half past four", "tomorrow morning", and "next Friday at 16:30". Make the best reasonable interpretation.';

// Drives the AI Marketing tab's per-product platform suggestion — a small,
// cheap call so a seller with only Instagram or only LinkedIn connected
// (or both) gets a quick read on which fits a given product best, instead
// of guessing.
export const PLATFORM_SUGGESTION_SYSTEM_PROMPT =
  'You are a social media strategist for Yuukke, a marketplace for small businesses in India. Given one product\'s name, category, description, and a list of platforms the seller has connected, respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"platform": one of the given platform names (whichever fits this specific product best), "reason": string (one short, concrete sentence on why — e.g. visual/handmade products suit Instagram, B2B/professional or technical products suit LinkedIn)}. If only one platform is given, still return it with a short reason.';

// Drives the Brand workbench's "Generate guidelines" button — a structured
// reference document the seller can keep coming back to, built from the
// business identity already generated on the Storefront tab.
export const BRAND_GUIDELINES_SYSTEM_PROMPT =
  'You are a practical brand and marketing consultant for Yuukke, a marketplace for small businesses in India. Given a business identity, respond with ONLY JSON, no markdown fences, no prose, in exactly this shape: {"palette": array of 4-5 objects {"hex": string, "name": string, "usage": string}, "fonts": {"heading": string, "body": string, "pairingNote": string}, "toneOfVoice": string, "audience": {"primary": string, "needs": array of 3 strings, "buyingTriggers": array of 3 strings}, "positioning": string, "keyMessages": array of 3-5 strings, "contentPillars": array of 4 objects {"name": string, "purpose": string, "examples": array of 2 strings}, "captionFormula": {"structure": string, "example": string}, "hashtagGroups": array of 3 objects {"name": string, "tags": array of 5-8 strings}, "photographyStyle": string, "posterRules": array of 4 short strings, "campaignIdeas": array of 4 objects {"name": string, "idea": string, "callToAction": string}, "dos": array of 4-6 strings, "donts": array of 4-6 strings}. Use real common Google Font names, valid hex colors, actionable plain language, and never invent certifications or claims.';

// Wraps a base context + the current AI-generated value + a free-form
// instruction into one prompt, for the business platform's voice-driven
// "talk → analyse → execute" edit loop (src/hooks/useTalkAnalyseExecute.js).
// Every step reuses its own existing *_SYSTEM_PROMPT (same JSON shape) —
// this just tells the model to treat the call as an edit of what's already
// there instead of generating from scratch.
export function buildEditContext({ base, current, instruction }) {
  const currentBlock = current ? `Current value (JSON):\n${JSON.stringify(current)}\n\n` : "";
  const instructionBlock = instruction ? `The seller's instruction: "${instruction}"\n\n` : "";
  const closing = current
    ? "Return the full updated JSON in the same shape, changing only what the instruction asks for and keeping everything else the same."
    : "Nothing exists yet — invent a strong, sensible default a seller could refine later, even with minimal information to go on.";
  return `${base}\n\n${currentBlock}${instructionBlock}${closing}`;
}

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
  "You are Yuukke's friendly product-listing assistant, speaking with a small-business owner in India who may be new to online selling. Keep replies short (2-4 sentences), warm, plain-spoken, and encouraging. Help them describe what they sell, ask for price or category when missing, and explicitly ask them to upload one clear product photo using the image button before the listing is complete. When they give rough notes, offer polished customer-worthy copy. Ask at most one question at a time.";

// Note: this looks at the photo only — there's no live web search available,
// so it can't literally compare against other companies' real listings. It
// calls out concrete, visible details a generic/mass-produced version of
// the same product likely wouldn't have, framed as selling points for the listing.
export const PRODUCT_UNIQUENESS_VISION_PROMPT =
  "You are a product analyst for Yuukke, a marketplace for small businesses in India. Look closely at this product photo and point out what specifically sets it apart from a generic, mass-produced version of the same kind of product — unusual color combinations, visible hand-craftsmanship or tool marks, motifs, construction details, materials, or finishing touches. Name the actual details you can see; avoid generic marketing phrases like 'high quality' or 'unique design' with nothing concrete behind them. Write 2-4 short, plain-spoken sentences a seller could use as talking points in their listing. If the photo is too unclear to make out real detail, say so plainly instead of guessing. Respond with plain text only — no markdown, no JSON.";


// Shared forwarding logic used by both the local dev proxy (server/index.js)
// and the Vercel serverless function (api/openai/[...path].js), mirroring
// server/openaiProxy.js's pattern for images. Replaces every text AI call in
// this app (previously Google Gemini, called directly from the browser with
// a client-exposed VITE_GEMINI_API_KEY) — the OpenAI key is billable and
// must stay server-side, same as the image proxy.
const OPENAI_TEXT_MODEL = "gpt-4o-mini";

function jsonResult(status, data) {
  return { status, contentType: "application/json", text: JSON.stringify(data) };
}

// `messages` is an array of {role, content} — content is either a plain
// string or (for vision calls) an array of OpenAI content parts
// ({type: "text"|"image_url", ...}), built by the caller in src/lib/ai.js.
// `json: true` requests JSON-mode output for the JSON-shaped prompts.
export async function askOpenAIText({ system, messages, json }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return jsonResult(500, { message: "Server is missing OPENAI_API_KEY." });

  const body = {
    model: OPENAI_TEXT_MODEL,
    messages: [{ role: "system", content: system }, ...(messages || [])],
  };
  if (json) body.response_format = { type: "json_object" };

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return jsonResult(502, { message: `Couldn't reach OpenAI: ${e.message}` });
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data) {
    return jsonResult(upstream.status || 502, { message: data?.error?.message || `OpenAI request failed (${upstream.status})` });
  }
  const text = data?.choices?.[0]?.message?.content || "";
  return jsonResult(200, { text });
}

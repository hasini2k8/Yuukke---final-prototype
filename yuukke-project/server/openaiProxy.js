// Shared forwarding logic used by both the local dev proxy (server/index.js)
// and the Vercel serverless function (api/openai/[...path].js), so the two
// environments stay in sync. The OpenAI key is billable and must stay
// server-side — never sent to the browser. See server/openaiText.js for the
// text-generation equivalent.
const OPENAI_IMAGE_MODEL = "gpt-image-1";

function jsonResult(status, data) {
  return { status, contentType: "application/json", text: JSON.stringify(data) };
}

// gpt-image-1 always returns base64 image data in data[0].b64_json — it
// doesn't accept (or need) a response_format param the way dall-e-2/3 do.
export async function generateOpenAIImage(prompt, referenceImageDataUrl = "") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return jsonResult(500, { message: "Server is missing OPENAI_API_KEY." });

  let upstream;
  try {
    const match = referenceImageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/s);
    if (match) {
      const form = new FormData();
      form.append("model", OPENAI_IMAGE_MODEL);
      form.append("prompt", prompt);
      form.append("n", "1");
      form.append("size", "1024x1024");
      form.append("quality", "medium");
      form.append("image[]", new Blob([Buffer.from(match[2], "base64")], { type: match[1] }), `product.${match[1].split("/")[1] || "png"}`);
      upstream = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form,
      });
    } else {
      upstream = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: OPENAI_IMAGE_MODEL, prompt, n: 1, size: "1024x1024", quality: "medium" }),
      });
    }
  } catch (e) {
    return jsonResult(502, { message: `Couldn't reach OpenAI: ${e.message}` });
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data) {
    return jsonResult(upstream.status || 502, { message: data?.error?.message || `OpenAI request failed (${upstream.status})` });
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return jsonResult(502, { message: "OpenAI didn't return an image — try a different description." });

  return jsonResult(200, { dataUrl: `data:image/png;base64,${b64}` });
}

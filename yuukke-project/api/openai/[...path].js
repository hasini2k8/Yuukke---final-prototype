// Vercel serverless function — production equivalent of server/index.js's
// OpenAI routes (used for local dev). Both share the forwarding logic in
// server/openaiProxy.js and server/openaiText.js so the two stay in sync.
import { generateOpenAIImage } from "../../server/openaiProxy.js";
import { askOpenAIText } from "../../server/openaiText.js";

export default async function handler(req, res) {
  const segments = req.query.path;
  const path = Array.isArray(segments) ? segments.join("/") : segments || "";

  if (req.method === "POST" && path === "image") {
    const { prompt, referenceImageDataUrl } = req.body || {};
    const result = await generateOpenAIImage(prompt, referenceImageDataUrl);
    res.status(result.status);
    res.setHeader("Content-Type", result.contentType);
    res.send(result.text);
    return;
  }

  if (req.method === "POST" && path === "chat") {
    const { system, messages, json } = req.body || {};
    const result = await askOpenAIText({ system, messages, json });
    res.status(result.status);
    res.setHeader("Content-Type", result.contentType);
    res.send(result.text);
    return;
  }

  res.status(404).json({ message: "Not found" });
}

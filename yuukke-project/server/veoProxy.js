// Thin wrapper around Google's video model (Gemini API's Interactions API,
// "gemini-omni-flash-preview") — turns a post's own generated image into a
// short, genuinely AI-animated video reel, instead of the old
// json2videoProxy.js's image+caption-overlay compositing trick. The image
// is sent directly as inline base64 data, so — unlike that old path —
// this needs no publicly reachable URL and works from local dev too, not
// just once deployed.
//
// (This file used to target the older Veo predictLongRunning REST
// endpoint directly, but that model rejected inline image data for this
// account — "`inlineData` isn't supported by this model" — so this now
// follows Google's current Interactions API docs instead:
// https://ai.google.dev/gemini-api/docs/omni)
//
// This app has no background job queue, so unlike a production setup this
// polls Google for the render's completion inside the same request that
// started it (server/index.js's POST /api/posts/:id/video) — matches the
// simplicity level of this app's other proxies. A render that isn't done
// within MAX_WAIT_MS fails with a "try again" error rather than hanging
// the request forever.
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-omni-flash-preview";
const POLL_INTERVAL_MS = 5_000;
// Renders usually land well under this, but genuinely generative video can
// take a few minutes.
const MAX_WAIT_MS = 6 * 60_000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} isn't set — video generation hasn't been configured yet. Add it to .env to enable this.`);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  const [, mimeType, data] = match;
  return { mimeType, data };
}

// `imageDataUrl` is the post's own already-generated image (a data: URL,
// same convention as everywhere else in this app) — the model animates it
// directly rather than needing a hosted URL. `caption`/`topic` steer what
// the motion in the video should look like; the model draws no text into
// the frame itself, so unlike the old JSON2Video path the caption never
// appears on-screen — it's purely creative direction for the animation.
export async function createVideo({ imageDataUrl, caption, topic }) {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const image = parseDataUrl(imageDataUrl);
  if (!image) throw new Error("No image to animate for that post.");

  const prompt = `${topic || caption || "a short social media clip"} — bring this product photo to life with subtle, natural motion (a gentle camera pan or push-in, soft ambient movement) that matches its mood. In a single continuous shot, no scene cuts. No on-screen text, no dialogue.`;

  let createRes;
  try {
    createRes = await fetch(`${BASE_URL}/interactions?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { type: "image", data: image.data, mime_type: image.mimeType },
          { type: "text", text: prompt },
        ],
        // uri delivery avoids the payload-size limit generated video hits
        // if returned inline; background/stream false keeps this a single
        // synchronous request instead of a separately-polled job.
        response_format: { type: "video", delivery: "uri", aspect_ratio: "9:16" },
        generation_config: { video_config: { task: "image_to_video" } },
        background: false,
        stream: false,
      }),
    });
  } catch (e) {
    throw new Error(`Couldn't reach Google's video model: ${e.message}`);
  }
  const createData = await createRes.json().catch(() => null);
  if (!createRes.ok) {
    throw new Error(createData?.error?.message || `Couldn't start that render (${createRes.status}).`);
  }

  const videoContent = createData?.steps
    ?.find((s) => s.type === "model_output")
    ?.content?.find((c) => c.type === "video");
  if (!videoContent) throw new Error("That didn't return a video — try again.");

  // Already came back inline (small enough to skip file processing).
  if (videoContent.data) {
    return { videoUrl: `data:${videoContent.mime_type || "video/mp4"};base64,${videoContent.data}` };
  }

  const videoUri = videoContent.uri;
  if (!videoUri) throw new Error("That didn't return a video — try again.");

  // uri delivery still needs the underlying file to finish processing
  // (PROCESSING -> ACTIVE) before it can actually be downloaded.
  const fileMatch = videoUri.match(/files\/([^/:]+)/);
  const fileName = fileMatch ? `files/${fileMatch[1]}` : null;
  const deadline = Date.now() + MAX_WAIT_MS;
  while (fileName && Date.now() < deadline) {
    const statusRes = await fetch(`${BASE_URL}/${fileName}?key=${apiKey}`).catch(() => null);
    const statusData = statusRes ? await statusRes.json().catch(() => null) : null;
    const state = typeof statusData?.state === "string" ? statusData.state : statusData?.state?.name;
    if (state === "ACTIVE") break;
    if (state === "FAILED") throw new Error("The video render failed — try again.");
    if (Date.now() + POLL_INTERVAL_MS >= deadline) {
      throw new Error("That video is taking longer than expected to render — try again in a moment.");
    }
    await sleep(POLL_INTERVAL_MS);
  }

  const downloadUrl = `${videoUri}${videoUri.includes("?") ? "&" : "?"}key=${apiKey}`;
  const videoRes = await fetch(downloadUrl);
  if (!videoRes.ok) throw new Error(`Couldn't download the rendered video (${videoRes.status}).`);
  const buffer = Buffer.from(await videoRes.arrayBuffer());
  // Same data: URL convention as imageDataUrl elsewhere in this app — no
  // separate file storage needed, and it's a valid <video src> as-is.
  return { videoUrl: `data:video/mp4;base64,${buffer.toString("base64")}` };
}

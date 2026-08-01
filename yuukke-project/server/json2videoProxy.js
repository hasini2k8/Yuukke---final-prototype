// Thin wrapper around JSON2Video's API (https://json2video.com) — turns a
// post's own generated image + caption into a short video reel (a single
// scene: the image as background, the caption as a text overlay) rather
// than needing true generative video, which this app has no need for.
//
// This app has no background job queue, so unlike a production setup this
// polls JSON2Video for the render's completion inside the same request that
// started it (server/index.js's POST /api/posts/:id/video) — matches the
// simplicity level of this app's other proxies (e.g. server/tripoProxy.js's
// blocking model fetch). A render that isn't done within MAX_WAIT_MS fails
// with a "try again" error rather than hanging the request forever.
//
// API shape below matches JSON2Video's v2 docs (json2video.com/docs) at
// time of writing, but hasn't been exercised against a live instance —
// check current docs and adjust field names if anything's changed.
const BASE_URL = "https://api.json2video.com/v2";
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 90_000;

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

// `imagePublicUrl` must be a URL JSON2Video's own servers can fetch — a
// data: URL won't work, which is why this is only ever called with the
// post's own public GET /api/posts/:id/image link (server/index.js).
export async function createVideo({ imagePublicUrl, caption }) {
  const apiKey = requireEnv("JSON2VIDEO_API_KEY");
  const body = {
    resolution: "instagram-story",
    scenes: [{
      elements: [
        { type: "image", src: imagePublicUrl, duration: 6, resize: "cover" },
        { type: "text", text: caption || "", duration: 6, position: "bottom-center", "font-size": 36, color: "#ffffff" },
      ],
    }],
  };

  let createRes;
  try {
    createRes = await fetch(`${BASE_URL}/movies`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Couldn't reach JSON2Video: ${e.message}`);
  }
  const createData = await createRes.json().catch(() => null);
  const projectId = createData?.project || createData?.id;
  if (!createRes.ok || !projectId) {
    throw new Error(createData?.message || `JSON2Video couldn't start that render (${createRes.status}).`);
  }

  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const statusRes = await fetch(`${BASE_URL}/movies?project=${encodeURIComponent(projectId)}`, {
      headers: { "x-api-key": apiKey },
    }).catch(() => null);
    const statusData = statusRes ? await statusRes.json().catch(() => null) : null;
    const movie = statusData?.movie;
    if (movie?.status === "done" && movie.url) {
      return { videoUrl: movie.url };
    }
    if (movie?.status === "error") {
      throw new Error(movie.message || "JSON2Video couldn't render that video.");
    }
  }
  throw new Error("That video is taking longer than expected to render — try again in a moment.");
}

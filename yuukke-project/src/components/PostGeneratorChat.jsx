import React, { useState } from "react";
import { Send, Image as ImageIcon, Film } from "lucide-react";
import { theme } from "../theme";
import { Spinner } from "./Shared";
import MicButton from "./MicButton";
import PostThumb from "./PostThumb";
import { askOpenAIJSON, generateImage, MULTI_PLATFORM_POST_SYSTEM_PROMPT } from "../lib/ai";
import { createPost, generateVideo } from "../lib/posts";

const POST_PLATFORMS = ["instagram", "linkedin"];
const PLATFORM_LABEL = { instagram: "Instagram", linkedin: "LinkedIn" };

// Conversational replacement for the old one-shot "topic + generate &
// submit" form — this drafts an Instagram and LinkedIn version at once
// (same MULTI_PLATFORM_POST_SYSTEM_PROMPT the old form used), but always
// lands the result as "pending" (server/postStore.js) rather than
// immediately slotting it onto the calendar — the seller reviews, deletes,
// and selects which ones to submit in the GeneratedPostsPanel next to this.
export default function PostGeneratorChat({ config, speechLang, onPostsGenerated }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: 'What should this post be about? e.g. "Diwali sale announcement" or "new arrivals".' },
  ]);
  const [step, setStep] = useState("topic"); // topic | format | generating
  const [topic, setTopic] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  function submitTopic() {
    if (!input.trim() || busy) return;
    const value = input.trim();
    setTopic(value);
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content: value },
      { role: "assistant", content: "Image with content, or a video reel with content?" },
    ]);
    setStep("format");
  }

  async function chooseFormat(format) {
    if (busy) return;
    setBusy(true);
    setStep("generating");
    setMessages((m) => [
      ...m,
      { role: "user", content: format === "video" ? "Video reel" : "Image" },
      { role: "assistant", content: format === "video" ? "Drafting the post and animating a reel with Veo — this genuinely renders a video, so it can take a few minutes. Hang tight." : "Drafting the post…" },
    ]);
    try {
      const context = [
        `Business: ${config.businessName || "this business"}`,
        `Tagline: ${config.tagline || ""}`,
        `Category: ${config.category || ""}`,
        `Target platforms: ${POST_PLATFORMS.join(", ")}`,
        `Post theme: ${topic}`,
      ].filter(Boolean).join("\n");
      const { captions, imagePrompts } = await askOpenAIJSON(MULTI_PLATFORM_POST_SYSTEM_PROMPT, context);
      // A separate image per platform, not one shared graphic — Instagram
      // and LinkedIn get genuinely different visuals to match their own
      // caption's tone, generated in parallel rather than reusing one image.
      const imagesByPlatform = Object.fromEntries(
        await Promise.all(POST_PLATFORMS.map(async (platform) => {
          const prompt = imagePrompts?.[platform] || imagePrompts?.[Object.keys(imagePrompts || {})[0]] || topic;
          return [platform, await generateImage(prompt)];
        }))
      );
      let created = await Promise.all(
        POST_PLATFORMS.map((platform) => createPost({
          platform, topic, caption: captions?.[platform] || captions?.[Object.keys(captions)[0]] || "",
          imageDataUrl: imagesByPlatform[platform], status: "pending",
        }))
      );

      if (format === "video") {
        // Parallel, not sequential — Veo renders can each take a few
        // minutes (server/veoProxy.js's MAX_WAIT_MS), so doing both at once
        // instead of one-after-another avoids doubling that wait.
        const results = await Promise.allSettled(created.map((p) => generateVideo(p.id)));
        const failures = [];
        created = created.map((p, i) => {
          const r = results[i];
          if (r.status === "fulfilled") return r.value;
          failures.push(`${PLATFORM_LABEL[p.platform] || p.platform}: ${r.reason?.message || "couldn't render that reel"}`);
          return p;
        });
        if (failures.length) {
          setMessages((m) => [...m, { role: "assistant", content: `Reel rendering didn't work for: ${failures.join("; ")}. The image post is still ready below.` }]);
        }
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Here's what I made — review it in the panel to the right, then select and submit whichever you'd like on the calendar.", posts: created },
        { role: "assistant", content: "Want to draft another post? What should it be about?" },
      ]);
      onPostsGenerated(created);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: e.message || "Sorry, something went wrong generating that — want to try again?" }]);
    } finally {
      setBusy(false);
      setStep("topic");
    }
  }

  return (
    <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginBottom: 20 }}>
      <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 4 }}>Create a social post</p>
      <p style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
        Talk it through — tell it the topic, choose image or video reel, and it drafts an Instagram and a LinkedIn version at once. Nothing goes on your calendar until you pick which ones to submit, in the panel to the right.
      </p>

      <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <p style={{
              fontSize: 12.5, margin: 0, padding: "8px 12px", borderRadius: 10,
              background: m.role === "user" ? theme.wine : theme.cream, color: m.role === "user" ? "#fff" : theme.ink,
            }}>
              {m.content}
            </p>
            {m.posts && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {m.posts.map((p) => (
                  <div key={p.id} style={{ width: 110 }}>
                    <PostThumb imageDataUrl={p.imageDataUrl} videoUrl={p.videoUrl} height={80} radius={8} />
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: theme.inkSoft, margin: "4px 0 0", textAlign: "center" }}>
                      {PLATFORM_LABEL[p.platform] || p.platform}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div style={{ display: "flex", alignItems: "center", gap: 6, color: theme.inkSoft, fontSize: 12 }}><Spinner size={12} /> Working…</div>}
      </div>

      {step === "format" && !busy && (
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <button onClick={() => chooseFormat("image")} style={{
            display: "flex", alignItems: "center", gap: 6, background: theme.wine, color: "#fff", border: "none",
            borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
          }}>
            <ImageIcon size={13} /> Image with content
          </button>
          <button onClick={() => chooseFormat("video")} style={{
            display: "flex", alignItems: "center", gap: 6, background: theme.ink, color: "#fff", border: "none",
            borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
          }}>
            <Film size={13} /> Video reel with content
          </button>
        </div>
      )}

      {step === "topic" && !busy && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitTopic(); }}
            placeholder="e.g. Diwali sale announcement, new arrivals, a behind-the-scenes look"
            style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${theme.line}`, fontSize: 13, fontFamily: theme.fontBody, outline: "none", background: theme.cream }}
          />
          <MicButton size={36} lang={speechLang} onResult={(t) => setInput((v) => (v ? `${v} ${t}` : t))} />
          <button onClick={submitTopic} disabled={!input.trim()} style={{
            display: "flex", alignItems: "center", gap: 6, background: theme.wine, color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: !input.trim() ? "default" : "pointer", opacity: !input.trim() ? 0.5 : 1,
          }}>
            <Send size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { Trash2, Camera, Briefcase, Send } from "lucide-react";
import { theme } from "../theme";
import { Spinner } from "./Shared";
import PostThumb from "./PostThumb";
import { deletePost, updatePost } from "../lib/posts";
import { pickRandomSlot } from "../lib/istDate";

const PLATFORM_META = {
  instagram: { label: "Instagram", icon: Camera },
  linkedin: { label: "LinkedIn", icon: Briefcase },
};

// Review area for posts PostGeneratorChat has generated but not yet placed
// on the calendar (status "pending" — see server/postStore.js). A seller
// can delete ones they don't want and submit the rest, which is the only
// point any of these actually become calendar-visible drafts.
export default function GeneratedPostsPanel({ posts, existingPosts, goTo, onDeleted, onSubmitted }) {
  const [selected, setSelected] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedNote, setSubmittedNote] = useState("");

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function remove(id) {
    await deletePost(id).catch(() => {});
    setSelected((s) => { const next = new Set(s); next.delete(id); return next; });
    onDeleted(id);
  }

  async function submitSelected() {
    const chosen = posts.filter((p) => selected.has(p.id));
    if (!chosen.length || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmittedNote("");
    try {
      // pickRandomSlot only looks at the array it's given — accumulate each
      // slot as it's picked so multiple posts submitted together land on
      // different days/times instead of colliding.
      const pool = [...existingPosts];
      const updated = [];
      for (const post of chosen) {
        const { scheduledFor, scheduledTime } = pickRandomSlot(pool);
        pool.push({ scheduledFor });
        const result = await updatePost(post.id, { scheduledFor, scheduledTime, status: "draft" });
        updated.push(result);
      }
      onSubmitted(updated);
      setSelected(new Set());
      setSubmittedNote(`Added ${updated.length} post${updated.length === 1 ? "" : "s"} to your calendar.`);
    } catch (e) {
      setSubmitError(e.message || "Couldn't submit those posts just now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (posts.length === 0) return null;

  return (
    <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginTop: 20 }}>
      <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 4 }}>Generated posts</p>
      <p style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
        Delete anything you don't want, select the rest, and submit them to your calendar.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {posts.map((p) => {
          const Icon = PLATFORM_META[p.platform]?.icon || Camera;
          return (
            <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: theme.cream, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 10 }}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} style={{ marginTop: 4, cursor: "pointer" }} />
              <div style={{ width: 70, flexShrink: 0 }}>
                <PostThumb imageDataUrl={p.imageDataUrl} videoUrl={p.videoUrl} height={70} radius={8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  <Icon size={12} color={theme.wine} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: theme.inkSoft }}>{PLATFORM_META[p.platform]?.label || p.platform}</span>
                </div>
                <p style={{ fontSize: 11.5, color: theme.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {p.caption || p.topic || "Untitled post"}
                </p>
              </div>
              <button onClick={() => remove(p.id)} aria-label="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: theme.inkSoft, flexShrink: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {submitError && <p style={{ color: "#a32d2d", fontSize: 12, marginBottom: 10 }}>{submitError}</p>}
      {submittedNote && (
        <p style={{ color: "#2c6e49", fontSize: 12, marginBottom: 10 }}>
          {submittedNote} <span onClick={() => goTo("calendar")} style={{ textDecoration: "underline", cursor: "pointer", fontWeight: 700 }}>View calendar</span>
        </p>
      )}
      <button onClick={submitSelected} disabled={submitting || selected.size === 0} style={{
        display: "flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none",
        borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer",
        opacity: selected.size === 0 ? 0.5 : 1,
      }}>
        {submitting ? <Spinner size={14} /> : <Send size={14} />} {submitting ? "Submitting…" : `Submit ${selected.size || ""} to calendar`.trim()}
      </button>
    </div>
  );
}

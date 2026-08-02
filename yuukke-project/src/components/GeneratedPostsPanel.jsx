import React, { useEffect, useState } from "react";
import { Trash2, Camera, Briefcase, Send } from "lucide-react";
import { theme } from "../theme";
import { Spinner } from "./Shared";
import PostThumb from "./PostThumb";
import { deletePost, updatePost } from "../lib/posts";
import { istTodayIso, pickRandomSlot } from "../lib/istDate";

const PLATFORM_META = {
  instagram: { label: "Instagram", icon: Camera },
  linkedin: { label: "LinkedIn", icon: Briefcase },
};

// Review area for posts PostGeneratorChat has generated but not yet placed
// on the calendar (status "pending" — see server/postStore.js). A seller
// can delete ones they don't want and submit the rest, which is the only
// point any of these actually become calendar-visible drafts.
export default function GeneratedPostsPanel({ posts, existingPosts, goTo, onDeleted, onSubmitted }) {
  const [selected, setSelected] = useState(() => new Set(posts.map((post) => post.id)));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedNote, setSubmittedNote] = useState("");
  const [scheduleMode, setScheduleMode] = useState("ai");
  const [customDate, setCustomDate] = useState(istTodayIso());
  const [customTime, setCustomTime] = useState("10:00");

  // AI creates Instagram and LinkedIn as one campaign. Select new variants
  // by default so a seller doesn't accidentally submit only one platform.
  useEffect(() => {
    setSelected((current) => {
      const next = new Set(current);
      posts.forEach((post) => next.add(post.id));
      return next;
    });
  }, [posts]);

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
    if (scheduleMode === "custom" && !customDate) {
      setSubmitError("Choose a posting date first.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setSubmittedNote("");
    try {
      // pickRandomSlot only looks at the array it's given — accumulate each
      // slot as it's picked so multiple posts submitted together land on
      // different days/times instead of colliding.
      const pool = [...existingPosts];
      const updated = [];
      const campaignSlots = new Map();
      for (const post of chosen) {
        let slot = post.campaignId ? campaignSlots.get(post.campaignId) : null;
        if (!slot) {
          slot = scheduleMode === "custom"
            ? { scheduledFor: customDate, scheduledTime: customTime }
            : pickRandomSlot(pool);
          if (post.campaignId) campaignSlots.set(post.campaignId, slot);
          pool.push({ scheduledFor: slot.scheduledFor });
        }
        const { scheduledFor, scheduledTime } = slot;
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
        Both platform versions are selected automatically. Edit or remove anything you don't want, then submit the campaign to your calendar.
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

      <div style={{ background: theme.cream, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: theme.ink, margin: "0 0 9px" }}>When should this campaign post?</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: scheduleMode === "custom" ? 10 : 0 }}>
          <button onClick={() => setScheduleMode("ai")} style={{ border: `1.5px solid ${scheduleMode === "ai" ? theme.wine : theme.line}`, background: scheduleMode === "ai" ? theme.wineTint : "#fff", color: scheduleMode === "ai" ? theme.wine : theme.ink, borderRadius: 999, padding: "7px 12px", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Let AI decide</button>
          <button onClick={() => setScheduleMode("custom")} style={{ border: `1.5px solid ${scheduleMode === "custom" ? theme.wine : theme.line}`, background: scheduleMode === "custom" ? theme.wineTint : "#fff", color: scheduleMode === "custom" ? theme.wine : theme.ink, borderRadius: 999, padding: "7px 12px", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Choose date & time</button>
        </div>
        {scheduleMode === "custom" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="date" min={istTodayIso()} value={customDate} onChange={(e) => setCustomDate(e.target.value)} aria-label="Posting date" style={{ padding: "8px 10px", border: `1px solid ${theme.line}`, borderRadius: 8, fontFamily: theme.fontBody }} />
            <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} aria-label="Posting time" style={{ padding: "8px 10px", border: `1px solid ${theme.line}`, borderRadius: 8, fontFamily: theme.fontBody }} />
            <span style={{ alignSelf: "center", fontSize: 11, color: theme.inkSoft }}>IST</span>
          </div>
        )}
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

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Wand2, Camera, Briefcase, Trash2, CheckCircle2, X, Eye,
  AlertTriangle, Send, Image as ImageIcon, Sparkles, ExternalLink, Pencil,
} from "lucide-react";
import { theme } from "../theme";
import DashboardShell from "../components/DashboardShell";
import { Spinner } from "../components/Shared";
import PlatformPostPreview from "../components/PlatformPostPreview";
import PostThumb from "../components/PostThumb";
import MicButton from "../components/MicButton";
import SpeakButton from "../components/SpeakButton";
import MarketingAnalytics from "../components/MarketingAnalytics";
import { askOpenAIJSON, askOpenAIChat, generateImage, PLATFORM_SUGGESTION_SYSTEM_PROMPT, MOVE_POST_SYSTEM_PROMPT } from "../lib/ai";
import { fetchSite } from "../lib/site";
import { connectPlatform, fetchConnections } from "../lib/social";
import { fetchMyProducts } from "../lib/products";
import { fetchPosts, updatePost, confirmPost, confirmPosts, deletePost, checkPostStatus } from "../lib/posts";
import { istTodayIso, istDateOffset, istWeekStart, istWeekdayName, istWeekdayShort, istMonthDay, formatTime } from "../lib/istDate";
import { EN_STRINGS } from "../lib/strings";

const PLATFORM_META = {
  instagram: { label: "Instagram", icon: Camera },
  linkedin: { label: "LinkedIn", icon: Briefcase },
};

const STATUS_META = {
  draft: { label: "DRAFT", color: theme.inkSoft },
  scheduled: { label: "SCHEDULED", color: "#a3512c" },
  posted: { label: "POSTED", color: "#2c6e49" },
  failed: { label: "FAILED", color: "#a32d2d" },
};

export default function ContentCalendarPage({ goTo, speechLang }) {
  const [weekStart, setWeekStart] = useState(() => istWeekStart(istTodayIso()));
  const [site, setSite] = useState(null);
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [suggestions, setSuggestions] = useState({}); // productId -> {platform, reason}
  const [suggestingId, setSuggestingId] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [previewPost, setPreviewPost] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [confirmingPost, setConfirmingPost] = useState(null);
  const [connectingPlatform, setConnectingPlatform] = useState("");

  // Per-post inline edit state, keyed by post id.
  const [editing, setEditing] = useState({}); // id -> "caption" | "image" | null
  const [editBusy, setEditBusy] = useState({});
  const [editError, setEditError] = useState({});
  const [editValue, setEditValue] = useState({});

  // The move-posts chatbot below the calendar.
  const [moveMessages, setMoveMessages] = useState([
    { role: "assistant", content: "Tell me which post to move — e.g. \"move post 3 to Friday\"." },
  ]);
  const [moveInput, setMoveInput] = useState("");
  const [moveBusy, setMoveBusy] = useState(false);

  useEffect(() => {
    fetchSite().then(setSite).catch(() => {});
    fetchMyProducts().then(setProducts).catch(() => {});
    fetchConnections().then((rows) => setConnectedPlatforms(rows.map((c) => c.platform))).catch(() => {});
    fetchPosts().then((loaded) => {
      // "pending" posts are staged on the Storefront tab's generated-posts
      // panel, not on the calendar yet — they only show up here once the
      // seller explicitly submits them.
      const visible = loaded.filter((p) => p.status !== "pending");
      setPosts(visible);
      // A page reload might land after a post's scheduled date+time passed
      // while the server wasn't running to catch it — this re-checks
      // anything still "scheduled" as a safety net.
      visible.filter((p) => p.status === "scheduled").forEach((p) => {
        checkPostStatus(p.id).then((updated) => {
          setPosts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
        }).catch(() => {});
      });
    }).catch(() => {});
  }, []);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => istDateOffset(weekStart, i)), [weekStart]);
  const postsByDate = useMemo(() => {
    const map = {};
    for (const p of posts) (map[p.scheduledFor] ||= []).push(p);
    for (const iso of Object.keys(map)) map[iso].sort((a, b) => (a.scheduledTime || "").localeCompare(b.scheduledTime || ""));
    return map;
  }, [posts]);
  // Stable numbering across the whole list (not just the visible week) so a
  // seller can say "move post 3" and mean the same post regardless of which
  // week is currently showing.
  const orderedPosts = useMemo(() => [...posts].sort((a, b) => (a.calendarNumber || 0) - (b.calendarNumber || 0)), [posts]);
  const postNumbers = useMemo(() => Object.fromEntries(orderedPosts.map((p, i) => [p.id, p.calendarNumber || i + 1])), [orderedPosts]);
  const todayIso = istTodayIso();

  useEffect(() => {
    if (!previewPost) return;
    setScheduleDate(previewPost.scheduledFor || istTodayIso());
    setScheduleTime(previewPost.scheduledTime || "09:00");
  }, [previewPost?.id]);

  async function suggestPlatformFor(product) {
    if (suggestions[product.id] || suggestingId) return;
    setSuggestingId(product.id);
    try {
      const context = `Product name: ${product.name}\nCategory: ${product.category || ""}\nDescription: ${product.description || ""}\nConnected platforms: ${connectedPlatforms.join(", ") || "none yet"}`;
      const result = await askOpenAIJSON(PLATFORM_SUGGESTION_SYSTEM_PROMPT, context);
      setSuggestions((s) => ({ ...s, [product.id]: result }));
    } catch (e) {
      // Non-critical — a seller can still judge for themselves.
    } finally {
      setSuggestingId("");
    }
  }

  function startEdit(post, kind) {
    setEditing((e) => ({ ...e, [post.id]: kind }));
    setEditValue((v) => ({ ...v, [post.id]: kind === "caption" ? post.caption : "" }));
    setEditError((e) => ({ ...e, [post.id]: "" }));
  }
  function cancelEdit(id) {
    setEditing((e) => ({ ...e, [id]: null }));
  }

  async function saveCaption(post) {
    const next = editValue[post.id] ?? post.caption;
    setEditBusy((b) => ({ ...b, [post.id]: true }));
    try {
      const updated = await updatePost(post.id, { caption: next });
      setPosts((p) => p.map((x) => (x.id === post.id ? updated : x)));
      setEditing((e) => ({ ...e, [post.id]: null }));
    } catch (e) {
      setEditError((er) => ({ ...er, [post.id]: e.message || "Couldn't save that caption." }));
    } finally {
      setEditBusy((b) => ({ ...b, [post.id]: false }));
    }
  }

  async function regenerateCaption(post, instruction) {
    setEditBusy((b) => ({ ...b, [post.id]: true }));
    setEditError((e) => ({ ...e, [post.id]: "" }));
    try {
      const system = `You are a social media copywriter for Yuukke, a marketplace for small businesses in India. Rewrite the given ${post.platform} caption based on the seller's instruction, keeping it warm, on-brand, and suited to ${post.platform}'s tone (1-3 sentences). Respond with ONLY the new caption text — no quotes, no markdown, no prose.`;
      const context = `Current caption: "${post.caption}"\n\nInstruction: "${instruction}"`;
      const caption = (await askOpenAIChat(system, [{ role: "user", content: context }])).trim();
      const updated = await updatePost(post.id, { caption });
      setPosts((p) => p.map((x) => (x.id === post.id ? updated : x)));
      setEditing((e) => ({ ...e, [post.id]: null }));
    } catch (e) {
      setEditError((er) => ({ ...er, [post.id]: e.message || "Couldn't rewrite that caption." }));
    } finally {
      setEditBusy((b) => ({ ...b, [post.id]: false }));
    }
  }

  async function regenerateImage(post, instruction) {
    setEditBusy((b) => ({ ...b, [post.id]: true }));
    setEditError((e) => ({ ...e, [post.id]: "" }));
    try {
      const prompt = `${instruction} — a social media graphic for ${site?.businessName || "this business"}'s post about "${post.topic || post.caption}". Matches the business's warm, handmade branding.`;
      const imageDataUrl = await generateImage(prompt);
      const updated = await updatePost(post.id, { imageDataUrl });
      setPosts((p) => p.map((x) => (x.id === post.id ? updated : x)));
      setEditing((e) => ({ ...e, [post.id]: null }));
    } catch (e) {
      setEditError((er) => ({ ...er, [post.id]: e.message || "Couldn't redo that image." }));
    } finally {
      setEditBusy((b) => ({ ...b, [post.id]: false }));
    }
  }

  // Preview is always available (it's just rendering, no live account
  // needed) — connecting only happens here, once the seller has already
  // decided from the preview that they want to actually post.
  async function connectFromConfirm(platform) {
    setConnectingPlatform(platform);
    try {
      await connectPlatform(platform);
      await refreshConnectionsForConfirm();
    } catch (e) {
      setEditError((errors) => ({ ...errors, connection: e.message || "Couldn't connect that Postiz channel." }));
    } finally {
      setConnectingPlatform("");
    }
  }

  async function refreshConnectionsForConfirm() {
    const rows = await fetchConnections().catch(() => []);
    setConnectedPlatforms(rows.map((c) => c.platform));
  }

  // Nothing reaches Instagram/LinkedIn without this explicit yes.
  async function doConfirmSubmit(post) {
    setConfirmingPost(null);
    const updated = await confirmPost(post.id).catch((e) => {
      setEditError((er) => ({ ...er, [post.id]: e.message || "Couldn't schedule that post." }));
      return null;
    });
    if (updated) {
      setPosts((p) => p.map((x) => (x.id === post.id ? updated : x)));
      setPreviewPost((pp) => (pp?.id === post.id ? updated : pp));
    }
  }


  async function doConfirmCampaign(campaignPosts) {
    setConfirmingPost(null);
    const updated = await confirmPosts(campaignPosts.map((post) => post.id)).catch((e) => {
      setEditError((errors) => ({ ...errors, campaign: e.message || "Couldn't schedule those posts." }));
      return null;
    });
    if (updated) {
      const byId = Object.fromEntries(updated.map((post) => [post.id, post]));
      setPosts((current) => current.map((post) => byId[post.id] || post));
      setPreviewPost((post) => post && (byId[post.id] || post));
    }
  }

  async function saveSchedule(post) {
    if (!scheduleDate || scheduleBusy || post.status !== "draft") return;
    setScheduleBusy(true);
    setEditError((errors) => ({ ...errors, [post.id]: "" }));
    try {
      const updated = await updatePost(post.id, { scheduledFor: scheduleDate, scheduledTime: scheduleTime });
      setPosts((current) => current.map((item) => item.id === post.id ? updated : item));
      setPreviewPost(updated);
    } catch (e) {
      setEditError((errors) => ({ ...errors, [post.id]: e.message || "Couldn't move that post." }));
    } finally {
      setScheduleBusy(false);
    }
  }

  async function remove(id) {
    await deletePost(id).catch(() => {});
    setPosts((p) => p.filter((x) => x.id !== id));
    setPreviewPost((pp) => (pp?.id === id ? null : pp));
  }

  // Talk, analyse, execute — a seller says "move post 3 to Friday" (typed
  // or spoken), the AI resolves the weekday/date against today's real IST
  // date and picks which visible post they mean, then it's applied directly.
  async function runMoveCommand(instruction) {
    if (!instruction.trim() || moveBusy) return;
    const userMsg = { role: "user", content: instruction };
    setMoveMessages((m) => [...m, userMsg]);
    setMoveInput("");
    setMoveBusy(true);
    try {
      const listing = orderedPosts.map((p) => `#${postNumbers[p.id]}: ${p.topic || "Untitled"} (${p.platform}) — currently ${p.scheduledFor} at ${p.scheduledTime || "09:00"} IST`).join("\n");
      const context = `Today's date: ${todayIso} (IST)\n\nVisible posts:\n${listing || "(none yet)"}\n\nInstruction: "${instruction}"`;
      const result = await askOpenAIJSON(MOVE_POST_SYSTEM_PROMPT, context);
      const target = orderedPosts.find((p) => postNumbers[p.id] === result.postNumber);
      if (!target || !result.newDate) {
        setMoveMessages((m) => [...m, { role: "assistant", content: "I couldn't tell which post or date you meant — try naming the post number and a specific day." }]);
        return;
      }
      const newTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(result.newTime || "") ? result.newTime : target.scheduledTime;
      const updated = await updatePost(target.id, { scheduledFor: result.newDate, scheduledTime: newTime });
      setPosts((p) => p.map((x) => (x.id === target.id ? updated : x)));
      setMoveMessages((m) => [...m, { role: "assistant", content: `Moved post #${result.postNumber} to ${istWeekdayName(result.newDate)}, ${istMonthDay(result.newDate)} at ${formatTime(newTime)} IST.` }]);
      setWeekStart(istWeekStart(result.newDate));
    } catch (e) {
      setMoveMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't make that change just now — could you try again?" }]);
    } finally {
      setMoveBusy(false);
    }
  }

  const weekLabel = `${istMonthDay(weekDates[0])} – ${istMonthDay(weekDates[6])}`;

  return (
    <DashboardShell goTo={goTo} active="calendar" businessName={site?.businessName || null} t={(k) => EN_STRINGS[k] || k} speechLang={speechLang}>
      <span onClick={() => goTo("customizeStore")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: theme.wine, cursor: "pointer", marginBottom: 18 }}>
        <ArrowLeft size={14} /> Back to storefront
      </span>
      <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, color: theme.ink, margin: "0 0 8px" }}>AI marketing</h1>
      <p style={{ fontSize: 14.5, color: theme.inkSoft, marginBottom: 22, fontFamily: theme.fontBody, maxWidth: 640 }}>
        Posts drafted on the Storefront tab land here automatically — the AI already picked a day. Preview how each looks, move it if you'd rather post it another day, and connect an account only once you're ready to confirm.
      </p>

      {products.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 10 }}>AI platform suggestions for your products</p>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
            {products.map((product) => {
              const suggestion = suggestions[product.id];
              return (
                <div key={product.id} style={{
                  flex: "0 0 200px", background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 14, padding: 12,
                }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</p>
                  <p style={{ fontSize: 11, color: theme.inkSoft, margin: "0 0 8px" }}>{product.category || "Uncategorized"}</p>
                  {suggestion ? (
                    <p style={{ fontSize: 11, color: theme.wine, margin: 0, lineHeight: 1.4 }}>
                      <strong style={{ textTransform: "capitalize" }}>{suggestion.platform}</strong> — {suggestion.reason}
                    </p>
                  ) : (
                    <button onClick={() => suggestPlatformFor(product)} disabled={suggestingId === product.id} style={{
                      display: "flex", alignItems: "center", gap: 5, background: "none", border: `1.5px solid ${theme.line}`, color: theme.ink,
                      borderRadius: 8, padding: "5px 9px", fontWeight: 700, fontSize: 11, cursor: "pointer",
                    }}>
                      {suggestingId === product.id ? <Spinner size={11} /> : <Sparkles size={11} />} Suggest platform
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <button onClick={() => setWeekStart((w) => istDateOffset(w, -7))} style={{ background: "none", border: "none", cursor: "pointer", color: theme.ink }}><ChevronLeft size={20} /></button>
          <p style={{ fontSize: 15, fontWeight: 700, color: theme.ink, margin: 0 }}>{weekLabel}</p>
          <button onClick={() => setWeekStart((w) => istDateOffset(w, 7))} style={{ background: "none", border: "none", cursor: "pointer", color: theme.ink }}><ChevronRight size={20} /></button>
        </div>

        {posts.length === 0 && (
          <p style={{ fontSize: 13, color: theme.inkSoft, textAlign: "center", padding: "20px 0" }}>
            Nothing here yet — generate a post from the Storefront tab and it'll show up on the day the AI picks.
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(210px, 1fr))", gap: 0, overflowX: "auto", border: `1px solid ${theme.line}`, borderRadius: 14 }}>
          {weekDates.map((iso, i) => {
            const isToday = iso === todayIso;
            const dayPosts = postsByDate[iso] || [];
            return (
              <div key={iso} style={{ minWidth: 210, minHeight: 460, padding: "14px 12px", borderRight: i < 6 ? `1px solid ${theme.line}` : "none" }}>
                <div style={{
                  marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${isToday ? theme.wine : theme.line}`,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: isToday ? theme.wine : theme.inkSoft, margin: "0 0 4px" }}>{istWeekdayShort(iso)}</p>
                  <p style={{ fontSize: 30, fontWeight: 800, fontFamily: theme.fontDisplay, color: isToday ? theme.wine : theme.ink, margin: 0 }}>{Number(iso.slice(8, 10))}</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {dayPosts.map((p) => {
                    const Icon = PLATFORM_META[p.platform]?.icon || Camera;
                    const status = STATUS_META[p.status] || STATUS_META.draft;
                    return (
                      <div key={p.id} style={{
                        background: theme.cream, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 10,
                      }}>
                        <div onClick={() => setPreviewPost(p)} style={{ position: "relative", cursor: "pointer" }}>
                          <PostThumb imageDataUrl={p.imageDataUrl} videoUrl={p.videoUrl} height={100} radius={8} />
                          <button onClick={(e) => { e.stopPropagation(); startEdit(p, "image"); }} aria-label="Edit image" style={{
                            position: "absolute", bottom: 6, right: 6, background: "rgba(20,14,16,.65)", border: "none", borderRadius: "50%",
                            width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                          }}>
                            <Pencil size={12} color="#fff" />
                          </button>
                        </div>
                        <div onClick={() => setPreviewPost(p)} style={{ display: "flex", alignItems: "center", gap: 5, margin: "8px 0 4px", cursor: "pointer" }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: theme.wine }}>#{postNumbers[p.id]}</span>
                          <Icon size={11} color={theme.wine} />
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: theme.inkSoft }}>{formatTime(p.scheduledTime)}</span>
                          <span style={{ fontSize: 9.5, fontWeight: 800, color: status.color, marginLeft: "auto" }}>{status.label}</span>
                        </div>
                        <p onClick={() => setPreviewPost(p)} style={{ fontSize: 11.5, fontWeight: 700, color: theme.ink, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
                          {p.topic || "Untitled post"}
                        </p>
                        <p onClick={(e) => { e.stopPropagation(); startEdit(p, "caption"); }} style={{ fontSize: 10.5, color: theme.inkSoft, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", cursor: "text" }}>
                          {p.caption}
                        </p>
                        {editing[p.id] && (
                          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.line}` }}>
                            <PostInlineEditor
                              post={p} mode={editing[p.id]} editValue={editValue[p.id]} editBusy={editBusy[p.id]} editError={editError[p.id]} speechLang={speechLang}
                              onChangeValue={(v) => setEditValue((val) => ({ ...val, [p.id]: v }))}
                              onSave={saveCaption} onCancel={cancelEdit} onRegenerateCaption={regenerateCaption} onRegenerateImage={regenerateImage}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 20 }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 4 }}>Move a post</p>
        <p style={{ fontSize: 11.5, color: theme.inkSoft, marginBottom: 12 }}>Every calendar post is numbered. Tell the AI the post number and new date/time, by voice or typing.</p>
        <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {moveMessages.map((m, i) => (
            <p key={i} style={{
              fontSize: 12.5, margin: 0, padding: "8px 12px", borderRadius: 10, maxWidth: "80%",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? theme.wine : theme.cream, color: m.role === "user" ? "#fff" : theme.ink,
            }}>
              {m.content}
            </p>
          ))}
          {moveBusy && <div style={{ display: "flex", alignItems: "center", gap: 6, color: theme.inkSoft, fontSize: 12 }}><Spinner size={12} /> Thinking…</div>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input
            value={moveInput}
            onChange={(e) => setMoveInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runMoveCommand(moveInput); }}
            placeholder="e.g. move post 3 to Friday at 4:30 PM"
            style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${theme.line}`, fontSize: 13, fontFamily: theme.fontBody, outline: "none", background: theme.cream }}
          />
          <MicButton size={36} lang={speechLang} onResult={(t) => runMoveCommand(t)} />
          <button onClick={() => runMoveCommand(moveInput)} disabled={moveBusy || !moveInput.trim()} style={{
            background: theme.wine, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13,
            cursor: !moveInput.trim() ? "default" : "pointer", opacity: !moveInput.trim() ? 0.5 : 1,
          }}>
            Go
          </button>
        </div>
      </div>

      <MarketingAnalytics />

      {previewPost && (
        <div onClick={() => setPreviewPost(null)} style={{
          position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,14,16,.6)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, maxWidth: 440, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
                #{postNumbers[previewPost.id]} · {PLATFORM_META[previewPost.platform]?.label || previewPost.platform} · {istWeekdayName(previewPost.scheduledFor)}, {istMonthDay(previewPost.scheduledFor)} · {formatTime(previewPost.scheduledTime)}
              </span>
              <button onClick={() => setPreviewPost(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}><X size={18} /></button>
            </div>

            {previewPost.status === "draft" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", width: "100%", background: "rgba(255,255,255,.12)", borderRadius: 10, padding: 10 }}>
                <input type="date" min={istTodayIso()} value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} aria-label="Move post to date" style={{ padding: "7px 9px", borderRadius: 7, border: "none", fontFamily: theme.fontBody }} />
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} aria-label="Move post to time" style={{ padding: "7px 9px", borderRadius: 7, border: "none", fontFamily: theme.fontBody }} />
                <button onClick={() => saveSchedule(previewPost)} disabled={scheduleBusy} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: theme.wine, color: "#fff", fontWeight: 800, fontSize: 11.5, cursor: "pointer" }}>
                  {scheduleBusy ? "Moving…" : "Move post"}
                </button>
                <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.8)" }}>IST</span>
                {editError[previewPost.id] && <span style={{ width: "100%", fontSize: 11, color: "#ffd6d6" }}>{editError[previewPost.id]}</span>}
              </div>
            )}

            <div style={{ background: "#fff", borderRadius: 14, padding: 14, width: "100%" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: theme.inkSoft, letterSpacing: 0.5, margin: "0 0 4px" }}>TOPIC</p>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: theme.ink, margin: "0 0 12px" }}>{previewPost.topic || "Untitled post"}</p>

              {editing[previewPost.id] === "caption" ? (
                <PostInlineEditor
                  post={previewPost} mode="caption" editValue={editValue[previewPost.id]} editBusy={editBusy[previewPost.id]} editError={editError[previewPost.id]} speechLang={speechLang}
                  onChangeValue={(v) => setEditValue((val) => ({ ...val, [previewPost.id]: v }))}
                  onSave={saveCaption} onCancel={cancelEdit} onRegenerateCaption={regenerateCaption} onRegenerateImage={regenerateImage}
                />
              ) : (
                <>
                  <SpeakButton text={previewPost.caption} lang={speechLang} />
                  <PlatformPostPreview
                    platform={previewPost.platform}
                    businessName={site?.businessName}
                    logoDataUrl={site?.logoDataUrl}
                    caption={previewPost.caption}
                    imageDataUrl={previewPost.imageDataUrl}
                    videoUrl={previewPost.videoUrl}
                  />
                </>
              )}

              {editing[previewPost.id] === "image" && (
                <PostInlineEditor
                  post={previewPost} mode="image" editBusy={editBusy[previewPost.id]} editError={editError[previewPost.id]} speechLang={speechLang}
                  onCancel={cancelEdit} onRegenerateImage={regenerateImage}
                />
              )}

              {previewPost.status !== "posted" && !editing[previewPost.id] && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button onClick={() => startEdit(previewPost, "caption")} style={{ display: "flex", alignItems: "center", gap: 5, background: theme.creamDark, color: theme.ink, border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>
                    <Wand2 size={11} /> Edit caption
                  </button>
                  <button onClick={() => startEdit(previewPost, "image")} style={{ display: "flex", alignItems: "center", gap: 5, background: theme.creamDark, color: theme.ink, border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>
                    <ImageIcon size={11} /> Edit image
                  </button>
                </div>
              )}

              {previewPost.scheduleError && <p style={{ color: "#a32d2d", fontSize: 11.5, margin: "10px 0 0" }}>{previewPost.scheduleError}</p>}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {previewPost.status === "draft" && (
                <button onClick={() => { refreshConnectionsForConfirm(); setConfirmingPost(previewPost); }} style={{
                  display: "flex", alignItems: "center", gap: 6, background: "#fff", color: theme.wine, border: "none",
                  borderRadius: 999, padding: "9px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                }}>
                  <Send size={13} /> Submit for posting
                </button>
              )}
              {previewPost.status !== "posted" && (
                <button onClick={() => remove(previewPost.id)} style={{
                  display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", color: "#fff", border: "none",
                  borderRadius: 999, padding: "9px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                }}>
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmingPost && (
        <div onClick={() => setConfirmingPost(null)} style={{
          position: "fixed", inset: 0, zIndex: 400, background: "rgba(20,14,16,.7)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: theme.white, borderRadius: 16, padding: 24, maxWidth: 380 }}>
            {(() => {
              const campaignPosts = confirmingPost.campaignId
                ? posts.filter((post) => post.campaignId === confirmingPost.campaignId && post.status === "draft")
                : [confirmingPost];
              const canPublishCampaign = campaignPosts.length > 1 && campaignPosts.every((post) => connectedPlatforms.includes(post.platform));
              return connectedPlatforms.includes(confirmingPost.platform) ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <AlertTriangle size={18} color={theme.wine} />
                  <p style={{ fontSize: 14.5, fontWeight: 700, color: theme.ink, margin: 0 }}>Post this for real?</p>
                </div>
                <p style={{ fontSize: 13, color: theme.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>
                  {canPublishCampaign
                    ? `You can submit the Instagram and LinkedIn versions together. Each will publish at the date and time shown on its calendar card.`
                    : `This will publish to ${PLATFORM_META[confirmingPost.platform]?.label || confirmingPost.platform} on ${istWeekdayName(confirmingPost.scheduledFor)}, ${istMonthDay(confirmingPost.scheduledFor)} at ${formatTime(confirmingPost.scheduledTime)} IST.`}
                  This can't be undone once it's live.
                </p>
                {editError.campaign && <p style={{ color: "#a32d2d", fontSize: 12, marginBottom: 12 }}>{editError.campaign}</p>}
                <div style={{ display: "flex", gap: 10 }}>
                  {canPublishCampaign && (
                    <button onClick={() => doConfirmCampaign(campaignPosts)} style={{ flex: 1, background: theme.wine, color: "#fff", border: "none", borderRadius: 10, padding: "10px 8px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      Post to both
                    </button>
                  )}
                  <button onClick={() => doConfirmSubmit(confirmingPost)} style={{ flex: 1, background: theme.wine, color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {canPublishCampaign ? `Only ${PLATFORM_META[confirmingPost.platform]?.label}` : "Yes, post it"}
                  </button>
                  <button onClick={() => setConfirmingPost(null)} style={{ flex: 1, background: "none", border: `1.5px solid ${theme.line}`, color: theme.ink, borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Not yet
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14.5, fontWeight: 700, color: theme.ink, margin: "0 0 10px" }}>
                  Connect {PLATFORM_META[confirmingPost.platform]?.label || confirmingPost.platform} first
                </p>
                <p style={{ fontSize: 13, color: theme.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>
                  Connect the matching channel in Postiz first. Yuukke will then schedule approved content through your Postiz subscription.
                </p>
                {editError.connection && <p style={{ color: "#a32d2d", fontSize: 12, marginBottom: 12 }}>{editError.connection}</p>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => connectFromConfirm(confirmingPost.platform)} disabled={connectingPlatform === confirmingPost.platform} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: theme.wine, color: "#fff",
                    border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>
                    {connectingPlatform === confirmingPost.platform ? <Spinner size={13} /> : <ExternalLink size={13} />} Connect
                  </button>
                  <button onClick={() => setConfirmingPost(null)} style={{ flex: 1, background: "none", border: `1.5px solid ${theme.line}`, color: theme.ink, borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </>
            ); })()}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

// The caption/image edit form for a single post — shared between the full
// preview modal and the inline expand-in-place block on a calendar card, so
// both editing surfaces stay in sync automatically (same editing/editValue/
// editBusy/editError state either way, just rendered in a different spot).
function PostInlineEditor({ post, mode, editValue, editBusy, editError, speechLang, onChangeValue, onSave, onCancel, onRegenerateCaption, onRegenerateImage }) {
  if (mode === "caption") {
    return (
      <div>
        <textarea rows={3} value={editValue ?? post.caption} onChange={(e) => onChangeValue(e.target.value)}
          style={{ width: "100%", padding: "9px 11px", borderRadius: 10, border: `1.5px solid ${theme.line}`, fontSize: 13, fontFamily: theme.fontBody, marginBottom: 8, resize: "vertical" }} />
        <p style={{ fontSize: 11, color: theme.inkSoft, margin: "0 0 6px" }}>Or describe a change and let AI rewrite it:</p>
        <TalkThenRun
          placeholder="e.g. make it shorter, add an emoji, mention free shipping"
          speechLang={speechLang}
          busy={!!editBusy}
          error={editError}
          onRun={(instruction) => onRegenerateCaption(post, instruction)}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => onSave(post)} disabled={editBusy} style={{ background: theme.wine, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Save</button>
          <button onClick={() => onCancel(post.id)} style={{ background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }
  if (mode === "image") {
    return (
      <div style={{ marginTop: 12 }}>
        <TalkThenRun
          placeholder="e.g. show the product on a wooden table, warmer lighting"
          speechLang={speechLang}
          busy={!!editBusy}
          error={editError}
          onRun={(instruction) => onRegenerateImage(post, instruction)}
          idleLabel="Regenerate image"
        />
        <button onClick={() => onCancel(post.id)} style={{ background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", marginTop: 8 }}>Cancel</button>
      </div>
    );
  }
  return null;
}

// Small talk-or-type-then-run bar for inline post edits (caption/image
// rewrite) — same shape as TalkAnalyseExecuteBar but plain-text driven
// rather than JSON-driven, so it's kept local to this page.
function TalkThenRun({ placeholder, busy, error, onRun, speechLang, idleLabel = "Rewrite" }) {
  const [value, setValue] = useState("");
  function submit() {
    if (!value.trim() || busy) return;
    onRun(value.trim());
    setValue("");
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
        <textarea rows={2} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${theme.line}`, fontSize: 12.5, fontFamily: theme.fontBody, outline: "none", resize: "vertical" }} />
        <MicButton size={30} lang={speechLang} onResult={(t) => setValue((v) => (v ? `${v} ${t}` : t))} />
      </div>
      {error && <p style={{ color: "#a32d2d", fontSize: 11, margin: "0 0 6px" }}>{error}</p>}
      <button onClick={submit} disabled={busy || !value.trim()} style={{
        display: "flex", alignItems: "center", gap: 6, background: theme.ink, color: "#fff", border: "none",
        borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 11.5, cursor: !value.trim() ? "default" : "pointer",
        opacity: !value.trim() ? 0.5 : 1,
      }}>
        {busy ? <Spinner size={11} /> : <Wand2 size={11} />} {busy ? "Working…" : idleLabel}
      </button>
    </div>
  );
}

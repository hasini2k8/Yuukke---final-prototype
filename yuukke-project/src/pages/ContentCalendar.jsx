import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Wand2, Camera, Briefcase, Pin, Trash2, CheckCircle2, X, Eye, AlertTriangle } from "lucide-react";
import { theme } from "../theme";
import DashboardShell from "../components/DashboardShell";
import { Spinner } from "../components/Shared";
import PlatformPostPreview from "../components/PlatformPostPreview";
import { askGeminiJSON, generateImage, SOCIAL_POST_SYSTEM_PROMPT } from "../lib/ai";
import { fetchSite } from "../lib/site";
import { fetchPosts, createPost, updatePost, deletePost, checkPostStatus } from "../lib/posts";
import { EN_STRINGS } from "../lib/strings";

const PLATFORM_META = {
  instagram: { label: "Instagram", icon: Camera },
  linkedin: { label: "LinkedIn", icon: Briefcase },
  pinterest: { label: "Pinterest", icon: Pin },
};

function pad(n) { return String(n).padStart(2, "0"); }
function isoDate(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }

export default function ContentCalendarPage({ goTo, speechLang }) {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [site, setSite] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [platform, setPlatform] = useState("");
  const [postTheme, setPostTheme] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [previewPost, setPreviewPost] = useState(null);

  useEffect(() => {
    fetchSite().then(setSite).catch(() => {});
    fetchPosts().then((loaded) => {
      setPosts(loaded);
      // Posts are scheduled with Zernio automatically when created — this
      // just checks what actually happened for anything past its date, so
      // status reflects reality instead of staying "scheduled" forever.
      const today = isoDate(new Date());
      loaded
        .filter((p) => p.status !== "posted" && p.scheduledFor <= today)
        .forEach((p) => {
          checkPostStatus(p.id).then((updated) => {
            setPosts((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
          }).catch(() => {});
        });
    }).catch(() => {});
  }, []);

  const connectedPlatforms = Object.entries(site?.connections || {}).filter(([, c]) => c?.connected).map(([p]) => p);

  const days = useMemo(() => {
    const year = month.getFullYear(), m = month.getMonth();
    const firstWeekday = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));
    return cells;
  }, [month]);

  const postsByDate = useMemo(() => {
    const map = {};
    for (const p of posts) (map[p.scheduledFor] ||= []).push(p);
    return map;
  }, [posts]);

  const todayIso = isoDate(new Date());

  function openComposer(date) {
    setSelectedDate(isoDate(date));
    setPlatform(connectedPlatforms[0] || "");
    setPostTheme("");
    setGenError("");
  }

  async function generate() {
    if (!platform || !postTheme.trim()) return;
    setGenerating(true);
    setGenError("");
    try {
      const context = `Business: ${site?.businessName || "this business"}\nTagline: ${site?.tagline || ""}\nCategory: ${site?.category || ""}\nPlatform: ${platform}\nPost theme: ${postTheme}`;
      const { caption, imagePrompt } = await askGeminiJSON(SOCIAL_POST_SYSTEM_PROMPT, context);
      const imageDataUrl = await generateImage(imagePrompt);
      const post = await createPost({ platform, caption, imageDataUrl, scheduledFor: selectedDate });
      setPosts((p) => [...p, post]);
      setSelectedDate(null);
      setPreviewPost(post);
    } catch (e) {
      setGenError(e.message || "Couldn't generate that post just now.");
    } finally {
      setGenerating(false);
    }
  }

  async function markPosted(id) {
    const updated = await updatePost(id, { status: "posted" }).catch(() => null);
    if (updated) {
      setPosts((p) => p.map((x) => (x.id === id ? updated : x)));
      setPreviewPost((pp) => (pp?.id === id ? updated : pp));
    }
  }

  async function remove(id) {
    await deletePost(id).catch(() => {});
    setPosts((p) => p.filter((x) => x.id !== id));
    setPreviewPost((pp) => (pp?.id === id ? null : pp));
  }

  const upcoming = [...posts].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  const monthLabel = month.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <DashboardShell goTo={goTo} active="calendar" businessName={site?.businessName || null} t={(k) => EN_STRINGS[k] || k} speechLang={speechLang}>
      <span onClick={() => goTo("customizeStore")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: theme.wine, cursor: "pointer", marginBottom: 18 }}>
        <ArrowLeft size={14} /> Back to storefront
      </span>
      <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, color: theme.ink, margin: "0 0 8px" }}>Social content calendar</h1>
      <p style={{ fontSize: 14.5, color: theme.inkSoft, marginBottom: 26, fontFamily: theme.fontBody, maxWidth: 560 }}>
        Pick a day, tell the AI what you're announcing, and it'll draft a caption and image and post it for you automatically on that day — no extra step needed.
      </p>

      {connectedPlatforms.length === 0 && (
        <div style={{ background: theme.wineTint, borderRadius: 14, padding: 16, marginBottom: 20, fontSize: 13, color: theme.wine }}>
          Connect at least one platform on the Storefront tab before scheduling posts.
        </div>
      )}

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 420px", minWidth: 320 }}>
          <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: theme.ink }}><ChevronLeft size={18} /></button>
              <p style={{ fontSize: 14, fontWeight: 700, color: theme.ink, margin: 0 }}>{monthLabel}</p>
              <button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: theme.ink }}><ChevronRight size={18} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: theme.inkSoft, padding: "4px 0" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {days.map((date, i) => {
                if (!date) return <div key={i} />;
                const iso = isoDate(date);
                const dayPosts = postsByDate[iso] || [];
                const isToday = iso === todayIso;
                return (
                  <button key={i} onClick={() => openComposer(date)} disabled={connectedPlatforms.length === 0} style={{
                    aspectRatio: "1", borderRadius: 10, border: `1.5px solid ${isToday ? theme.wine : theme.line}`,
                    background: selectedDate === iso ? theme.wineTint : "#fff", cursor: connectedPlatforms.length === 0 ? "default" : "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: 4,
                    opacity: connectedPlatforms.length === 0 ? 0.5 : 1,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: theme.ink }}>{date.getDate()}</span>
                    {dayPosts.length > 0 && <span style={{ width: 5, height: 5, borderRadius: "50%", background: theme.gold }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: theme.ink, margin: 0 }}>New post for {selectedDate}</p>
                <button onClick={() => setSelectedDate(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.inkSoft }}><X size={16} /></button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {connectedPlatforms.map((p) => {
                  const Icon = PLATFORM_META[p].icon;
                  return (
                    <button key={p} onClick={() => setPlatform(p)} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999,
                      border: `1.5px solid ${platform === p ? theme.wine : theme.line}`, background: platform === p ? theme.wine : "#fff",
                      color: platform === p ? "#fff" : theme.ink, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>
                      <Icon size={13} /> {PLATFORM_META[p].label}
                    </button>
                  );
                })}
              </div>
              <textarea rows={2} value={postTheme} onChange={(e) => setPostTheme(e.target.value)} placeholder="e.g. Diwali sale announcement, new arrivals, a behind-the-scenes look"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${theme.line}`, fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream, resize: "vertical", marginBottom: 12 }} />
              {genError && <p style={{ color: "#a32d2d", fontSize: 12.5, marginBottom: 10 }}>{genError}</p>}
              <button onClick={generate} disabled={generating || !platform || !postTheme.trim()} style={{
                display: "flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none",
                borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                opacity: !platform || !postTheme.trim() ? 0.5 : 1,
              }}>
                {generating ? <Spinner size={14} /> : <Wand2 size={14} />} {generating ? "Generating…" : "Generate post"}
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 300px", minWidth: 280 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink, marginBottom: 12 }}>Upcoming posts</p>
          {upcoming.length === 0 ? (
            <p style={{ fontSize: 13, color: theme.inkSoft }}>Nothing scheduled yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {upcoming.map((p) => {
                const Icon = PLATFORM_META[p.platform]?.icon || Camera;
                return (
                  <div key={p.id} onClick={() => setPreviewPost(p)} style={{ display: "flex", gap: 10, background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 14, padding: 12, cursor: "pointer" }}>
                    <img src={p.imageDataUrl} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <Icon size={12} color={theme.wine} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: theme.wine }}>{p.scheduledFor}</span>
                        {p.status === "posted" && <span style={{ fontSize: 10, fontWeight: 700, color: "#2c6e49" }}>· POSTED</span>}
                        {p.status === "failed" && <span style={{ fontSize: 10, fontWeight: 700, color: "#a32d2d" }}>· FAILED</span>}
                        {p.scheduleError && <AlertTriangle size={11} color="#a3512c" style={{ marginLeft: "auto" }} />}
                        {!p.scheduleError && <Eye size={11} color={theme.inkSoft} style={{ marginLeft: "auto" }} />}
                      </div>
                      <p style={{ fontSize: 12, color: theme.ink, margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.caption}</p>
                      {p.scheduleError && <p style={{ fontSize: 11, color: "#a3512c", margin: "0 0 6px" }}>{p.scheduleError}</p>}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {p.status !== "posted" && (
                          <button onClick={(e) => { e.stopPropagation(); markPosted(p.id); }} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "#2c6e49", fontSize: 11, fontWeight: 700, padding: 0 }}>
                            <CheckCircle2 size={12} /> Mark posted
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); remove(p.id); }} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: theme.inkSoft, fontSize: 11, fontWeight: 700, padding: 0 }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {previewPost && (
        <div onClick={() => setPreviewPost(null)} style={{
          position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,14,16,.6)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 420 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>
                {PLATFORM_META[previewPost.platform]?.label || previewPost.platform} preview · {previewPost.scheduledFor}
              </span>
              <button onClick={() => setPreviewPost(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}><X size={18} /></button>
            </div>
            <PlatformPostPreview
              platform={previewPost.platform}
              businessName={site?.businessName}
              logoDataUrl={site?.logoDataUrl}
              caption={previewPost.caption}
              imageDataUrl={previewPost.imageDataUrl}
            />
            {previewPost.scheduleError && <p style={{ color: "#ffb4b4", fontSize: 12, margin: 0, maxWidth: 380, textAlign: "center" }}>{previewPost.scheduleError}</p>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {previewPost.status !== "posted" && (
                <button onClick={() => markPosted(previewPost.id)} style={{
                  display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#2c6e49", border: "none",
                  borderRadius: 999, padding: "9px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                }}>
                  <CheckCircle2 size={13} /> Mark posted
                </button>
              )}
              <button onClick={() => remove(previewPost.id)} style={{
                display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", color: "#fff", border: "none",
                borderRadius: 999, padding: "9px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
              }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

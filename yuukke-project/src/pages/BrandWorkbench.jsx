import React, { useState, useEffect } from "react";
import { ArrowLeft, Wand2, BookOpen, Smile, Trash2, ArrowRight } from "lucide-react";
import { theme } from "../theme";
import DashboardShell from "../components/DashboardShell";
import { Spinner } from "../components/Shared";
import MicButton from "../components/MicButton";
import SpeakButton from "../components/SpeakButton";
import { askGeminiJSON, generateImage, buildCharacterPrompt, BRAND_GUIDELINES_SYSTEM_PROMPT } from "../lib/ai";
import { fetchSite, saveSite } from "../lib/site";
import { EN_STRINGS } from "../lib/strings";

export default function BrandWorkbenchPage({ goTo, speechLang }) {
  const [site, setSite] = useState(null);
  const [guidelines, setGuidelines] = useState(null);
  const [guidelinesLoading, setGuidelinesLoading] = useState(false);
  const [guidelinesError, setGuidelinesError] = useState("");
  const [characters, setCharacters] = useState([]);
  const [characterPrompt, setCharacterPrompt] = useState("");
  const [characterLoading, setCharacterLoading] = useState(false);
  const [characterError, setCharacterError] = useState("");

  useEffect(() => {
    fetchSite().then((s) => {
      setSite(s);
      setGuidelines(s?.brandGuidelines || null);
      setCharacters(s?.characters || []);
    }).catch(() => {});
  }, []);

  async function generateGuidelines() {
    setGuidelinesLoading(true);
    setGuidelinesError("");
    try {
      const context = `Business name: ${site?.businessName || ""}\nTagline: ${site?.tagline || ""}\nAbout: ${site?.about || ""}\nCategory: ${site?.category || ""}\nAccent color: ${site?.accentColor || ""}`;
      const result = await askGeminiJSON(BRAND_GUIDELINES_SYSTEM_PROMPT, context);
      setGuidelines(result);
      await saveSite({ brandGuidelines: result });
    } catch (e) {
      setGuidelinesError(e.message || "Couldn't generate brand guidelines just now.");
    } finally {
      setGuidelinesLoading(false);
    }
  }

  async function generateCharacter() {
    setCharacterLoading(true);
    setCharacterError("");
    try {
      const prompt = buildCharacterPrompt({
        businessName: site?.businessName, category: site?.category, accentColor: site?.accentColor, seedDescription: characterPrompt,
      });
      const imageDataUrl = await generateImage(prompt);
      const next = [...characters, { id: crypto.randomUUID(), imageDataUrl, prompt: characterPrompt.trim(), createdAt: new Date().toISOString() }];
      setCharacters(next);
      setCharacterPrompt("");
      await saveSite({ characters: next });
    } catch (e) {
      setCharacterError(e.message || "Couldn't generate a character just now.");
    } finally {
      setCharacterLoading(false);
    }
  }

  async function deleteCharacter(id) {
    const next = characters.filter((c) => c.id !== id);
    setCharacters(next);
    saveSite({ characters: next }).catch(() => {});
  }

  const hasIdentity = !!site?.businessName;

  return (
    <DashboardShell goTo={goTo} active="brand" businessName={site?.businessName || null} t={(k) => EN_STRINGS[k] || k} speechLang={speechLang}>
      <span onClick={() => goTo("dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: theme.wine, cursor: "pointer", marginBottom: 18 }}>
        <ArrowLeft size={14} /> Back to dashboard
      </span>
      <h1 style={{ fontFamily: theme.fontDisplay, fontSize: 28, color: theme.ink, margin: "0 0 8px" }}>Brand workbench</h1>
      <p style={{ fontSize: 14.5, color: theme.inkSoft, marginBottom: 26, fontFamily: theme.fontBody, maxWidth: 560 }}>
        A working space to build out your brand — AI-generated guidelines to keep your look consistent, and fun mascot characters for your posts and packaging.
      </p>

      {!hasIdentity ? (
        <div style={{ background: theme.wineTint, borderRadius: 14, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 13.5, color: theme.wine, fontWeight: 600 }}>
            Set up your business name and story on the Storefront tab first — guidelines and characters are built from that.
          </p>
          <button onClick={() => goTo("customizeStore")} style={{
            display: "flex", alignItems: "center", gap: 6, background: theme.wine, color: "#fff", border: "none",
            borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            Go to Storefront <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 380px", minWidth: 320 }}>
            <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <BookOpen size={16} color={theme.wine} />
                <p style={{ fontSize: 13.5, fontWeight: 700, color: theme.ink, margin: 0 }}>Brand guidelines</p>
              </div>
              <p style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
                A quick reference for colors, fonts, and voice — so everything you post looks and sounds like the same business.
              </p>

              {guidelinesError && <p style={{ color: "#a32d2d", fontSize: 12.5, marginBottom: 12 }}>{guidelinesError}</p>}
              <button onClick={generateGuidelines} disabled={guidelinesLoading} style={{
                display: "flex", alignItems: "center", gap: 8, background: theme.ink, color: "#fff", border: "none",
                borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: guidelines ? 20 : 0,
              }}>
                {guidelinesLoading ? <Spinner /> : <Wand2 size={14} />} {guidelinesLoading ? "Designing…" : guidelines ? "Regenerate guidelines" : "Generate brand guidelines"}
              </button>

              {guidelines && (
                <div>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: theme.inkSoft, letterSpacing: 0.5, marginBottom: 10 }}>COLOR PALETTE</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                    {(guidelines.palette || []).map((c, i) => (
                      <div key={i} style={{ width: 88 }}>
                        <div style={{ width: "100%", height: 48, borderRadius: 10, background: c.hex, border: `1px solid ${theme.line}`, marginBottom: 6 }} />
                        <p style={{ fontSize: 11, fontWeight: 700, color: theme.ink, margin: "0 0 2px" }}>{c.name}</p>
                        <p style={{ fontSize: 10, color: theme.inkSoft, margin: 0, fontFamily: "monospace" }}>{c.hex}</p>
                        <p style={{ fontSize: 10, color: theme.inkSoft, margin: 0 }}>{c.usage}</p>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: 11.5, fontWeight: 700, color: theme.inkSoft, letterSpacing: 0.5, marginBottom: 10 }}>FONTS</p>
                  <p style={{ fontSize: 13, color: theme.ink, margin: "0 0 4px" }}>
                    <strong>{guidelines.fonts?.heading}</strong> for headings, <strong>{guidelines.fonts?.body}</strong> for body text
                  </p>
                  <p style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 20 }}>{guidelines.fonts?.pairingNote}</p>

                  <p style={{ fontSize: 11.5, fontWeight: 700, color: theme.inkSoft, letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    TONE OF VOICE <SpeakButton text={guidelines.toneOfVoice} lang={speechLang} />
                  </p>
                  <p style={{ fontSize: 13, color: theme.ink, lineHeight: 1.6, marginBottom: 20 }}>{guidelines.toneOfVoice}</p>

                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 160px" }}>
                      <p style={{ fontSize: 11.5, fontWeight: 700, color: "#2c6e49", letterSpacing: 0.5, marginBottom: 8 }}>DO</p>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: theme.ink, lineHeight: 1.7 }}>
                        {(guidelines.dos || []).map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div style={{ flex: "1 1 160px" }}>
                      <p style={{ fontSize: 11.5, fontWeight: 700, color: "#a32d2d", letterSpacing: 0.5, marginBottom: 8 }}>DON'T</p>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: theme.ink, lineHeight: 1.7 }}>
                        {(guidelines.donts || []).map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: "1 1 320px", minWidth: 300 }}>
            <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Smile size={16} color={theme.wine} />
                <p style={{ fontSize: 13.5, fontWeight: 700, color: theme.ink, margin: 0 }}>Brand characters</p>
              </div>
              <p style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
                Cute mascot art for social posts, packaging, or stickers. Describe one, or leave it blank and let the AI invent one that fits.
              </p>

              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
                <textarea rows={2} value={characterPrompt} onChange={(e) => setCharacterPrompt(e.target.value)}
                  placeholder="e.g. a tiny elephant carrying a diya lamp"
                  style={{ flex: 1, minWidth: 0, padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${theme.line}`, fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.cream, resize: "vertical" }} />
                <MicButton size={34} lang={speechLang} onResult={(t) => setCharacterPrompt((v) => (v ? `${v} ${t}` : t))} />
              </div>
              {characterError && <p style={{ color: "#a32d2d", fontSize: 12.5, marginBottom: 12 }}>{characterError}</p>}
              <button onClick={generateCharacter} disabled={characterLoading} style={{
                display: "flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none",
                borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 20,
              }}>
                {characterLoading ? <Spinner /> : <Wand2 size={14} />} {characterLoading ? "Drawing…" : "Generate a character"}
              </button>

              {characters.length === 0 ? (
                <p style={{ fontSize: 13, color: theme.inkSoft }}>Your generated characters will show up here.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 14 }}>
                  {[...characters].reverse().map((c) => (
                    <div key={c.id} style={{ position: "relative" }}>
                      <img src={c.imageDataUrl} alt={c.prompt || "Brand character"} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12, border: `1px solid ${theme.line}` }} />
                      <button onClick={() => deleteCharacter(c.id)} aria-label="Delete character" style={{
                        position: "absolute", top: 6, right: 6, background: "rgba(20,14,16,.6)", border: "none", borderRadius: 8,
                        padding: 5, cursor: "pointer", display: "flex",
                      }}>
                        <Trash2 size={12} color="#fff" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

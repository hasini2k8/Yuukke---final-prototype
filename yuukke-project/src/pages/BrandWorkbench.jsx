import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Wand2, BookOpen, Smile, Trash2, ArrowRight, Image as ImageIcon, Target, MessageCircle, Hash, Lightbulb } from "lucide-react";
import { theme } from "../theme";
import DashboardShell from "../components/DashboardShell";
import { Spinner } from "../components/Shared";
import MicButton from "../components/MicButton";
import SpeakButton from "../components/SpeakButton";
import TalkAnalyseExecuteBar from "../components/TalkAnalyseExecuteBar";
import { useTalkAnalyseExecute } from "../hooks/useTalkAnalyseExecute";
import { generateImage, buildCharacterPrompt, buildEditContext, BRAND_GUIDELINES_SYSTEM_PROMPT } from "../lib/ai";
import { fetchSite, saveSite } from "../lib/site";
import { fetchMyProducts } from "../lib/products";
import { fetchPosters, savePoster, deletePoster } from "../lib/posters";
import { EN_STRINGS } from "../lib/strings";

export default function BrandWorkbenchPage({ goTo, speechLang }) {
  const [site, setSite] = useState(null);
  const [guidelines, setGuidelines] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [characterPrompt, setCharacterPrompt] = useState("");
  const [characterLoading, setCharacterLoading] = useState(false);
  const [characterError, setCharacterError] = useState("");
  const [products, setProducts] = useState([]);
  const [posters, setPosters] = useState([]);
  const [posterBusy, setPosterBusy] = useState({});
  const [posterError, setPosterError] = useState("");
  const autoRan = useRef(false);

  const guidelinesContext = (instruction) => buildEditContext({
    base: `Business name: ${site?.businessName || ""}\nTagline: ${site?.tagline || ""}\nAbout: ${site?.about || ""}\nCategory: ${site?.category || ""}\nAccent color: ${site?.accentColor || ""}`,
    current: guidelines,
    instruction,
  });

  async function applyGuidelines(result) {
    setGuidelines(result);
    await saveSite({ brandGuidelines: result });
  }

  const guidelinesEdit = useTalkAnalyseExecute({
    system: BRAND_GUIDELINES_SYSTEM_PROMPT,
    buildContext: guidelinesContext,
    onExecute: applyGuidelines,
  });

  useEffect(() => {
    fetchSite().then((s) => {
      setSite(s);
      setGuidelines(s?.brandGuidelines || null);
      setCharacters(s?.characters || []);
    }).catch(() => {});
    fetchMyProducts().then(setProducts).catch(() => {});
    fetchPosters().then(setPosters).catch(() => {});
  }, []);

  async function generateProductPoster(product) {
    setPosterBusy((busy) => ({ ...busy, [product.id]: true }));
    setPosterError("");
    try {
      const palette = (guidelines?.palette || []).map((color) => `${color.name} ${color.hex}`).join(", ");
      const prompt = `Create a polished square marketing poster for the real product "${product.name}" from ${site?.businessName}. Product description: ${product.description || ""}. Brand palette: ${palette || site?.accentColor}. Brand voice: ${guidelines?.toneOfVoice || "warm and trustworthy"}. Photography direction: ${guidelines?.photographyStyle || "clean product-led composition"}. Keep the supplied product recognizable and accurate. Add an elegant advertising composition with clear visual hierarchy and room for a short headline, but do not generate unreadable text or invent claims.`;
      const imageDataUrl = await generateImage(prompt, product.imagePreview || "");
      const saved = await savePoster({ productId: product.id, imageDataUrl, prompt, format: "square" });
      setPosters((current) => [saved, ...current]);
    } catch (e) {
      setPosterError(e.message || `Couldn't generate a poster for ${product.name}.`);
    } finally {
      setPosterBusy((busy) => ({ ...busy, [product.id]: false }));
    }
  }

  async function generateAllPosters() {
    for (const product of products) await generateProductPoster(product);
  }

  async function removePoster(id) {
    await deletePoster(id);
    setPosters((current) => current.filter((poster) => poster.id !== id));
  }

  // Talk, analyse, execute — a default set of guidelines appears the moment
  // a business identity exists, with no click required; the talk/type bar
  // below is then how the seller refines it.
  useEffect(() => {
    if (autoRan.current || !site?.businessName || guidelines) return;
    autoRan.current = true;
    guidelinesEdit.run("");
  }, [site, guidelines]);

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
        <>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 380px", minWidth: 320 }}>
            <div style={{ background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <BookOpen size={16} color={theme.wine} />
                <p style={{ fontSize: 13.5, fontWeight: 700, color: theme.ink, margin: 0 }}>Brand guidelines</p>
              </div>
              <p style={{ fontSize: 12, color: theme.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
                A quick reference for colors, fonts, and voice — so everything you post looks and sounds like the same business. A default appears automatically; tell it what to change, by voice or typing.
              </p>

              {!guidelines && guidelinesEdit.busy ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.inkSoft, fontSize: 13, marginBottom: 4 }}>
                  <Spinner size={14} /> Designing your starting guidelines…
                </div>
              ) : (
                <div style={{ marginBottom: guidelines ? 20 : 0 }}>
                  <TalkAnalyseExecuteBar
                    placeholder="e.g. make the tone more playful, add a warmer color to the palette"
                    busy={guidelinesEdit.busy}
                    error={guidelinesEdit.error}
                    onSubmit={guidelinesEdit.run}
                    speechLang={speechLang}
                    busyLabel="Updating…"
                    idleLabel={guidelines ? "Update guidelines" : "Generate guidelines"}
                  />
                  {guidelines && (
                    <button onClick={() => { setGuidelines(null); autoRan.current = false; }} style={{
                      background: "none", border: "none", color: theme.inkSoft, fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: "8px 0 0",
                    }}>
                      Start over from a fresh default
                    </button>
                  )}
                </div>
              )}

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

                  <div style={{ marginTop: 22, paddingTop: 20, borderTop: `1px solid ${theme.line}`, display: "grid", gap: 14 }}>
                    <div style={{ padding: 14, borderRadius: 13, background: theme.cream }}>
                      <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 800, color: theme.wine, margin: "0 0 7px" }}><Target size={14} /> AUDIENCE & POSITIONING</p>
                      <p style={{ fontSize: 12.5, color: theme.ink, lineHeight: 1.55, margin: "0 0 8px" }}><strong>{guidelines.audience?.primary || "Primary customers"}</strong> — {guidelines.positioning || "A distinct, trustworthy small-business brand."}</p>
                      <p style={{ fontSize: 11.5, color: theme.inkSoft, margin: 0 }}>Buying triggers: {(guidelines.audience?.buyingTriggers || []).join(" • ")}</p>
                    </div>
                    <div style={{ padding: 14, borderRadius: 13, background: theme.cream }}>
                      <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 800, color: theme.wine, margin: "0 0 8px" }}><MessageCircle size={14} /> KEY MESSAGES & CAPTION FORMULA</p>
                      <ul style={{ margin: "0 0 9px", paddingLeft: 18, fontSize: 12, color: theme.ink, lineHeight: 1.6 }}>{(guidelines.keyMessages || []).map((message, i) => <li key={i}>{message}</li>)}</ul>
                      <p style={{ fontSize: 11.5, color: theme.inkSoft, margin: 0 }}><strong>Formula:</strong> {guidelines.captionFormula?.structure}<br /><strong>Example:</strong> {guidelines.captionFormula?.example}</p>
                    </div>
                    <div style={{ padding: 14, borderRadius: 13, background: theme.cream }}>
                      <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 800, color: theme.wine, margin: "0 0 8px" }}><Lightbulb size={14} /> CONTENT PILLARS & CAMPAIGNS</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>{(guidelines.contentPillars || []).map((pillar) => <span key={pillar.name} title={pillar.purpose} style={{ padding: "6px 9px", borderRadius: 999, background: theme.white, color: theme.ink, fontSize: 10.5, fontWeight: 700 }}>{pillar.name}</span>)}</div>
                      {(guidelines.campaignIdeas || []).map((campaign) => <p key={campaign.name} style={{ fontSize: 11.5, color: theme.ink, margin: "5px 0" }}><strong>{campaign.name}:</strong> {campaign.idea} <em>{campaign.callToAction}</em></p>)}
                    </div>
                    <div style={{ padding: 14, borderRadius: 13, background: theme.cream }}>
                      <p style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 800, color: theme.wine, margin: "0 0 8px" }}><Hash size={14} /> HASHTAG SETS & VISUAL RULES</p>
                      {(guidelines.hashtagGroups || []).map((group) => <p key={group.name} style={{ fontSize: 11.5, color: theme.ink, lineHeight: 1.5, margin: "5px 0" }}><strong>{group.name}:</strong> {(group.tags || []).join(" ")}</p>)}
                      <p style={{ fontSize: 11.5, color: theme.inkSoft, margin: "9px 0 4px" }}><strong>Photography:</strong> {guidelines.photographyStyle}</p>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: theme.inkSoft, lineHeight: 1.55 }}>{(guidelines.posterRules || []).map((rule, i) => <li key={i}>{rule}</li>)}</ul>
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
        <section style={{ marginTop: 22, background: theme.white, border: `1px solid ${theme.line}`, borderRadius: 18, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
            <div><p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: theme.ink, margin: "0 0 4px" }}><ImageIcon size={17} color={theme.wine} /> AI product poster library</p><p style={{ fontSize: 12, color: theme.inkSoft, margin: 0 }}>Generate on-brand advertising artwork from every real listing image. Posters are saved to the business database for future campaigns.</p></div>
            <button onClick={generateAllPosters} disabled={!products.length || Object.values(posterBusy).some(Boolean)} style={{ display: "flex", alignItems: "center", gap: 7, background: theme.wine, color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer" }}><Wand2 size={13} /> Generate posters for all products</button>
          </div>
          {posterError && <p style={{ color: "#a32d2d", fontSize: 12 }}>{posterError}</p>}
          {!products.length ? <p style={{ fontSize: 12.5, color: theme.inkSoft }}>Create a product listing first. Its image will then appear here.</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            {products.map((product) => {
              const productPosters = posters.filter((poster) => poster.productId === product.id);
              const latest = productPosters[0];
              return <article key={product.id} style={{ border: `1px solid ${theme.line}`, borderRadius: 15, overflow: "hidden", background: theme.cream }}>
                <div style={{ aspectRatio: "1", background: product.previewColor || theme.creamDark, position: "relative", overflow: "hidden" }}>
                  {latest || product.imagePreview ? <img src={latest?.imageDataUrl || product.imagePreview} alt={`${product.name} marketing poster`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center" }}><ImageIcon color={theme.inkSoft} /></div>}
                  {latest && <button onClick={() => removePoster(latest.id)} aria-label={`Delete ${product.name} poster`} style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, border: "none", borderRadius: 9, background: "rgba(25,14,18,.65)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}><Trash2 size={13} /></button>}
                </div>
                <div style={{ padding: 13 }}><p style={{ fontSize: 12.5, fontWeight: 800, color: theme.ink, margin: "0 0 3px" }}>{product.name}</p><p style={{ fontSize: 10.5, color: theme.inkSoft, margin: "0 0 10px" }}>{productPosters.length ? `${productPosters.length} saved poster${productPosters.length === 1 ? "" : "s"}` : "No AI poster yet"}</p><button onClick={() => generateProductPoster(product)} disabled={posterBusy[product.id]} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${theme.line}`, background: theme.white, color: theme.wine, borderRadius: 9, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{posterBusy[product.id] ? <Spinner size={11} /> : <Wand2 size={11} />} {latest ? "Create another version" : "Generate poster"}</button></div>
              </article>;
            })}
          </div>}
        </section>
        </>
      )}
    </DashboardShell>
  );
}

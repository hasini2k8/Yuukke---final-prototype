import React, { useRef, useState } from "react";
import { Bot, Ruler, Camera, Upload, Sparkles, RotateCcw, ArrowRight, X, AlertTriangle, CircleCheck, Volume2, Eye } from "lucide-react";
import { theme } from "../theme";
import { Spinner } from "./Shared";
import { generateSplatFromImage } from "../lib/tripo";
import { getAverageColor } from "../lib/color";
import { askOpenAIVision } from "../lib/ai";
import { speak } from "../lib/speech";
import SplatViewer from "./SplatViewer";

const PHOTO_CHECK_SYSTEM_PROMPT =
  "You are an accessibility assistant for Yuukke, helping a seller who may not be able to see their own uploaded photo clearly (low vision, blindness, or just a small phone screen) confirm it's the right photo before it's used to generate a 3D preview. Describe what's in the photo in 2-3 short plain spoken sentences, as if describing it aloud to someone who can't see it. If the photo looks blurry, too dark, cropped oddly, or doesn't clearly show a single product, say so plainly. Respond with plain text only — no markdown, no JSON.";

function AssistantLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: theme.wineTint, color: theme.wine, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Bot size={14} />
      </div>
      <p style={{ margin: 0, fontSize: 13, color: theme.ink, fontFamily: theme.fontBody, lineHeight: 1.5 }}>{children}</p>
    </div>
  );
}

function ThumbTip() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: theme.wineTint, borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
      <svg width="26" height="26" viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M13 35c-4 0-6-3-6-7V17a3 3 0 0 1 6 0v-6a3 3 0 0 1 6 0v-2a3 3 0 0 1 6 0v9l2-2c1.5-1.5 4-.5 4 2 0 5-3.5 14-10 14Z" fill={theme.wine} opacity="0.85" />
      </svg>
      <p style={{ margin: 0, fontSize: 12, color: theme.ink, lineHeight: 1.5, fontFamily: theme.fontBody }}>
        <strong>No measuring tape handy?</strong> The width of your thumb, just below the nail, is about <strong>1 inch</strong> — lay it beside the product for a quick estimate.
      </p>
    </div>
  );
}

function SideViewGuide() {
  return (
    <div style={{ background: theme.cream, border: `1.5px dashed ${theme.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <svg width="100%" height="110" viewBox="0 0 260 110" fill="none">
        <line x1="20" y1="92" x2="240" y2="92" stroke={theme.line} strokeWidth="2" />
        <g opacity="0.9">
          <path d="M110 92 L110 48 Q110 34 128 34 L150 34 Q166 34 166 50 L166 92 Z" fill={theme.creamDark} stroke={theme.wine} strokeWidth="1.5" />
          <line x1="120" y1="55" x2="156" y2="55" stroke={theme.wine} strokeWidth="1" opacity="0.4" />
          <line x1="120" y1="70" x2="156" y2="70" stroke={theme.wine} strokeWidth="1" opacity="0.4" />
        </g>
        <g transform="translate(28,60)">
          <rect x="0" y="8" width="30" height="20" rx="3" fill={theme.ink} />
          <circle cx="30" cy="18" r="9" fill={theme.ink} />
          <circle cx="30" cy="18" r="4" fill={theme.cream} />
        </g>
        <line x1="58" y1="18" x2="104" y2="60" stroke={theme.wine} strokeWidth="1.2" strokeDasharray="3 3" />
        <line x1="80" y1="98" x2="80" y2="104" stroke={theme.inkSoft} strokeWidth="1" />
        <line x1="196" y1="98" x2="196" y2="104" stroke={theme.inkSoft} strokeWidth="1" />
        <line x1="80" y1="101" x2="196" y2="101" stroke={theme.inkSoft} strokeWidth="1" />
        <text x="138" y="107" fontSize="8" fill={theme.inkSoft} textAnchor="middle" fontFamily="Inter, sans-serif">full width edge-to-edge</text>
      </svg>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: theme.inkSoft, fontFamily: theme.fontBody, lineHeight: 1.5 }}>
        Photograph the product straight-on from the <strong>side</strong>, on a plain background, so its whole silhouette — width and height — is visible edge-to-edge like the diagram above.
      </p>
    </div>
  );
}

function inputStyle() {
  return {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${theme.line}`,
    fontSize: 13.5, fontFamily: theme.fontBody, outline: "none", background: theme.white, color: theme.ink,
  };
}

export default function ProductDetailCard({ draft, onComplete, onCancel, speechLang }) {
  const [step, setStep] = useState("details"); // details | image | generating | result | error
  const [name, setName] = useState(draft.name || "");
  const [length, setLength] = useState(draft.dimensions?.length ? String(draft.dimensions.length) : "");
  const [width, setWidth] = useState(draft.dimensions?.width ? String(draft.dimensions.width) : "");
  const [height, setHeight] = useState(draft.dimensions?.height ? String(draft.dimensions.height) : "");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(draft.imagePreview || "");
  const [progress, setProgress] = useState(0);
  const [modelUrl, setModelUrl] = useState("");
  const [bgColor, setBgColor] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [photoDesc, setPhotoDesc] = useState("");
  const [photoDescStatus, setPhotoDescStatus] = useState("idle"); // idle | analyzing | done | error
  const fileInputRef = useRef(null);

  const dimsValid = [length, width, height].every((v) => v && Number(v) > 0);

  async function describePhoto(dataUrl) {
    setPhotoDescStatus("analyzing");
    try {
      const desc = await askOpenAIVision(
        PHOTO_CHECK_SYSTEM_PROMPT,
        "Describe this product photo for a seller who can't see it clearly right now, and flag anything about the photo quality itself that might be a problem.",
        dataUrl
      );
      setPhotoDesc(desc);
      setPhotoDescStatus("done");
    } catch (e) {
      setPhotoDesc(e.message || "Couldn't check this photo just now.");
      setPhotoDescStatus("error");
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    // A data URL (not an object URL) so the image survives being saved to
    // the backend and shown later in a different browser tab/session —
    // blob: URLs only work within the tab that created them.
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setImagePreview(dataUrl);
      getAverageColor(dataUrl).then(setBgColor);
      describePhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    setStep("generating");
    setProgress(0);
    setErrorMsg("");
    try {
      const output = await generateSplatFromImage(imageFile, setProgress);
      setModelUrl(output.model_url);
      setStep("result");
    } catch (e) {
      setErrorMsg(e.message || "Couldn't generate the 3D model just now.");
      setStep("error");
    }
  }

  function finish(withModel) {
    onComplete({
      name, length: Number(length), width: Number(width), height: Number(height),
      imagePreview, modelUrl: withModel ? modelUrl : "", previewColor: bgColor,
    });
  }

  return (
    <div style={{ background: theme.white, border: `1.5px solid ${theme.wineTint}`, borderRadius: 16, padding: 18, marginTop: 12, animation: "cardIn .3s ease" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <button aria-label="Close" onClick={onCancel} style={{ background: "none", border: "none", color: theme.inkSoft, cursor: "pointer", padding: 4 }}><X size={15} /></button>
      </div>

      {step === "details" && (
        <>
          <AssistantLabel>Great — now let's get its measurements so shoppers know exactly what they're getting.</AssistantLabel>
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>Product name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Indigo table runner" style={inputStyle()} />
          </label>
          <ThumbTip />
          <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>Length (in)</span>
              <input type="number" min="0" step="0.25" value={length} onChange={(e) => setLength(e.target.value)} placeholder="0.0" style={inputStyle()} />
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>Width (in)</span>
              <input type="number" min="0" step="0.25" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="0.0" style={inputStyle()} />
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, display: "block", marginBottom: 6 }}>Height (in)</span>
              <input type="number" min="0" step="0.25" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="0.0" style={inputStyle()} />
            </label>
          </div>
          <button onClick={() => setStep("image")} disabled={!name.trim() || !dimsValid} style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 16, background: theme.wine, color: "#fff", border: "none",
            borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13, cursor: (!name.trim() || !dimsValid) ? "default" : "pointer",
            opacity: (!name.trim() || !dimsValid) ? 0.5 : 1,
          }}>
            Next: add a photo <ArrowRight size={14} />
          </button>
        </>
      )}

      {step === "image" && (
        <>
          <AssistantLabel>Now upload a photo so I can build a rotatable 3D preview of it.</AssistantLabel>
          <SideViewGuide />
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} style={{ display: "none" }} />
          {imagePreview ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <img src={imagePreview} alt="Uploaded product" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: `1px solid ${theme.line}` }} />
                <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, color: theme.ink, cursor: "pointer" }}>
                  Choose a different photo
                </button>
              </div>

              <div style={{ background: theme.cream, borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: theme.wine, letterSpacing: 0.5, margin: "0 0 8px" }}>
                  <Eye size={12} /> PHOTO CHECK
                </p>
                {photoDescStatus === "analyzing" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: theme.inkSoft }}>
                    <Spinner size={12} color={theme.wine} /> Taking a look at your photo…
                  </div>
                )}
                {(photoDescStatus === "done" || photoDescStatus === "error") && (
                  <>
                    <p style={{ fontSize: 12.5, color: theme.ink, margin: "0 0 6px", lineHeight: 1.55 }}>{photoDesc}</p>
                    {photoDescStatus === "done" && (
                      <button onClick={() => speak(photoDesc, speechLang)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: theme.wine, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                        <Volume2 size={12} /> Listen
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "22px 14px",
              border: `1.5px dashed ${theme.wine}`, borderRadius: 12, background: theme.wineTint, color: theme.wine,
              fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 14,
            }}>
              <Upload size={16} /> Upload side-view photo
            </button>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("details")} style={{ background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 12, padding: "11px 18px", fontWeight: 700, fontSize: 13, color: theme.ink, cursor: "pointer" }}>Back</button>
            <button onClick={handleGenerate} disabled={!imageFile} style={{
              display: "flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none",
              borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13, cursor: imageFile ? "pointer" : "default", opacity: imageFile ? 1 : 0.5,
            }}>
              <Sparkles size={14} /> Generate 3D preview
            </button>
          </div>
        </>
      )}

      {step === "generating" && (
        <div style={{ textAlign: "center", padding: "26px 10px" }}>
          <Spinner size={22} color={theme.wine} />
          <p style={{ fontSize: 13, color: theme.ink, fontWeight: 600, margin: "14px 0 4px" }}>Building your rotatable 3D model…</p>
          <p style={{ fontSize: 12, color: theme.inkSoft, margin: 0 }}>{progress > 0 ? `${progress}% complete` : "This usually takes a few minutes."}</p>
        </div>
      )}

      {step === "result" && (
        <>
          <AssistantLabel>Here's the rotatable 3D preview, built to match the measurements you gave.</AssistantLabel>
          <SplatViewer modelUrl={modelUrl} height={260} backgroundColor={bgColor || undefined} />
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 12, marginBottom: 16, flexWrap: "wrap" }}>
            {[["Length", length], ["Width", width], ["Height", height]].map(([label, val]) => (
              <span key={label} style={{ fontSize: 12, color: theme.ink, fontWeight: 600, background: theme.cream, borderRadius: 999, padding: "6px 14px" }}>
                {label}: {val}"
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep("image")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 12, padding: "11px 16px", fontWeight: 700, fontSize: 13, color: theme.ink, cursor: "pointer" }}>
              <RotateCcw size={13} /> Retry with another photo
            </button>
            <button onClick={() => finish(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "11px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <CircleCheck size={14} /> Save to listing
            </button>
          </div>
        </>
      )}

      {step === "error" && (
        <div style={{ padding: "6px 2px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fdf0ea", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <AlertTriangle size={16} color="#a3512c" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12.5, color: "#7a3a1f", lineHeight: 1.5 }}>{errorMsg}</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setStep("image")} style={{ display: "flex", alignItems: "center", gap: 6, background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "11px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <RotateCcw size={13} /> Try again
            </button>
            <button onClick={() => finish(false)} style={{ background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 12, padding: "11px 16px", fontWeight: 700, fontSize: 13, color: theme.ink, cursor: "pointer" }}>
              Save measurements without 3D preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useRef, useState } from "react";
import { Camera, X, AlertTriangle } from "lucide-react";
import { theme } from "../theme";
import { Spinner } from "./Shared";
import { generateSplatFromImage } from "../lib/tripo";
import ARPlayboard from "./ARPlayboard";

// Captures a photo of the customer's space, converts it into a real 3D scene
// via Tripo3D (a real paid generation), then hands off to ARPlayboard where
// the product's 3D model can be dragged/resized on top of it.
export default function TryInSpaceModal({ productModelUrl, productColor, productName, onClose }) {
  const [step, setStep] = useState("capture"); // capture | generating | playboard | error
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [progress, setProgress] = useState(0);
  const [bgModelUrl, setBgModelUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleGenerate() {
    setStep("generating");
    setProgress(0);
    setErrorMsg("");
    try {
      const output = await generateSplatFromImage(photoFile, setProgress);
      setBgModelUrl(output.model_url);
      setStep("playboard");
    } catch (e) {
      setErrorMsg(e.message || "Couldn't build a 3D scene from that photo.");
      setStep("error");
    }
  }

  if (step === "playboard") {
    return (
      <ARPlayboard
        backgroundModelUrl={bgModelUrl}
        productModelUrl={productModelUrl}
        productColor={productColor}
        onClose={onClose}
      />
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,14,16,.7)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ background: theme.white, borderRadius: 20, padding: 28, maxWidth: 420, width: "100%", position: "relative" }}>
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: theme.inkSoft, cursor: "pointer" }}>
          <X size={18} />
        </button>

        {step === "capture" && (
          <>
            <p style={{ fontSize: 12, fontWeight: 700, color: theme.wine, letterSpacing: 1.5, margin: "0 0 6px" }}>SEE IT IN YOUR SPACE</p>
            <h3 style={{ fontFamily: theme.fontDisplay, fontSize: 20, color: theme.ink, margin: "0 0 10px" }}>
              Photograph where {productName ? `"${productName}"` : "it"} would go
            </h3>
            <p style={{ fontSize: 13, color: theme.inkSoft, marginBottom: 18, lineHeight: 1.6 }}>
              Take or upload a photo of the spot — a shelf, table, or corner. Yuukke will turn it into a 3D scene you can place the product into and move around.
            </p>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
            {photoPreview ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <img src={photoPreview} alt="Your space" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: `1px solid ${theme.line}` }} />
                <button onClick={() => inputRef.current?.click()} style={{ background: "none", border: `1.5px solid ${theme.line}`, borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, color: theme.ink, cursor: "pointer" }}>
                  Choose a different photo
                </button>
              </div>
            ) : (
              <button onClick={() => inputRef.current?.click()} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "22px 14px",
                border: `1.5px dashed ${theme.wine}`, borderRadius: 12, background: theme.wineTint, color: theme.wine,
                fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 18,
              }}>
                <Camera size={16} /> Take or upload a photo
              </button>
            )}
            <button onClick={handleGenerate} disabled={!photoFile} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: theme.wine, color: "#fff", border: "none",
              borderRadius: 12, padding: "13px 20px", fontWeight: 700, fontSize: 13.5, cursor: photoFile ? "pointer" : "default", opacity: photoFile ? 1 : 0.5,
            }}>
              Build my 3D space
            </button>
          </>
        )}

        {step === "generating" && (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <Spinner size={22} color={theme.wine} />
            <p style={{ fontSize: 13, color: theme.ink, fontWeight: 600, margin: "14px 0 4px" }}>Turning your photo into a 3D space…</p>
            <p style={{ fontSize: 12, color: theme.inkSoft, margin: 0 }}>{progress > 0 ? `${progress}% complete` : "This usually takes a few minutes."}</p>
          </div>
        )}

        {step === "error" && (
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fdf0ea", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <AlertTriangle size={16} color="#a3512c" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12.5, color: "#7a3a1f", lineHeight: 1.5 }}>{errorMsg}</p>
            </div>
            <button onClick={() => setStep("capture")} style={{ background: theme.wine, color: "#fff", border: "none", borderRadius: 12, padding: "11px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

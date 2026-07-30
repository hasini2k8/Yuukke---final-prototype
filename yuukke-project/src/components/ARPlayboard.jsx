import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { Move, Maximize2, RotateCcw, X } from "lucide-react";
import { theme } from "../theme";
import SplatGroup from "./SplatGroup";
import { ProductStandIn } from "./PlaceholderModel";

function toolBtn(active) {
  return {
    display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 999, padding: "9px 16px",
    fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: theme.fontBody,
    background: active ? theme.wine : "transparent", color: "#fff",
  };
}

// Composites the customer's own captured-and-converted 3D scene (background)
// with the product's 3D model (foreground) in one scene. The product is
// wrapped in drei's TransformControls gizmo so it can be dragged (move mode)
// or scaled (resize mode) — makeDefault on OrbitControls lets TransformControls
// automatically suspend camera orbiting while the gizmo is being dragged.
export default function ARPlayboard({ backgroundModelUrl, productModelUrl, productColor, onClose }) {
  const [mode, setMode] = useState("translate");
  const [resetKey, setResetKey] = useState(0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0c0809" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, display: "flex",
        alignItems: "center", justifyContent: "space-between", padding: "14px 20px",
        background: "linear-gradient(rgba(0,0,0,.55), transparent)",
      }}>
        <span style={{ color: "#fff", fontWeight: 700, fontFamily: theme.fontDisplay, fontSize: 16 }}>See it in your space</span>
        <button onClick={onClose} aria-label="Close" style={{
          background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: 34, height: 34,
          color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={17} />
        </button>
      </div>

      <Canvas camera={{ position: [0, 0.4, 3], fov: 50 }} onContextMenu={(e) => e.preventDefault()}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 3, 2]} intensity={0.8} />

        <SplatGroup url={backgroundModelUrl} position={[0, 0, -1]} scale={2.2} />

        <TransformControls key={resetKey} mode={mode} size={0.8}>
          {productModelUrl ? (
            <SplatGroup url={productModelUrl} position={[0, -0.3, 0.6]} scale={0.5} />
          ) : (
            <group position={[0, -0.3, 0.6]}>
              <ProductStandIn color={productColor} />
            </group>
          )}
        </TransformControls>

        <OrbitControls makeDefault enablePan={false} minDistance={1} maxDistance={8} />
      </Canvas>

      <div style={{
        position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 2,
        display: "flex", gap: 10, background: "rgba(20,14,16,.75)", padding: 8, borderRadius: 999,
      }}>
        <button onClick={() => setMode("translate")} aria-label="Move product" style={toolBtn(mode === "translate")}><Move size={16} /> Move</button>
        <button onClick={() => setMode("scale")} aria-label="Resize product" style={toolBtn(mode === "scale")}><Maximize2 size={16} /> Resize</button>
        <button onClick={() => setResetKey((k) => k + 1)} aria-label="Reset product position" style={toolBtn(false)}><RotateCcw size={16} /> Reset</button>
      </div>
    </div>
  );
}

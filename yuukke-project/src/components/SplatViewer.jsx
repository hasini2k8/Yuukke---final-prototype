import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AlertTriangle } from "lucide-react";
import { theme } from "../theme";
import SplatGroup from "./SplatGroup";

export default function SplatViewer({ modelUrl, height = 320, backgroundColor = "#171012" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: "relative", width: "100%", height, borderRadius: 16, overflow: "hidden", background: backgroundColor, userSelect: "none" }}
    >
      <Canvas camera={{ position: [0, 0, 2.6], fov: 42 }} dpr={[1, 1.5]} onContextMenu={(e) => e.preventDefault()}>
        <color attach="background" args={[backgroundColor]} />
        <ambientLight intensity={1.2} />
        <SplatGroup
          url={modelUrl}
          onLoaded={() => setLoading(false)}
          onError={(e) => { setError(e?.message || "Couldn't load the 3D preview."); setLoading(false); }}
        />
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={1.3} minDistance={1} maxDistance={6} />
      </Canvas>
      {(loading || error) && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, color: "#fff", fontSize: 12.5, fontFamily: theme.fontBody, textAlign: "center", padding: 16,
          background: "rgba(20,14,16,.55)", pointerEvents: "none",
        }}>
          {error ? (<><AlertTriangle size={15} color={theme.gold} /> {error}</>) : "Loading rotatable preview…"}
        </div>
      )}
      {!loading && !error && (
        <span style={{
          position: "absolute", bottom: 10, left: 12, fontSize: 10.5, color: "rgba(255,255,255,.75)",
          fontFamily: theme.fontBody, letterSpacing: 0.5,
        }}>
          Drag to rotate · scroll to zoom
        </span>
      )}
    </div>
  );
}

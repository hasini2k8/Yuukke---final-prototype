import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { theme } from "../theme";

// A lightweight, zero-cost stand-in 3D shape — used for the marketplace demo
// listings (no real Tripo3D generation spent on them) and as the AR
// play board's product fallback when a real generated model isn't available.
export function ProductStandIn({ color = theme.wine, scale = 1 }) {
  const meshRef = useRef();
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.6;
  });
  return (
    <mesh ref={meshRef} scale={scale}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color={color} metalness={0.15} roughness={0.45} />
    </mesh>
  );
}

export default function PlaceholderViewer({ color = theme.wine, height = 180 }) {
  return (
    <div style={{ height, overflow: "hidden", background: `linear-gradient(160deg, ${color}22, ${theme.creamDark})` }}>
      <Canvas camera={{ position: [0, 0, 2.2], fov: 40 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 2]} intensity={1} />
        <ProductStandIn color={color} />
      </Canvas>
    </div>
  );
}

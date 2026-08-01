import React from "react";
import { Sparkles } from "lucide-react";
import { theme } from "../theme";

// Shared thumbnail box for a post's media — used on calendar cards and the
// storefront's generated-posts panel so the img/video/placeholder branch
// only lives in one place.
export default function PostThumb({ imageDataUrl, videoUrl, height = 90, radius = 8 }) {
  const boxStyle = { width: "100%", height, borderRadius: radius, overflow: "hidden", background: theme.creamDark, flexShrink: 0 };
  if (videoUrl) {
    return (
      <div style={boxStyle}>
        <video src={videoUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  if (imageDataUrl) {
    return (
      <div style={boxStyle}>
        <img src={imageDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{ ...boxStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Sparkles size={Math.round(height * 0.28)} color={theme.inkSoft} />
    </div>
  );
}

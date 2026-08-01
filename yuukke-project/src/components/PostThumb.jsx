import React from "react";
import { Sparkles, Film } from "lucide-react";
import { theme } from "../theme";

// Shared thumbnail box for a post's media — used on calendar cards and the
// storefront's generated-posts panel so the img/video/placeholder branch
// only lives in one place.
export default function PostThumb({ imageDataUrl, videoUrl, height = 90, radius = 8 }) {
  const boxStyle = { width: "100%", height, borderRadius: radius, overflow: "hidden", background: theme.creamDark, flexShrink: 0, position: "relative" };
  if (videoUrl) {
    return (
      <div style={boxStyle}>
        {/* autoPlay+loop so the thumbnail itself shows motion — without
            this a successfully-generated video just freezes on its first
            frame and looks indistinguishable from a plain image. The
            small film-icon badge is a second, explicit "this is a video"
            signal for anyone whose browser blocks autoplay. */}
        <video src={videoUrl} muted autoPlay loop playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{
          position: "absolute", top: 6, left: 6, background: "rgba(20,14,16,.65)", borderRadius: 6,
          width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Film size={11} color="#fff" />
        </div>
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

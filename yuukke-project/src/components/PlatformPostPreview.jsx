import React from "react";
import { Heart, MessageCircle, Send, Bookmark, ThumbsUp, Repeat2, MoreHorizontal, Sparkles } from "lucide-react";
import { theme } from "../theme";

// Platform-styled mockup cards so a seller can see roughly how a generated
// post will actually look before scheduling it — inspired by the preview
// pattern in SamurAIGPT/social-post. Each variant intentionally breaks from
// the app's own theme colors to mimic the real platform's look; engagement
// numbers are fixed placeholders (standard in compose-preview tools), not
// real data.
function Avatar({ logoDataUrl, businessName, size = 36, radius = "50%" }) {
  return logoDataUrl ? (
    <img src={logoDataUrl} alt="" style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0, background: theme.wineTint, color: theme.wine,
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.4,
    }}>
      {businessName?.trim()[0]?.toUpperCase() || <Sparkles size={size * 0.45} />}
    </div>
  );
}

function InstagramPreview({ businessName, logoDataUrl, caption, imageDataUrl, videoUrl }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #dbdbdb", fontFamily: "Helvetica, Arial, sans-serif", maxWidth: 380 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        <Avatar logoDataUrl={logoDataUrl} businessName={businessName} size={32} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#262626", flex: 1 }}>{businessName || "your_business"}</span>
        <MoreHorizontal size={18} color="#262626" />
      </div>
      <div style={{ width: "100%", aspectRatio: "1", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {videoUrl ? (
          <video src={videoUrl} controls playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : imageDataUrl ? (
          <img src={imageDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Sparkles size={28} color="#bbb" />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px 4px" }}>
        <Heart size={22} color="#262626" />
        <MessageCircle size={22} color="#262626" />
        <Send size={20} color="#262626" />
        <Bookmark size={20} color="#262626" style={{ marginLeft: "auto" }} />
      </div>
      <div style={{ padding: "0 12px 14px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#262626", margin: "2px 0 4px" }}>142 likes</p>
        <p style={{ fontSize: 13, color: "#262626", margin: 0, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600 }}>{businessName || "your_business"}</span> {caption}
        </p>
      </div>
    </div>
  );
}

function LinkedInPreview({ businessName, logoDataUrl, caption, imageDataUrl, videoUrl }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid #e0e0e0", fontFamily: "Helvetica, Arial, sans-serif", maxWidth: 420 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px 8px" }}>
        <Avatar logoDataUrl={logoDataUrl} businessName={businessName} size={44} radius="8px" />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#000", margin: 0 }}>{businessName || "Your Business"}</p>
          <p style={{ fontSize: 12, color: "#666", margin: "2px 0 0" }}>Business · <span>2h</span> · 🌐</p>
        </div>
        <MoreHorizontal size={18} color="#666" />
      </div>
      <p style={{ fontSize: 13.5, color: "#000", margin: "0 0 10px", padding: "0 14px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{caption}</p>
      <div style={{ width: "100%", background: "#f4f2ee", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160 }}>
        {videoUrl ? (
          <video src={videoUrl} controls playsInline style={{ width: "100%", maxHeight: 300, objectFit: "cover" }} />
        ) : imageDataUrl ? (
          <img src={imageDataUrl} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover" }} />
        ) : (
          <Sparkles size={28} color="#aaa" />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "8px 6px", borderTop: "1px solid #eee" }}>
        {[[ThumbsUp, "Like"], [MessageCircle, "Comment"], [Repeat2, "Repost"], [Send, "Send"]].map(([Icon, label]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#666", fontWeight: 600 }}>
            <Icon size={16} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const VARIANTS = { instagram: InstagramPreview, linkedin: LinkedInPreview };

export default function PlatformPostPreview({ platform, businessName, logoDataUrl, caption, imageDataUrl, videoUrl }) {
  const Variant = VARIANTS[platform];
  if (!Variant) return null;
  return <Variant businessName={businessName} logoDataUrl={logoDataUrl} caption={caption} imageDataUrl={imageDataUrl} videoUrl={videoUrl} />;
}

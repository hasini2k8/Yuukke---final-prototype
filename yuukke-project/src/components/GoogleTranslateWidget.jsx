import React, { useEffect } from "react";
import { theme } from "../theme";

const SCRIPT_ID = "google-translate-script";
const ELEMENT_ID = "google_translate_element";

// Automatic page translation via Google's own (non-AI, no API key needed)
// website translator widget — mounted once at the top level in main.jsx so
// it survives client-side route changes instead of re-initializing per page.
export default function GoogleTranslateWidget() {
  useEffect(() => {
    if (window.google?.translate?.TranslateElement) return; // already initialized

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: "en", autoDisplay: false },
        ELEMENT_ID
      );
    };

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div style={{
      position: "fixed", top: 10, right: 10, zIndex: 500, background: theme.white,
      borderRadius: 10, boxShadow: "0 4px 14px rgba(0,0,0,.12)", padding: "2px 6px",
    }}>
      <div id={ELEMENT_ID} />
    </div>
  );
}

import { useRef, useState } from "react";

export function speak(text, lang) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || "en-IN";
  window.speechSynthesis.speak(u);
}

// Wraps the (webkit-prefixed) SpeechRecognition API. Falls back gracefully
// (supported === false) in browsers that don't implement it — voice input
// is an enhancement, typing always still works.
export function useVoiceInput(lang, onResult) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const supported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  function toggle() {
    if (!supported) return;
    if (listening) {
      recRef.current && recRef.current.stop();
      setListening(false);
      return;
    }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = lang || "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => onResult(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return { listening, toggle, supported: !!supported };
}

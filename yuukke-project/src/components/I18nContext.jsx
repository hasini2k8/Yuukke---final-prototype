import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { translateStrings } from "../lib/i18n";

const I18nContext = createContext(null);
const DEFAULT_LANGUAGE = { code: "en", name: "English", native: "English", speech: "en-IN" };

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [dict, setDict] = useState({}); // { [langCode]: { [englishText]: translatedText } }
  const [translating, setTranslating] = useState(false);
  const pendingRef = useRef(new Set());

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang || DEFAULT_LANGUAGE);
  }, []);

  // Pages call this with every static string they render, so the current
  // language's translations get fetched (once, batched, cached) the first
  // time each string is actually needed.
  const ensureTranslated = useCallback(async (strings) => {
    if (!strings || !strings.length || language.code === "en") return;
    const have = dict[language.code] || {};
    const missing = [...new Set(strings)].filter((s) => s && !(s in have) && !pendingRef.current.has(s));
    if (!missing.length) return;
    missing.forEach((s) => pendingRef.current.add(s));
    setTranslating(true);
    try {
      const translated = await translateStrings(missing, language.name);
      setDict((d) => {
        const langDict = { ...(d[language.code] || {}) };
        missing.forEach((s, i) => { langDict[s] = translated[i] || s; });
        return { ...d, [language.code]: langDict };
      });
    } catch {
      // silently fall back to English for these strings
    } finally {
      missing.forEach((s) => pendingRef.current.delete(s));
      setTranslating(false);
    }
  }, [language, dict]);

  const t = useCallback((str) => {
    if (!str || language.code === "en") return str;
    return (dict[language.code] && dict[language.code][str]) || str;
  }, [language, dict]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, ensureTranslated, translating }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// Convenience hook for pages: declare every static string once, get back a
// t() bound to this page that re-fetches whenever the language changes.
export function usePageTranslation(strings) {
  const { t, ensureTranslated, language } = useI18n();
  useEffect(() => {
    ensureTranslated(strings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language.code]);
  return t;
}

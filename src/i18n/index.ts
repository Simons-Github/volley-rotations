import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de from "./de.json";
import en from "./en.json";

export const LANGUAGES = ["de", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * Initialised with "en" so server render and first hydration match.
 * The detected/stored language is applied after mount (see useSettings).
 */
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { de: { translation: de }, en: { translation: en } },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
} else {
  // Dev reload keeps the i18next singleton, so replace bundles when locale files change.
  i18n.addResourceBundle("de", "translation", de, true, true);
  i18n.addResourceBundle("en", "translation", en, true, true);
}

export function detectLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("vb.language");
  if (stored === "de" || stored === "en") return stored;
  const browser = window.navigator.language?.slice(0, 2).toLowerCase();
  return browser === "de" ? "de" : "en";
}

export default i18n;

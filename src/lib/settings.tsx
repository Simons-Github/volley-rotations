import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";

import { detectLanguage, translators, type Language } from "@/i18n";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveLanguage,
  saveSettings,
  type Settings,
} from "@/lib/storage";

interface SettingsContextValue extends Settings {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleReduceMotion: () => void;
  toggleSound: () => void;
  toggleLibero: () => void;
  /** true when either the user setting or the OS preference asks for less motion */
  calmMotion: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [language, setLanguageState] = useState<Language>("en");
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setLanguageState(detectLanguage());

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const onChange = () => setPrefersReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      language,
      calmMotion: settings.reduceMotion || prefersReduced,
      setLanguage: (lang) => {
        setLanguageState(lang);
        saveLanguage(lang);
      },
      toggleReduceMotion: () =>
        setSettings((s) => {
          const next = { ...s, reduceMotion: !s.reduceMotion };
          saveSettings(next);
          return next;
        }),
      toggleLibero: () =>
        setSettings((s) => {
          const next = { ...s, libero: !s.libero };
          saveSettings(next);
          return next;
        }),
      toggleSound: () =>
        setSettings((s) => {
          const next = { ...s, sound: !s.sound };
          saveSettings(next);
          return next;
        }),
    }),
    [settings, language, prefersReduced],
  );

  return (
    <SettingsContext.Provider value={value}>
      <I18nextProvider i18n={translators[language]}>{children}</I18nextProvider>
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

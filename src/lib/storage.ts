/** localStorage helpers: settings + per-question results (stats can be added later). */

export interface QuestionResult {
  mode: "quiz" | "serve" | "receive" | "base";
  correct: boolean;
  at: number;
  detail?: Record<string, string | number | boolean>;
}

const RESULTS_KEY = "vb.results";
const SETTINGS_KEY = "vb.settings";
const ONBOARDING_KEY = "vb.onboarded";

export interface Settings {
  reduceMotion: boolean;
  sound: boolean;
  /** Play with a libero (replaces the back-row middle). */
  libero: boolean;
}

export const DEFAULT_SETTINGS: Settings = { reduceMotion: false, sound: false, libero: true };

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...safeRead<Partial<Settings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: Settings) {
  safeWrite(SETTINGS_KEY, settings);
}

export function loadResults(): QuestionResult[] {
  return safeRead<QuestionResult[]>(RESULTS_KEY, []);
}

export function recordResult(result: QuestionResult) {
  const all = loadResults();
  all.push(result);
  safeWrite(RESULTS_KEY, all.slice(-500));
}

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function setOnboarded() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, "1");
}

export function saveLanguage(lang: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("vb.language", lang);
}

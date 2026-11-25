import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Onboarding } from "@/components/Onboarding";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", key: "learn" },
  { to: "/quiz", key: "quiz" },
] as const;

const toggleClass = (on: boolean) =>
  cn(
    "tap-target rounded-lg border border-border px-3 text-sm font-bold transition-colors",
    on ? "bg-ink text-court-line" : "bg-card text-muted-foreground hover:text-foreground",
  );

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { language, setLanguage, reduceMotion, toggleReduceMotion, sound, toggleSound } =
    useSettings();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-12 pt-4 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
          <div>
            <h1 className="heading-impact text-3xl text-foreground sm:text-4xl">
              <span className="mr-2 inline-block rounded-md bg-primary px-2 pb-0.5">5-1</span>
              {t("app.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
          </div>
          <nav className="flex gap-1" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="tap-target flex items-center border-b-4 border-transparent px-3 font-display text-xl font-extrabold text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground"
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label={t("app.language")}
            className="flex overflow-hidden rounded-lg border border-border"
          >
            {(["de", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                aria-pressed={language === lang}
                className={cn(
                  "tap-target px-3 text-sm font-bold",
                  language === lang ? "bg-ink text-court-line" : "bg-card text-muted-foreground",
                )}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={toggleReduceMotion}
            aria-pressed={reduceMotion}
            title={t("app.reduceMotion")}
            aria-label={t("app.reduceMotion")}
            className={toggleClass(reduceMotion)}
          >
            ⚡
          </button>
          <button
            onClick={toggleSound}
            aria-pressed={sound}
            title={t("app.sound")}
            aria-label={t("app.sound")}
            className={toggleClass(sound)}
          >
            {sound ? "♪" : "✕"}
          </button>
        </div>
      </header>

      <main className="mt-6 flex-1">{children}</main>
      <Onboarding />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/AppShell";
import { Court } from "@/components/Court";
import { PlayerToken, ROLE_COLOR } from "@/components/PlayerToken";
import { RotationControls } from "@/components/RotationControls";
import {
  BASE_SLOTS,
  FRONT_ROW,
  frontRowAttackers,
  isFrontRow,
  lineupForRotation,
  rotate,
  getRotationNumber,
  rotationNumber,
  setterPositionForRotation,
} from "@/domain/rotation";
import { POSITIONS, type Position } from "@/domain/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "5-1 Rotation Rally — Learn the volleyball rotation" },
      {
        name: "description",
        content:
          "Explore all six rotations of the volleyball 5-1 system: role colours, front and back row, and what a side-out does.",
      },
      { property: "og:title", content: "5-1 Rotation Rally — Learn the volleyball rotation" },
      {
        property: "og:description",
        content: "Visual, mobile-first drills for beginners learning the volleyball 5-1 rotation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const { t } = useTranslation();
  const [rotation, setRotation] = useState<Position>(1);
  const [moving, setMoving] = useState(false);

  const lineup = lineupForRotation(rotation);
  const attackers = frontRowAttackers(lineup);

  useEffect(() => {
    if (!moving) return;
    const timer = setTimeout(() => setMoving(false), 850);
    return () => clearTimeout(timer);
  }, [moving]);

  const sideOut = () => {
    setMoving(true);
    setRotation(getRotationNumber(rotate(lineup)));
  };

  return (
    <AppShell>
      <h2 className="heading-impact mb-4 text-4xl text-foreground sm:text-5xl">
        {t("learn.heading")}
      </h2>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Court motionLines={moving}>
          {POSITIONS.map((p) => (
            <span
              key={`slot-${p}`}
              className="absolute z-0 -translate-x-1/2 -translate-y-1/2 font-display text-[clamp(1.8rem,10cqw,3rem)] font-extrabold text-court-line/25"
              style={{ left: `${BASE_SLOTS[p].x * 100}%`, top: `${BASE_SLOTS[p].y * 100}%` }}
            >
              {p}
            </span>
          ))}
          {POSITIONS.map((p) => (
            <PlayerToken
              key={lineup[p]}
              pos={p}
              role={lineup[p]}
              coord={BASE_SLOTS[p]}
              frontRow={isFrontRow(p)}
              highlighted={lineup[p] === "S"}
            />
          ))}
        </Court>

        <div className="flex flex-col gap-4">
          <RotationControls
            rotation={rotationNumber(rotation)}
            onRotationChange={(n) => setRotation(setterPositionForRotation(n))}
            onSideOut={sideOut}
            onReset={() => setRotation(1)}
          />

          <div className="panel p-4">
            <p className="text-sm leading-relaxed text-card-foreground">
              {t(`learn.notes.${rotation}`)}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-secondary p-2">
                <dt className="text-xs font-bold text-muted-foreground">{t("learn.attackers")}</dt>
                <dd className="font-display text-2xl font-extrabold text-foreground">
                  {attackers.length}
                </dd>
              </div>
              <div className="rounded-lg bg-secondary p-2">
                <dt className="text-xs font-bold text-muted-foreground">{t("roles.S")}</dt>
                <dd className="text-xs font-bold text-card-foreground">
                  {t("learn.setterRow", {
                    row: isFrontRow(rotation) ? t("common.front") : t("common.back"),
                  })}
                </dd>
              </div>
            </dl>

            <ul className="mt-3 flex flex-wrap gap-2">
              {POSITIONS.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground"
                >
                  <span
                    className={`h-4 w-4 rounded-full border border-ink/50 ${ROLE_COLOR[lineup[p]]} ${
                      FRONT_ROW.includes(p) ? "ring-2 ring-primary-foreground/60" : ""
                    }`}
                  />
                  {t(`roles.${lineup[p]}`)} · {p}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.65rem] text-muted-foreground">
              {t("court.front")}: 4 · 3 · 2 — {t("court.back")}: 5 · 6 · 1
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

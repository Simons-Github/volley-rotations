import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/AppShell";
import { Court } from "@/components/Court";
import { ExplanationCard } from "@/components/ExplanationCard";
import { PlayerToken } from "@/components/PlayerToken";
import {
  BASE_FORMATIONS,
  BASE_SLOTS,
  RECEIVE_FORMATIONS,
  SERVE_FORMATIONS,
  getRotationNumber,
  isFrontRow,
  isPasserAt,
  lineupForPhase,
  rotationNumber,
  validateBasePositions,
  validateOverlap,
  validateServeFormation,
  type Phase,
} from "@/domain/rotation";
import { POSITIONS, type Coord, type Coords, type Position, type Role } from "@/domain/types";
import { useSettings } from "@/lib/settings";
import { recordResult } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz — 5-1 Rotation Rally" },
      {
        name: "description",
        content:
          "Drag your players into a legal serving or serve-receive formation for any of the six 5-1 rotations.",
      },
      { property: "og:title", content: "Quiz — 5-1 Rotation Rally" },
      {
        property: "og:description",
        content: "Learn serve and serve-receive formations of the 5-1 system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizPage,
});

type Mode = "mixed" | Phase;

const COURT_MIN = 0.06;
const COURT_MAX = 0.94;
/** Hitters may wait just outside the sidelines before their approach. */
const SIDE_MIN = -0.14;
const SIDE_MAX = 1.14;
/** The server may stand anywhere behind the end line, up to this depth. */
const SERVICE_MAX_Y = 1.12;

const randomRotation = () => (Math.floor(Math.random() * 6) + 1) as Position;

function clampTo(phase: Phase, pos: Position, x: number, y: number, wide = false): Coord {
  const maxY = phase === "serve" && pos === 1 ? SERVICE_MAX_Y : COURT_MAX;
  return {
    x: wide
      ? Math.min(SIDE_MAX, Math.max(SIDE_MIN, x))
      : Math.min(COURT_MAX, Math.max(COURT_MIN, x)),
    y: Math.min(maxY, Math.max(COURT_MIN, y)),
  };
}

function QuizPage() {
  const { t } = useTranslation();
  const { libero, toggleLibero } = useSettings();
  const courtRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<Mode>("mixed");
  const [rotation, setRotation] = useState<Position>(1);
  const [phase, setPhase] = useState<Phase>("receive");
  const [coords, setCoords] = useState<Coords>(BASE_SLOTS);
  const [selected, setSelected] = useState<Position | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [stage, setStage] = useState<"formation" | "base">("formation");
  const draggedRef = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const next = useCallback((nextMode: Mode) => {
    const nextRotation = randomRotation();
    setRotation(nextRotation);
    setPhase(nextMode === "mixed" ? (Math.random() < 0.5 ? "serve" : "receive") : nextMode);
    setCoords(BASE_FORMATIONS[nextRotation]);
    setSubmitted(false);
    setStage("formation");
    setSelected(null);
  }, []);

  useEffect(() => {
    next("mixed");
  }, [next]);

  const changeMode = (m: Mode) => {
    setMode(m);
    next(m);
  };

  const lineup = lineupForPhase(rotation, phase, libero);
  const inBase = stage === "base";
  const violations = phase === "serve" ? validateServeFormation(coords) : validateOverlap(coords);
  const baseWrong = inBase ? validateBasePositions(coords, rotation) : [];
  const legal = inBase ? baseWrong.length === 0 : violations.length === 0;
  const locked = submitted && legal;
  const showErrors = submitted && !legal;
  const violating = new Set<Position>(
    showErrors ? (inBase ? baseWrong : violations.flatMap((v) => v.pair)) : [],
  );
  const solution = inBase
    ? BASE_FORMATIONS[rotation]
    : phase === "serve"
      ? SERVE_FORMATIONS[rotation]
      : RECEIVE_FORMATIONS[rotation];
  const isPasser = (pos: Position) => phase === "receive" && !inBase && isPasserAt(lineup, pos);
  const shownPhase = inBase ? "base" : phase;

  const moveBy = (pos: Position, dx: number, dy: number) => {
    if (locked) return;
    setCoords((c) => ({ ...c, [pos]: clampTo(phase, pos, c[pos].x + dx, c[pos].y + dy, inBase) }));
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    if (locked) return;
    draggedRef.current = true;
    setSelected(Number(active.id) as Position);
  };

  const onDragEnd = ({ active, delta }: DragEndEvent) => {
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
    if (locked) return;
    const rect = courtRef.current?.getBoundingClientRect();
    if (!rect) return;
    moveBy(Number(active.id) as Position, delta.x / rect.width, delta.y / rect.height);
  };

  const onDragCancel = () => {
    draggedRef.current = false;
  };

  const submit = () => {
    if (locked) return;
    setSubmitted(true);
    recordResult({
      mode: inBase ? "base" : phase,
      correct: legal,
      at: Date.now(),
      detail: { rotation, violations: inBase ? baseWrong.length : violations.length },
    });
  };

  const explanation = !legal
    ? t(inBase ? "quiz.explanationBaseBad" : "quiz.explanationBad")
    : inBase
      ? t("quiz.explanationBase")
      : phase === "serve"
        ? t("quiz.explanationOkServe")
        : t("quiz.explanationOkReceive");

  const startBase = () => {
    setCoords(RECEIVE_FORMATIONS[rotation]);
    setStage("base");
    setSubmitted(false);
    setSelected(null);
  };

  const primaryBtn =
    "tap-target flex-1 rounded-xl bg-primary px-5 font-display text-xl font-extrabold text-primary-foreground shadow-[0_2px_0_oklch(0.22_0.03_250/35%)] transition-transform active:translate-y-px disabled:opacity-50";
  const quietBtn =
    "tap-target rounded-xl border border-input bg-card px-4 text-sm font-bold text-foreground hover:bg-secondary";

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <h2 className="heading-impact text-4xl text-foreground sm:text-5xl">
            {t(`quiz.phases.${shownPhase}`)}
          </h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {t("quiz.rotationLabel", { n: rotationNumber(rotation) })},{" "}
            {t("quiz.setterAt", { pos: getRotationNumber(lineup) })}
          </p>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-foreground">
          {t(`quiz.instruction.${shownPhase}`)}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div
          onKeyDown={(e) => {
            if (selected === null) return;
            const step = 0.04;
            if (e.key === "ArrowLeft") moveBy(selected, -step, 0);
            else if (e.key === "ArrowRight") moveBy(selected, step, 0);
            else if (e.key === "ArrowUp") moveBy(selected, 0, -step);
            else if (e.key === "ArrowDown") moveBy(selected, 0, step);
            else if (e.key === "Enter" || e.key === "Escape") setSelected(null);
            else return;
            e.preventDefault();
          }}
        >
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            <Court ref={courtRef} serviceZone={phase === "serve" && !inBase}>
              {POSITIONS.map((p) => (
                <span
                  key={`slot-${p}`}
                  className="absolute z-0 -translate-x-1/2 -translate-y-1/2 font-display text-[clamp(1.8rem,10cqw,3rem)] font-extrabold text-court-line/25"
                  style={{ left: `${BASE_SLOTS[p].x * 100}%`, top: `${BASE_SLOTS[p].y * 100}%` }}
                >
                  {p}
                </span>
              ))}

              {submitted &&
                POSITIONS.map((p) => (
                  <PlayerToken
                    key={`ghost-${p}`}
                    pos={p}
                    role={lineup[p]}
                    coord={solution[p]}
                    frontRow={isFrontRow(p)}
                    passer={isPasser(p)}
                    ghost
                    animate={false}
                    className="z-10"
                  />
                ))}

              {POSITIONS.map((p) => (
                <DraggableToken
                  key={p}
                  pos={p}
                  coord={coords[p]}
                  role={lineup[p]}
                  violating={violating.has(p)}
                  passer={isPasser(p)}
                  locked={locked}
                  selected={selected === p}
                  onSelect={() => {
                    if (draggedRef.current) {
                      draggedRef.current = false;
                      return;
                    }
                    setSelected(selected === p ? null : p);
                  }}
                />
              ))}
            </Court>
          </DndContext>
          <p className="mt-2 text-xs text-muted-foreground">{t("quiz.keyboardHint")}</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex overflow-hidden rounded-lg border border-border"
                role="group"
                aria-label={t("quiz.mode")}
              >
                {(["mixed", "serve", "receive"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => changeMode(m)}
                    className={cn(
                      "tap-target px-3 text-sm font-bold",
                      mode === m
                        ? "bg-ink text-court-line"
                        : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`quiz.modes.${m}`)}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={libero}
                  onChange={toggleLibero}
                  className="h-5 w-5 accent-ink"
                />
                {t("quiz.libero")}
              </label>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`quiz.legend.${shownPhase}`)}
            </p>
            {selected !== null && (
              <p className="text-sm font-bold text-foreground">
                {t("quiz.selected", { role: t(`roles.${lineup[selected]}`) })}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={submit} disabled={locked} className={primaryBtn}>
                {t("quiz.submit")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoords(inBase ? RECEIVE_FORMATIONS[rotation] : BASE_FORMATIONS[rotation]);
                  setSubmitted(false);
                  setSelected(null);
                }}
                className={quietBtn}
              >
                {t("quiz.reset")}
              </button>
            </div>
          </div>

          {submitted && (
            <ExplanationCard
              tone={legal ? "correct" : "wrong"}
              verdict={legal ? t("quiz.correct") : t("quiz.wrong")}
              explanation={explanation}
              hint={t(`quiz.hint.${shownPhase}`)}
              action={
                <div className="flex flex-wrap gap-2">
                  {legal && phase === "receive" && !inBase && (
                    <button type="button" onClick={startBase} className={primaryBtn}>
                      {t("quiz.toBase")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => next(mode)}
                    className={legal && phase === "receive" && !inBase ? quietBtn : primaryBtn}
                  >
                    {t("quiz.next")}
                  </button>
                </div>
              }
            />
          )}
          {showErrors && !inBase && (
            <ul className="space-y-1 text-sm text-destructive">
              {violations.map((v) => (
                <li key={`${v.pair[0]}-${v.pair[1]}-${v.reason}`}>
                  {t(`quiz.reasons.${v.reason}`, { a: v.pair[0], b: v.pair[1] })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function DraggableToken({
  pos,
  role,
  coord,
  violating,
  passer,
  locked,
  selected,
  onSelect,
}: {
  pos: Position;
  role: Role;
  coord: Coord;
  violating: boolean;
  passer: boolean;
  locked: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(pos),
    disabled: locked,
  });

  return (
    <PlayerToken
      pos={pos}
      role={role}
      coord={coord}
      frontRow={isFrontRow(pos)}
      violating={violating}
      passer={passer}
      highlighted={selected}
      dragging={isDragging}
      interactive
      dragRef={setNodeRef}
      dragProps={{ ...listeners, ...attributes }}
      dragOffset={transform ? { x: transform.x, y: transform.y } : null}
      onSelect={onSelect}
      className="z-20"
    />
  );
}

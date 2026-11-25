import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Position } from "@/domain/types";

interface RotationControlsProps {
  rotation: Position;
  onRotationChange: (rotation: Position) => void;
  onSideOut: () => void;
  onReset: () => void;
}

export function RotationControls({
  rotation,
  onRotationChange,
  onSideOut,
  onReset,
}: RotationControlsProps) {
  const { t } = useTranslation();
  const [info, setInfo] = useState(false);

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="rotation-slider" className="heading-impact text-2xl text-card-foreground">
          {t("learn.rotation", { n: rotation })}
        </label>
        <button
          type="button"
          onClick={() => setInfo((v) => !v)}
          aria-expanded={info}
          aria-label={t("learn.rotationInfo")}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-sm font-bold text-foreground"
        >
          i
        </button>
      </div>

      {info && (
        <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {t("learn.rotationInfo")}
        </p>
      )}

      <input
        id="rotation-slider"
        type="range"
        min={1}
        max={6}
        step={1}
        value={rotation}
        onChange={(e) => onRotationChange(Number(e.target.value) as Position)}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
      <div className="mt-1 flex justify-between px-1 text-[0.65rem] font-bold text-muted-foreground">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onSideOut}
          className="tap-target flex-1 rounded-xl bg-primary px-5 font-display text-xl font-extrabold text-primary-foreground shadow-[0_2px_0_oklch(0.22_0.03_250/35%)] transition-transform active:translate-y-px"
        >
          {t("learn.sideOut")}
        </button>
        <button
          onClick={onReset}
          className="tap-target rounded-xl border border-input bg-card px-4 text-sm font-bold text-foreground hover:bg-secondary"
        >
          {t("learn.reset")}
        </button>
      </div>
    </div>
  );
}

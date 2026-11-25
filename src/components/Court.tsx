import { forwardRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

interface CourtProps {
  children: ReactNode;
  /** draw diagonal speed lines while players move */
  motionLines?: boolean;
  /** show the service zone behind the end line */
  serviceZone?: boolean;
  className?: string;
}

/**
 * Top-down view of your own half on a hall floor. Net at the TOP.
 * Children are positioned with normalized coordinates (percent of the court box),
 * so players with x < 0 or x > 1 stand in the run-out zone beside the sidelines.
 */
export const Court = forwardRef<HTMLDivElement, CourtProps>(function Court(
  { children, motionLines, serviceZone, className },
  ref,
) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl bg-free shadow-[var(--shadow-board)]",
        className,
      )}
    >
      {/* net with tape and mesh */}
      <div className="relative h-5 bg-ink" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-[3px] bg-court-line" />
        <div
          className="absolute inset-x-0 bottom-0 top-[3px]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 6px, oklch(1 0 0 / 22%) 6px 7px), repeating-linear-gradient(0deg, transparent 0 4px, oklch(1 0 0 / 22%) 4px 5px)",
          }}
        />
      </div>

      <div className={cn("px-[14%]", serviceZone ? "pb-[20%]" : "pb-[8%]")}>
        <div
          ref={ref}
          role="group"
          aria-label={t("court.label")}
          className="court-surface relative aspect-square w-full border-x-[3px] border-b-[3px] border-court-line [container-type:inline-size]"
        >
          {/* attack line, 3 m from the net */}
          <div className="pointer-events-none absolute left-0 top-1/3 h-[3px] w-full bg-court-line" />
          {motionLines && (
            <div className="speed-lines pointer-events-none absolute inset-0 animate-[fade-in_0.2s_ease-out]" />
          )}
          {serviceZone && (
            <div
              className="pointer-events-none absolute inset-x-0 top-full z-0 flex h-[20%] items-end justify-center pb-1 text-[0.7rem] font-medium text-ink/60"
              aria-hidden
            >
              {t("court.serviceZone")}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
});

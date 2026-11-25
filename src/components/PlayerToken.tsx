import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import type { Coord, Position, Role } from "@/domain/types";

export const ROLE_COLOR: Record<Role, string> = {
  S: "bg-role-s text-ink",
  OPP: "bg-role-opp text-ink",
  OH1: "bg-role-oh text-ink",
  OH2: "bg-role-oh2 text-ink",
  MB1: "bg-role-mb text-ink",
  MB2: "bg-role-mb2 text-ink",
  L: "bg-role-l text-court-line",
};

export const ROLE_NUMBER: Record<Role, number> = {
  S: 1,
  OH2: 2,
  MB1: 3,
  OPP: 4,
  OH1: 5,
  MB2: 6,
  L: 9,
};

interface PlayerTokenProps {
  role: Role;
  pos: Position;
  coord: Coord;
  highlighted?: boolean;
  violating?: boolean;
  /** Neighbour who currently sets a line this player has crossed. */
  blocking?: boolean;
  frontRow?: boolean;
  ghost?: boolean;
  /** Libero and outsides: marked as the three serve-receive passers. */
  passer?: boolean;
  dragging?: boolean;
  animate?: boolean;
  className?: string;
  /** set when the token itself is interactive (drag & drop / keyboard select) */
  interactive?: boolean;
  dragRef?: (node: HTMLElement | null) => void;
  dragProps?: Record<string, unknown>;
  /** live drag offset in px, applied on top of the normalized position */
  dragOffset?: { x: number; y: number } | null;
  onSelect?: () => void;
}

export function PlayerToken({
  role,
  pos,
  coord,
  highlighted,
  violating,
  blocking,
  frontRow,
  ghost,
  passer,
  dragging,
  animate = true,
  className,
  interactive,
  dragRef,
  dragProps,
  dragOffset,
  onSelect,
}: PlayerTokenProps) {
  const { t } = useTranslation();
  const { calmMotion } = useSettings();

  const spring = calmMotion
    ? { duration: 0.2 }
    : { type: "spring" as const, stiffness: 160, damping: 13, mass: 0.7 };

  const label = passer
    ? `${t("court.token", { role: t(`roles.${role}`), pos })} (${t("court.passer")})`
    : t("court.token", { role: t(`roles.${role}`), pos });

  return (
    <motion.div
      className={cn(
        "absolute z-20 -translate-x-1/2 -translate-y-1/2",
        interactive ? "pointer-events-auto" : "pointer-events-none",
        className,
      )}
      initial={false}
      {...(animate
        ? {
            animate: {
              left: `${coord.x * 100}%`,
              top: `${coord.y * 100}%`,
              scale: highlighted && !calmMotion ? 1.14 : 1,
            },
          }
        : { style: { left: `${coord.x * 100}%`, top: `${coord.y * 100}%` } })}
      transition={spring}
    >
      <div
        ref={dragRef}
        {...dragProps}
        {...(interactive
          ? {
              role: "button",
              tabIndex: 0,
              "aria-pressed": !!highlighted,
              onClick: onSelect,
            }
          : {})}
        aria-label={label}
        style={
          dragOffset
            ? { transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)` }
            : undefined
        }
        className={cn(
          "flex h-[clamp(2.4rem,11cqw,3.4rem)] w-[clamp(2.4rem,11cqw,3.4rem)] flex-col items-center justify-center rounded-full border-2 border-ink/70 font-display font-extrabold shadow-[var(--shadow-disc)]",
          ROLE_COLOR[role],
          interactive && "cursor-grab touch-none",
          ghost && "opacity-45",
          highlighted && "ring-4 ring-primary ring-offset-2 ring-offset-court",
          violating && "ring-4 ring-destructive ring-offset-2 ring-offset-court",
          blocking && "ring-4 ring-destructive",
          dragging && "scale-110 cursor-grabbing",
          frontRow ? "border-solid" : "border-dashed",
        )}
      >
        <span className="text-[clamp(1rem,5cqw,1.4rem)] leading-none">{ROLE_NUMBER[role]}</span>
        <span className="font-sans text-[clamp(0.45rem,2.2cqw,0.62rem)] font-bold leading-none opacity-80">
          {role}
        </span>
        {passer && <span className="mt-0.5 h-0.5 w-2.5 rounded-full bg-current" aria-hidden />}
      </div>
    </motion.div>
  );
}

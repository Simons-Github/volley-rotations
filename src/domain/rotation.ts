import formations from "./formations.json";
import {
  POSITIONS,
  type Coord,
  type Coords,
  type Lineup,
  type OverlapViolation,
  type Position,
  type Role,
} from "./types";

/**
 * Internally everything is keyed by the setter's position (S in 1, 6, 5, 4, 3, 2).
 * What players see is the common numbering: Rotation 1 has the setter in position 1
 * and each side-out advances one rotation, so Rotation 2 has the setter in 6, and so on.
 */
export const ROTATION_NAMING = "side-outs-from-setter-in-1" as const;

/** Display number (1–6) for a rotation keyed by the setter's position. */
export function rotationNumber(setterPosition: Position): Position {
  return (((((1 - setterPosition) % 6) + 6) % 6) + 1) as Position;
}

/** Inverse of `rotationNumber`: the setter's position in Rotation `n`. */
export function setterPositionForRotation(n: Position): Position {
  return (((((1 - n) % 6) + 6) % 6) + 1) as Position;
}

/** Base slot per position. Net is at the TOP (y = 0). */
export const BASE_SLOTS: Coords = {
  4: { x: 0.17, y: 0.17 },
  3: { x: 0.5, y: 0.17 },
  2: { x: 0.83, y: 0.17 },
  5: { x: 0.17, y: 0.83 },
  6: { x: 0.5, y: 0.83 },
  1: { x: 0.83, y: 0.83 },
};

/** Rotation 1 lineup (setter in position 1). */
export const ROTATION_1_LINEUP: Lineup = {
  1: "S",
  2: "OH2",
  3: "MB1",
  4: "OPP",
  5: "OH1",
  6: "MB2",
};

export const FRONT_ROW: Position[] = [4, 3, 2];
export const BACK_ROW: Position[] = [5, 6, 1];

export function isFrontRow(pos: Position): boolean {
  return pos === 2 || pos === 3 || pos === 4;
}

/** Clockwise step a player takes on a side-out: 1 → 6 → 5 → 4 → 3 → 2 → 1. */
export const NEXT_POSITION: Record<Position, Position> = {
  1: 6,
  6: 5,
  5: 4,
  4: 3,
  3: 2,
  2: 1,
};

/** Every player moves one position clockwise. */
export function rotate(lineup: Lineup): Lineup {
  const next = {} as Lineup;
  for (const pos of POSITIONS) {
    next[NEXT_POSITION[pos]] = lineup[pos];
  }
  return next;
}

export function rotateTimes(lineup: Lineup, times: number): Lineup {
  let result = lineup;
  for (let i = 0; i < times; i += 1) result = rotate(result);
  return result;
}

export function getRotationNumber(lineup: Lineup): Position {
  const pos = POSITIONS.find((p) => lineup[p] === "S");
  if (!pos) throw new Error("Lineup has no setter");
  return pos;
}

/** Lineup for a given rotation number (setter in that position). */
export function lineupForRotation(rotation: Position): Lineup {
  let lineup = ROTATION_1_LINEUP;
  while (getRotationNumber(lineup) !== rotation) lineup = rotate(lineup);
  return lineup;
}

export type Phase = "serve" | "receive";

/**
 * Lineup as it stands on court. The libero replaces the back-row middle, except
 * while that middle is about to serve from position 1.
 */
export function lineupForPhase(rotation: Position, phase: Phase, libero = true): Lineup {
  const lineup = { ...lineupForRotation(rotation) };
  if (!libero) return lineup;
  for (const pos of BACK_ROW) {
    if (phase === "serve" && pos === 1) continue;
    if (lineup[pos] === "MB1" || lineup[pos] === "MB2") lineup[pos] = "L";
  }
  return lineup;
}

export function positionOfRole(lineup: Lineup, role: Role): Position {
  const pos = POSITIONS.find((p) => lineup[p] === role);
  if (!pos) throw new Error(`Role ${role} not in lineup`);
  return pos;
}

/** Libero and both outsides pass. The opposite, the front-row middles and the setter do not. */
const RECEIVE_PASSERS: ReadonlySet<Role> = new Set(["OH1", "OH2", "L"]);

export function isReceivePasser(role: Role): boolean {
  return RECEIVE_PASSERS.has(role);
}

/**
 * Who passes at a given position. Without a libero the back-row middle takes the
 * libero's place as the third passer; a front-row middle never passes.
 */
export function isPasserAt(lineup: Lineup, pos: Position): boolean {
  const role = lineup[pos];
  if (isReceivePasser(role)) return true;
  return (role === "MB1" || role === "MB2") && !isFrontRow(pos);
}

/** Position 1 (the server) is not overlapped with 2 or 6 while that team is serving. */
const SERVER_EXEMPT_PAIRS: ReadonlyArray<readonly [Position, Position]> = [
  [2, 1],
  [6, 1],
];

function exemptWhenServing(a: Position, b: Position, serverExempt: boolean): boolean {
  if (!serverExempt) return false;
  return SERVER_EXEMPT_PAIRS.some(
    ([left, right]) => (a === left && b === right) || (a === right && b === left),
  );
}

/**
 * Overlap at the moment of serve contact. Adjacent pairs only — no diagonals.
 * The receiving team checks all six players. Pass `{ serverExempt: true }` only
 * for the serving team's position 1, who is exempt until contact.
 * The service zone itself is `validateServeFormation`, not this function.
 */
export function validateOverlap(
  coords: Coords,
  options?: { serverExempt?: boolean },
): OverlapViolation[] {
  const serverExempt = options?.serverExempt ?? false;
  const violations: OverlapViolation[] = [];

  // Front-row player must be closer to the net than the back-row player behind.
  const columns: Array<[Position, Position]> = [
    [2, 1],
    [3, 6],
    [4, 5],
  ];
  for (const [front, back] of columns) {
    if (exemptWhenServing(front, back, serverExempt)) continue;
    if (coords[front].y >= coords[back].y) {
      violations.push({ pair: [front, back], reason: "front-behind-back" });
    }
  }

  // Left-to-right order inside a row.
  const frontOrder: Array<[Position, Position]> = [
    [4, 3],
    [3, 2],
  ];
  for (const [left, right] of frontOrder) {
    if (coords[left].x >= coords[right].x) {
      violations.push({ pair: [left, right], reason: "front-row-order" });
    }
  }

  const backOrder: Array<[Position, Position]> = [
    [5, 6],
    [6, 1],
  ];
  for (const [left, right] of backOrder) {
    if (exemptWhenServing(left, right, serverExempt)) continue;
    if (coords[left].x >= coords[right].x) {
      violations.push({ pair: [left, right], reason: "back-row-order" });
    }
  }

  return violations;
}

/** End line is y = 1. The server must be strictly behind it, between the sidelines. */
export function isInServiceZone(coord: Coord): boolean {
  return coord.y > 1 && coord.x >= 0 && coord.x <= 1;
}

/**
 * Legal serve at contact: the other five keep overlap, and position 1 stands
 * in the service zone. Overlap exemption alone does not make the serve legal.
 */
export function validateServeFormation(coords: Coords): OverlapViolation[] {
  const violations = validateOverlap(coords, { serverExempt: true });
  if (!isInServiceZone(coords[1])) {
    violations.push({ pair: [1, 1], reason: "server-not-in-zone" });
  }
  return violations;
}

/** Direct overlap neighbour of one position. Equality counts as a violation, same as `validateOverlap`. */
export interface OverlapBound {
  other: Position;
  axis: "x" | "y";
  /** This player must stay strictly below (`max`) or strictly above (`min`) `value`. Net is y = 0. */
  bound: "min" | "max";
  value: number;
  violated: boolean;
}

const OVERLAP_NEIGHBORS: Record<
  Position,
  Array<{ other: Position; axis: "x" | "y"; bound: "min" | "max" }>
> = {
  4: [
    { other: 3, axis: "x", bound: "max" },
    { other: 5, axis: "y", bound: "max" },
  ],
  3: [
    { other: 4, axis: "x", bound: "min" },
    { other: 2, axis: "x", bound: "max" },
    { other: 6, axis: "y", bound: "max" },
  ],
  2: [
    { other: 3, axis: "x", bound: "min" },
    { other: 1, axis: "y", bound: "max" },
  ],
  5: [
    { other: 6, axis: "x", bound: "max" },
    { other: 4, axis: "y", bound: "min" },
  ],
  6: [
    { other: 5, axis: "x", bound: "min" },
    { other: 1, axis: "x", bound: "max" },
    { other: 3, axis: "y", bound: "min" },
  ],
  1: [
    { other: 6, axis: "x", bound: "min" },
    { other: 2, axis: "y", bound: "min" },
  ],
};

/**
 * Legal edges for one player, taken from the direct neighbours. `at` is the position
 * being tested (the live drag preview); neighbours stay where `coords` puts them.
 * Pass `{ serverExempt: true }` to drop the server's pairs, matching `validateOverlap`.
 */
export function overlapBounds(
  pos: Position,
  coords: Coords,
  at: Coord = coords[pos],
  options?: { serverExempt?: boolean },
): OverlapBound[] {
  const serverExempt = options?.serverExempt ?? false;
  return OVERLAP_NEIGHBORS[pos]
    .filter((neighbor) => !exemptWhenServing(pos, neighbor.other, serverExempt))
    .map((neighbor) => {
      const value = coords[neighbor.other][neighbor.axis];
      const violated =
        neighbor.bound === "max" ? at[neighbor.axis] >= value : at[neighbor.axis] <= value;
      return { ...neighbor, value, violated };
    });
}

interface FormationEntry {
  receive: Record<string, Coord>;
  base: Record<string, Coord>;
  serve: Record<string, Coord>;
}

function toCoords(raw: Record<string, Coord>): Coords {
  return {
    1: raw["1"]!,
    2: raw["2"]!,
    3: raw["3"]!,
    4: raw["4"]!,
    5: raw["5"]!,
    6: raw["6"]!,
  };
}

const rawFormations = formations.rotations as unknown as Record<string, FormationEntry>;

/** Model serve-receive formation per rotation (verify with a coach). */
export const RECEIVE_FORMATIONS: Record<Position, Coords> = {
  1: toCoords(rawFormations["1"]!.receive),
  2: toCoords(rawFormations["2"]!.receive),
  3: toCoords(rawFormations["3"]!.receive),
  4: toCoords(rawFormations["4"]!.receive),
  5: toCoords(rawFormations["5"]!.receive),
  6: toCoords(rawFormations["6"]!.receive),
};

/**
 * Serving formation at contact. Position 1 is in the service zone (y > 1).
 * Overlap of the other five is legal with `{ serverExempt: true }`;
 * `validateServeFormation` also requires the service zone.
 */
export const SERVE_FORMATIONS: Record<Position, Coords> = {
  1: toCoords(rawFormations["1"]!.serve),
  2: toCoords(rawFormations["2"]!.serve),
  3: toCoords(rawFormations["3"]!.serve),
  4: toCoords(rawFormations["4"]!.serve),
  5: toCoords(rawFormations["5"]!.serve),
  6: toCoords(rawFormations["6"]!.serve),
};

/**
 * Offence after contact. Overlap no longer applies.
 * Setter at the right-side net; front-row outside on the left pin, middle in
 * the middle, opposite on the right pin. Back-row opposite plays right back,
 * back-row outside plays middle (pipe), back-row middle plays left back.
 */
export const BASE_FORMATIONS: Record<Position, Coords> = {
  1: toCoords(rawFormations["1"]!.base),
  2: toCoords(rawFormations["2"]!.base),
  3: toCoords(rawFormations["3"]!.base),
  4: toCoords(rawFormations["4"]!.base),
  5: toCoords(rawFormations["5"]!.base),
  6: toCoords(rawFormations["6"]!.base),
};

/** How close (in court units, 0–1) a player must get to the model base spot. */
export const BASE_TOLERANCE = 0.14;

/** Positions whose player stands too far from the base spot for this rotation. */
export function validateBasePositions(coords: Coords, rotation: Position): Position[] {
  const target = BASE_FORMATIONS[rotation];
  return POSITIONS.filter((pos) => {
    const dx = coords[pos].x - target[pos].x;
    const dy = coords[pos].y - target[pos].y;
    return Math.hypot(dx, dy) > BASE_TOLERANCE;
  });
}

export function frontRowAttackers(lineup: Lineup): Role[] {
  return FRONT_ROW.map((p) => lineup[p]).filter((r) => r !== "S");
}

/** Only the receiving team rotates, and only when it wins the serve. */
export function shouldRotate(weWereServing: boolean, weWonThePoint: boolean): boolean {
  return !weWereServing && weWonThePoint;
}

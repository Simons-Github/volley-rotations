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

/**
 * Lineup as it stands on court to receive serve: the libero replaces the
 * back-row middle.
 */
export function receiveLineup(rotation: Position, libero = true): Lineup {
  const lineup = { ...lineupForRotation(rotation) };
  if (!libero) return lineup;
  for (const pos of BACK_ROW) {
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

/**
 * Rotational order at the service hit (FIVB Official Volleyball Rules 2025-2028,
 * rule 7.4). It binds the receiving team only; the serving team may take any
 * position, so there is no check for it. Adjacent pairs only, no diagonals.
 * Being level with the corresponding neighbour is legal (7.4.3.1 and 7.4.3.2), so
 * a pair is a violation only when it is strictly the wrong way round. Each player
 * is a single point; the rule's judgement by feet is not modelled.
 */
export function validateOverlap(coords: Coords): OverlapViolation[] {
  const violations: OverlapViolation[] = [];

  // Front-row player must not be further from the net than the back-row player behind.
  const columns: Array<[Position, Position]> = [
    [2, 1],
    [3, 6],
    [4, 5],
  ];
  for (const [front, back] of columns) {
    if (coords[front].y > coords[back].y) {
      violations.push({ pair: [front, back], reason: "front-behind-back" });
    }
  }

  // Left-to-right order inside a row.
  const frontOrder: Array<[Position, Position]> = [
    [4, 3],
    [3, 2],
  ];
  for (const [left, right] of frontOrder) {
    if (coords[left].x > coords[right].x) {
      violations.push({ pair: [left, right], reason: "front-row-order" });
    }
  }

  const backOrder: Array<[Position, Position]> = [
    [5, 6],
    [6, 1],
  ];
  for (const [left, right] of backOrder) {
    if (coords[left].x > coords[right].x) {
      violations.push({ pair: [left, right], reason: "back-row-order" });
    }
  }

  return violations;
}

/**
 * At the service hit each player except the server must stand within the own
 * court (rule 7.4). The lines belong to the court. This is for the receiving
 * team, which has no server, so all six are checked. `pair` repeats the one
 * position concerned.
 */
export function validateInsideCourt(coords: Coords): OverlapViolation[] {
  return POSITIONS.filter((pos) => {
    const { x, y } = coords[pos];
    return x < 0 || x > 1 || y < 0 || y > 1;
  }).map((pos) => ({ pair: [pos, pos], reason: "outside-court" }));
}

/** Everything rule 7.4 asks of the receiving team at the service hit. */
export function validateReceiveFormation(coords: Coords): OverlapViolation[] {
  return [...validateOverlap(coords), ...validateInsideCourt(coords)];
}

/** Direct overlap neighbour of one position. Being level is legal, same as `validateOverlap`. */
export interface OverlapBound {
  other: Position;
  axis: "x" | "y";
  /** This player must stay at or below (`max`) or at or above (`min`) `value`. Net is y = 0. */
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
 */
export function overlapBounds(
  pos: Position,
  coords: Coords,
  at: Coord = coords[pos],
): OverlapBound[] {
  return OVERLAP_NEIGHBORS[pos].map((neighbor) => {
    const value = coords[neighbor.other][neighbor.axis];
    const violated =
      neighbor.bound === "max" ? at[neighbor.axis] > value : at[neighbor.axis] < value;
    return { ...neighbor, value, violated };
  });
}

interface FormationEntry {
  receive: Record<string, Coord>;
  base: Record<string, Coord>;
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

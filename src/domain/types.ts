export type Position = 1 | 2 | 3 | 4 | 5 | 6;

export const POSITIONS: Position[] = [1, 2, 3, 4, 5, 6];

/** Libero is intentionally out of scope for v1 (see FEATURES.libero). */
export type Role = "S" | "OPP" | "OH1" | "OH2" | "MB1" | "MB2" | "L";

export const FEATURES = {
  /** Keep the data model extensible: flip to true once libero rules are added. */
  libero: false,
};

export type Lineup = Record<Position, Role>;

export interface Coord {
  x: number; // 0 = left sideline, 1 = right sideline
  y: number; // 0 = net, 1 = back line
}

export type Coords = Record<Position, Coord>;

export type OverlapReason =
  "front-behind-back" | "front-row-order" | "back-row-order" | "server-not-in-zone";

export interface OverlapViolation {
  pair: [Position, Position];
  reason: OverlapReason;
}

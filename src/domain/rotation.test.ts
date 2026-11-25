import { describe, expect, it } from "vitest";

import {
  BASE_FORMATIONS,
  BASE_SLOTS,
  RECEIVE_FORMATIONS,
  SERVE_FORMATIONS,
  ROTATION_1_LINEUP,
  getRotationNumber,
  isFrontRow,
  isInServiceZone,
  isPasserAt,
  isReceivePasser,
  lineupForPhase,
  lineupForRotation,
  overlapBounds,
  positionOfRole,
  rotate,
  rotateTimes,
  rotationNumber,
  setterPositionForRotation,
  shouldRotate,
  validateBasePositions,
  validateOverlap,
  validateServeFormation,
} from "./rotation";
import { POSITIONS, type Coords, type Position } from "./types";

describe("rotate", () => {
  it("returns the original lineup after six rotations", () => {
    expect(rotateTimes(ROTATION_1_LINEUP, 6)).toEqual(ROTATION_1_LINEUP);
  });

  it("moves every player one position clockwise", () => {
    const next = rotate(ROTATION_1_LINEUP);
    expect(next[6]).toBe(ROTATION_1_LINEUP[1]);
    expect(next[1]).toBe(ROTATION_1_LINEUP[2]);
    expect(next[5]).toBe(ROTATION_1_LINEUP[6]);
  });

  it("keeps same-job roles three positions apart", () => {
    for (let i = 0; i < 6; i += 1) {
      const lineup = rotateTimes(ROTATION_1_LINEUP, i);
      const posOf = (role: string) => POSITIONS.find((p) => lineup[p] === role)!;
      const pairs: Array<[string, string]> = [
        ["S", "OPP"],
        ["OH1", "OH2"],
        ["MB1", "MB2"],
      ];
      for (const [a, b] of pairs) {
        const diff = Math.abs(posOf(a) - posOf(b));
        expect(Math.min(diff, 6 - diff)).toBe(3);
      }
    }
  });
});

describe("rotation numbering", () => {
  it("counts side-outs from the setter in position 1", () => {
    expect(([1, 2, 3, 4, 5, 6] as const).map((n) => setterPositionForRotation(n))).toEqual([
      1, 6, 5, 4, 3, 2,
    ]);
    for (const n of POSITIONS) {
      expect(rotationNumber(setterPositionForRotation(n))).toBe(n);
    }
  });

  it("advances one rotation per side-out", () => {
    let lineup = lineupForRotation(1);
    for (let n = 1; n <= 6; n += 1) {
      expect(rotationNumber(getRotationNumber(lineup))).toBe(n);
      lineup = rotate(lineup);
    }
  });
});

describe("getRotationNumber", () => {
  it("is the setter's position", () => {
    expect(getRotationNumber(ROTATION_1_LINEUP)).toBe(1);
    expect(getRotationNumber(rotate(ROTATION_1_LINEUP))).toBe(6);
  });

  it("round-trips with lineupForRotation", () => {
    for (const r of POSITIONS) {
      expect(getRotationNumber(lineupForRotation(r))).toBe(r);
    }
  });
});

describe("isFrontRow", () => {
  it("marks 2, 3, 4 as front row", () => {
    expect([2, 3, 4].every((p) => isFrontRow(p as Position))).toBe(true);
    expect([1, 5, 6].some((p) => isFrontRow(p as Position))).toBe(false);
  });

  it("has the setter in the front row in rotations 2, 3, 4 only", () => {
    for (const r of POSITIONS) {
      expect(isFrontRow(getRotationNumber(lineupForRotation(r)))).toBe(
        r === 2 || r === 3 || r === 4,
      );
    }
  });
});

describe("validateOverlap", () => {
  it("accepts the base slots", () => {
    expect(validateOverlap(BASE_SLOTS)).toEqual([]);
  });

  it("accepts every model serve-receive formation", () => {
    for (const r of POSITIONS) {
      expect(validateOverlap(RECEIVE_FORMATIONS[r])).toEqual([]);
    }
  });

  it("flags a front-row player standing behind the player behind them", () => {
    const bad = { ...BASE_SLOTS, 3: { x: 0.5, y: 0.95 } };
    const violations = validateOverlap(bad);
    expect(violations).toContainEqual({ pair: [3, 6], reason: "front-behind-back" });
  });

  it("flags a broken left-to-right order in the front row", () => {
    const bad = { ...BASE_SLOTS, 4: { x: 0.9, y: 0.17 } };
    expect(validateOverlap(bad).some((v) => v.reason === "front-row-order")).toBe(true);
  });

  it("flags position 2 standing behind position 1 on receive", () => {
    const setterAtTheNet = { ...BASE_SLOTS, 1: { x: 0.9, y: 0.05 } };
    expect(validateOverlap(setterAtTheNet)).toContainEqual({
      pair: [2, 1],
      reason: "front-behind-back",
    });
  });

  it("flags position 1 standing left of position 6 on receive", () => {
    const crossed = { ...BASE_SLOTS, 1: { x: 0.2, y: 0.9 } };
    expect(validateOverlap(crossed)).toContainEqual({
      pair: [6, 1],
      reason: "back-row-order",
    });
  });

  it("exempts the server in position 1 only while that team is serving", () => {
    const serverDeep = { ...BASE_SLOTS, 1: { x: 0.9, y: 0.05 } };
    expect(validateOverlap(serverDeep, { serverExempt: true })).toEqual([]);
  });

  it("accepts every model serve formation when the server is exempt and in the zone", () => {
    for (const r of POSITIONS) {
      expect(validateOverlap(SERVE_FORMATIONS[r], { serverExempt: true })).toEqual([]);
      expect(validateServeFormation(SERVE_FORMATIONS[r])).toEqual([]);
      expect(isInServiceZone(SERVE_FORMATIONS[r][1])).toBe(true);
    }
  });

  it("rejects a server who is still on the court", () => {
    const serverAtTheNet = { ...BASE_SLOTS, 1: { x: 0.9, y: 0.05 } };
    expect(validateOverlap(serverAtTheNet, { serverExempt: true })).toEqual([]);
    expect(validateServeFormation(serverAtTheNet)).toContainEqual({
      pair: [1, 1],
      reason: "server-not-in-zone",
    });
    expect(validateServeFormation(BASE_SLOTS)).toContainEqual({
      pair: [1, 1],
      reason: "server-not-in-zone",
    });
  });

  it("needs the server exemption: the server stands left of position 6 on every serve", () => {
    for (const r of POSITIONS) {
      expect(validateOverlap(SERVE_FORMATIONS[r])).toContainEqual({
        pair: [6, 1],
        reason: "back-row-order",
      });
    }
  });

  it("keeps the rotation-1 setter behind position 2", () => {
    const receive = RECEIVE_FORMATIONS[1];
    expect(receive[1].y).toBeGreaterThan(receive[2].y);
  });

  it("keeps a visible gap and stays inside the court on every example", () => {
    const gap = (coords: Coords, exempt: boolean) => {
      const distances: number[] = [];
      const columns: Array<[Position, Position]> = [
        [2, 1],
        [3, 6],
        [4, 5],
      ];
      for (const [front, back] of columns) {
        if (exempt && front === 2) continue;
        distances.push(coords[back].y - coords[front].y);
      }
      for (const [left, right] of [
        [4, 3],
        [3, 2],
      ] as Array<[Position, Position]>) {
        distances.push(coords[right].x - coords[left].x);
      }
      for (const [left, right] of [
        [5, 6],
        [6, 1],
      ] as Array<[Position, Position]>) {
        if (exempt && right === 1) continue;
        distances.push(coords[right].x - coords[left].x);
      }
      return Math.min(...distances);
    };

    const serveShapes = new Set<string>();
    for (const r of POSITIONS) {
      expect(gap(RECEIVE_FORMATIONS[r], false)).toBeGreaterThanOrEqual(0.05);
      expect(gap(SERVE_FORMATIONS[r], true)).toBeGreaterThanOrEqual(0.05);
      for (const pos of POSITIONS) {
        const receive = RECEIVE_FORMATIONS[r][pos];
        expect(receive.x).toBeGreaterThanOrEqual(0.05);
        expect(receive.x).toBeLessThanOrEqual(0.95);
        expect(receive.y).toBeGreaterThanOrEqual(0.05);
        expect(receive.y).toBeLessThanOrEqual(0.95);
        if (pos !== 1) {
          const serve = SERVE_FORMATIONS[r][pos];
          expect(serve.x).toBeGreaterThanOrEqual(0.05);
          expect(serve.x).toBeLessThanOrEqual(0.95);
          expect(serve.y).toBeGreaterThanOrEqual(0.05);
          expect(serve.y).toBeLessThanOrEqual(0.95);
        }
      }
      const lineup = lineupForPhase(r, "receive");
      const passerXs = POSITIONS.filter((pos) => isReceivePasser(lineup[pos])).map(
        (pos) => RECEIVE_FORMATIONS[r][pos].x,
      );
      expect(Math.max(...passerXs) - Math.min(...passerXs)).toBeGreaterThanOrEqual(0.4);
      serveShapes.add(JSON.stringify(SERVE_FORMATIONS[r]));
    }
  });
});

describe("base formations", () => {
  it("sends the setter to the target at the right-side net in every rotation", () => {
    for (const r of POSITIONS) {
      const lineup = lineupForRotation(r);
      const setter = BASE_FORMATIONS[r][positionOfRole(lineup, "S")];
      expect(setter.x).toBeGreaterThan(0.6);
      expect(setter.x).toBeLessThan(0.66);
      expect(setter.y).toBeLessThan(0.1);
    }
  });

  it("puts the libero left back and one outside in the middle back", () => {
    for (const r of POSITIONS) {
      const lineup = lineupForPhase(r, "receive");
      const libero = BASE_FORMATIONS[r][positionOfRole(lineup, "L")];
      expect(libero.x).toBeCloseTo(0.237, 2);
      expect(libero.y).toBeCloseTo(0.591, 2);
      const backOh = POSITIONS.filter((p) => !isFrontRow(p) && lineup[p].startsWith("OH"));
      expect(backOh.length === 0 || BASE_FORMATIONS[r][backOh[0]!].y > 0.8).toBe(true);
    }
  });

  it("keeps the opposite on the left pin and the outside on the right in rotation 1 only", () => {
    const rot1 = lineupForRotation(1);
    expect(BASE_FORMATIONS[1][positionOfRole(rot1, "OPP")].x).toBeLessThan(0.15);
    const rot6 = lineupForRotation(6);
    expect(BASE_FORMATIONS[6][positionOfRole(rot6, "OPP")].x).toBeGreaterThan(0.85);
  });

  it("is never inside the overlap-legal receive formation of the same rotation", () => {
    for (const r of POSITIONS) {
      expect(BASE_FORMATIONS[r]).not.toEqual(RECEIVE_FORMATIONS[r]);
    }
  });
});

describe("overlapBounds", () => {
  const expected: Record<
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

  it("gives every position its direct neighbours", () => {
    for (const pos of POSITIONS) {
      const bounds = overlapBounds(pos, BASE_SLOTS);
      expect(bounds.map(({ other, axis, bound }) => ({ other, axis, bound }))).toEqual(
        expected[pos],
      );
      expect(bounds.every((b) => !b.violated)).toBe(true);
      for (const bound of bounds) {
        expect(bound.value).toBe(BASE_SLOTS[bound.other][bound.axis]);
      }
    }
  });

  it("treats standing on the line as a violation", () => {
    const tied: Coords = { ...BASE_SLOTS, 6: { x: BASE_SLOTS[6].x, y: BASE_SLOTS[3].y } };
    const againstMiddle = overlapBounds(6, tied).find((b) => b.other === 3);
    expect(againstMiddle?.violated).toBe(true);
    expect(
      overlapBounds(6, tied)
        .filter((b) => b.axis === "x")
        .every((b) => !b.violated),
    ).toBe(true);
  });

  it("judges a preview position without moving the neighbours", () => {
    const preview = overlapBounds(6, BASE_SLOTS, { x: 0.5, y: 0.05 });
    const netLine = preview.find((b) => b.other === 3);
    expect(netLine).toMatchObject({ violated: true, value: BASE_SLOTS[3].y });
    expect(preview.find((b) => b.other === 5)?.violated).toBe(false);
    expect(overlapBounds(3, BASE_SLOTS).find((b) => b.other === 6)?.violated).toBe(false);
  });

  it("drops the server's lines while that team is serving", () => {
    const bounds = overlapBounds(1, BASE_SLOTS, BASE_SLOTS[1], { serverExempt: true });
    expect(bounds).toEqual([]);
    expect(
      overlapBounds(2, BASE_SLOTS, BASE_SLOTS[2], { serverExempt: true }).map((b) => b.other),
    ).toEqual([3]);
    expect(
      overlapBounds(6, BASE_SLOTS, BASE_SLOTS[6], { serverExempt: true }).map((b) => b.other),
    ).toEqual([5, 3]);
  });

  it("matches validateOverlap on both sides of every broken pair", () => {
    const layouts: Coords[] = [
      BASE_SLOTS,
      { ...BASE_SLOTS, 3: { x: 0.5, y: 0.95 } },
      { ...BASE_SLOTS, 4: { x: 0.9, y: 0.17 } },
      { ...BASE_SLOTS, 1: { x: 0.2, y: 0.05 } },
      { ...BASE_SLOTS, 6: { x: BASE_SLOTS[5].x, y: BASE_SLOTS[3].y } },
      ...POSITIONS.map((r) => RECEIVE_FORMATIONS[r]),
      ...POSITIONS.map((r) => SERVE_FORMATIONS[r]),
    ];

    for (const coords of layouts) {
      const violations = validateOverlap(coords);
      for (const pos of POSITIONS) {
        const fromBounds = overlapBounds(pos, coords)
          .filter((b) => b.violated)
          .map((b) => b.other)
          .sort();
        const fromRules = violations
          .filter((v) => v.pair.includes(pos))
          .map((v) => v.pair.find((p) => p !== pos)!)
          .sort();
        expect(fromBounds).toEqual(fromRules);
      }
    }
  });

  it("matches validateOverlap when the server is exempt", () => {
    const layouts: Coords[] = [
      BASE_SLOTS,
      { ...BASE_SLOTS, 1: { x: 0.2, y: 0.05 } },
      ...POSITIONS.map((r) => SERVE_FORMATIONS[r]),
    ];
    const options = { serverExempt: true } as const;

    for (const coords of layouts) {
      const violations = validateOverlap(coords, options);
      for (const pos of POSITIONS) {
        const fromBounds = overlapBounds(pos, coords, coords[pos], options)
          .filter((b) => b.violated)
          .map((b) => b.other)
          .sort();
        const fromRules = violations
          .filter((v) => v.pair.includes(pos))
          .map((v) => v.pair.find((p) => p !== pos)!)
          .sort();
        expect(fromBounds).toEqual(fromRules);
      }
    }
  });
});

describe("quiz start position", () => {
  it("is never already a correct answer", () => {
    for (const r of POSITIONS) {
      expect(validateOverlap(BASE_FORMATIONS[r]).length).toBeGreaterThan(0);
      expect(validateServeFormation(BASE_FORMATIONS[r]).length).toBeGreaterThan(0);
    }
  });
});

describe("validateBasePositions", () => {
  it("accepts the model base spots and flags a player who is far away", () => {
    for (const r of POSITIONS) {
      expect(validateBasePositions(BASE_FORMATIONS[r], r)).toEqual([]);
      const moved = { ...BASE_FORMATIONS[r], 3: { x: 0.5, y: 0.9 } };
      expect(validateBasePositions(moved, r)).toContain(3);
    }
  });

  it("does not accept the receive formation as the base", () => {
    for (const r of POSITIONS) {
      expect(validateBasePositions(RECEIVE_FORMATIONS[r], r).length).toBeGreaterThan(0);
    }
  });
});

describe("lineupForPhase", () => {
  it("puts the libero in for the back-row middle on receive", () => {
    for (const r of POSITIONS) {
      const lineup = lineupForPhase(r, "receive");
      const libero = positionOfRole(lineup, "L");
      expect(isFrontRow(libero)).toBe(false);
      expect(Object.values(lineup).filter((role) => role.startsWith("MB"))).toHaveLength(1);
    }
  });

  it("lets a middle serve from position 1 instead of the libero", () => {
    for (const r of POSITIONS) {
      const base = lineupForRotation(r);
      const serving = lineupForPhase(r, "serve");
      const middleServes = base[1] === "MB1" || base[1] === "MB2";
      expect(serving[1]).toBe(base[1]);
      expect(Object.values(serving).includes("L")).toBe(!middleServes);
    }
  });

  it("always has exactly three passers, never the setter or the opposite", () => {
    for (const r of POSITIONS) {
      const lineup = lineupForPhase(r, "receive");
      const passers = POSITIONS.filter((p) => isReceivePasser(lineup[p]));
      expect(passers).toHaveLength(3);
      expect(passers.some((p) => lineup[p] === "S" || lineup[p] === "OPP")).toBe(false);
    }
  });
});

describe("playing without a libero", () => {
  it("keeps the back-row middle on court and still has three passers", () => {
    for (const r of POSITIONS) {
      for (const phase of ["serve", "receive"] as const) {
        const lineup = lineupForPhase(r, phase, false);
        expect(Object.values(lineup)).not.toContain("L");
        expect(lineup).toEqual(lineupForRotation(r));
      }
      const lineup = lineupForPhase(r, "receive", false);
      const passers = POSITIONS.filter((p) => isPasserAt(lineup, p));
      expect(passers).toHaveLength(3);
      expect(passers.some((p) => lineup[p] === "S" || lineup[p] === "OPP")).toBe(false);
    }
  });
});

describe("isReceivePasser", () => {
  it("lets the libero and the outsides pass, not the opposite", () => {
    expect(isReceivePasser("OH1")).toBe(true);
    expect(isReceivePasser("OH2")).toBe(true);
    expect(isReceivePasser("L")).toBe(true);
    expect(isReceivePasser("OPP")).toBe(false);
    expect(isReceivePasser("MB1")).toBe(false);
    expect(isReceivePasser("MB2")).toBe(false);
    expect(isReceivePasser("S")).toBe(false);
  });
});

describe("shouldRotate", () => {
  it("rotates only on a side-out", () => {
    expect(shouldRotate(false, true)).toBe(true);
    expect(shouldRotate(true, true)).toBe(false);
    expect(shouldRotate(false, false)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { CLUE_BY_ID, CLUES, findNearbyClue, isClueInRange } from "./clues.js";

describe("CLUES", () => {
  it("uses unique identifiers", () => {
    expect(new Set(CLUES.map((clue) => clue.id)).size).toBe(CLUES.length);
    expect(CLUE_BY_ID.get("guest-book")?.title).toBe("Libro de visitas");
  });
});

describe("isClueInRange", () => {
  it("accepts a position inside the interaction radius", () => {
    const clue = CLUES[0];

    if (!clue) {
      throw new Error("No hay pistas definidas.");
    }

    expect(isClueInRange(clue, clue.x + 1, clue.z)).toBe(true);
    expect(isClueInRange(clue, clue.x + 2, clue.z)).toBe(false);
  });
});

describe("findNearbyClue", () => {
  it("returns the closest defined clue", () => {
    const clue = CLUES[0];

    if (!clue) {
      throw new Error("No hay pistas definidas.");
    }

    expect(findNearbyClue(clue.x, clue.z)?.id).toBe(clue.id);
    expect(findNearbyClue(0, -8)).toBeNull();
  });
});

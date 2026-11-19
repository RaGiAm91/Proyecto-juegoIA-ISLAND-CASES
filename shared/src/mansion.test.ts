import { describe, expect, it } from "vitest";

import { CLUES } from "./clues.js";
import {
  findMansionZone,
  isInsideMansionWall,
  MANSION_DOORWAYS,
  MANSION_WALLS,
  MANSION_ZONES,
} from "./mansion.js";

const keyPoints = [
  ...CLUES.map((clue) => ({ id: clue.id, x: clue.x, z: clue.z })),
  { id: "spawn-a", x: -6, z: -4 },
  { id: "spawn-b", x: -3, z: -4 },
  { id: "spawn-c", x: 0, z: -4 },
  { id: "spawn-d", x: 3, z: -4 },
  { id: "spawn-e", x: 6, z: -4 },
];

describe("MANSION_ZONES", () => {
  it("uses unique zone identifiers", () => {
    expect(new Set(MANSION_ZONES.map((zone) => zone.id)).size).toBe(MANSION_ZONES.length);
  });

  it("resolves the key investigation points", () => {
    expect(findMansionZone(-6, -2.2)?.id).toBe("entrance-hall");
    expect(findMansionZone(-6.4, 8)?.id).toBe("library");
    expect(findMansionZone(0, 2.8)?.id).toBe("main-hall");
    expect(findMansionZone(5.5, 8.6)?.id).toBe("portrait-gallery");
  });
});

describe("MANSION_WALLS", () => {
  it("uses unique wall identifiers and positive extents", () => {
    expect(new Set(MANSION_WALLS.map((wall) => wall.id)).size).toBe(MANSION_WALLS.length);

    for (const wall of MANSION_WALLS) {
      expect(wall.maxX).toBeGreaterThan(wall.minX);
      expect(wall.maxZ).toBeGreaterThan(wall.minZ);
    }
  });

  it("does not block clue or spawn points", () => {
    for (const point of keyPoints) {
      expect(isInsideMansionWall(point.x, point.z), point.id).toBe(false);
    }
  });

  it("keeps every doorway open", () => {
    expect(new Set(MANSION_DOORWAYS.map((doorway) => doorway.id)).size).toBe(
      MANSION_DOORWAYS.length,
    );

    for (const doorway of MANSION_DOORWAYS) {
      expect(isInsideMansionWall(doorway.x, doorway.z), doorway.id).toBe(false);
    }
  });

  it("covers exterior walls and interior partitions", () => {
    expect(isInsideMansionWall(0, 10)).toBe(true);
    expect(isInsideMansionWall(10, 0)).toBe(true);
    expect(isInsideMansionWall(-4, -8)).toBe(true);
    expect(isInsideMansionWall(-8, 0)).toBe(true);
  });
});

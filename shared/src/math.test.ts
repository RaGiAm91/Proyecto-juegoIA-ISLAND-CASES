import { describe, expect, it } from "vitest";

import { applyMovement, clamp, lerpAngle, normalizeAxes, smoothingFactor } from "./math.js";

describe("normalizeAxes", () => {
  it("keeps vectors inside the unit circle", () => {
    expect(normalizeAxes({ moveX: 0.5, moveZ: -0.25 })).toEqual({
      moveX: 0.5,
      moveZ: -0.25,
    });
  });

  it("normalizes diagonal movement", () => {
    const axes = normalizeAxes({ moveX: 1, moveZ: 1 });

    expect(Math.hypot(axes.moveX, axes.moveZ)).toBeCloseTo(1);
  });

  it("keeps idle movement at zero", () => {
    expect(normalizeAxes({ moveX: 0, moveZ: 0 })).toEqual({ moveX: 0, moveZ: 0 });
  });
});

describe("applyMovement", () => {
  it("moves forward at the requested speed", () => {
    const player = { x: 0, z: 0 };

    applyMovement(player, { moveX: 0, moveZ: 1 }, 4, 0.05, 9);

    expect(player.x).toBe(0);
    expect(player.z).toBeCloseTo(0.2);
  });

  it("normalizes diagonal movement", () => {
    const player = { x: 0, z: 0 };

    applyMovement(player, { moveX: 1, moveZ: 1 }, 4, 0.05, 9);

    expect(Math.hypot(player.x, player.z)).toBeCloseTo(0.2);
  });

  it("clamps players to the room bounds", () => {
    const player = { x: 8.9, z: 0 };

    applyMovement(player, { moveX: 1, moveZ: 0 }, 4, 1, 9);

    expect(player.x).toBe(9);
  });
});

describe("clamp", () => {
  it("limits values to the requested range", () => {
    expect(clamp(-16, -9, 9)).toBe(-9);
    expect(clamp(16, -9, 9)).toBe(9);
    expect(clamp(2, -9, 9)).toBe(2);
  });
});

describe("lerpAngle", () => {
  it("takes the shortest path across the angle boundary", () => {
    const result = lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);

    expect(Math.abs(result)).toBeCloseTo(Math.PI);
  });
});

describe("smoothingFactor", () => {
  it("returns a stable interpolation factor", () => {
    expect(smoothingFactor(8, 0)).toBe(0);
    expect(smoothingFactor(8, 0.05)).toBeGreaterThan(0);
    expect(smoothingFactor(8, 0.05)).toBeLessThan(1);
  });
});

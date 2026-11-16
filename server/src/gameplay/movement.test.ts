import { describe, expect, it } from "vitest";

import { applyMovement } from "./movement.js";

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

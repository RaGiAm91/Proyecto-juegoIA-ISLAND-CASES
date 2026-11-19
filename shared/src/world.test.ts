import { describe, expect, it } from "vitest";

import { applyMovement } from "./math.js";
import { MANSION_OBSTACLES, resolveCollisions } from "./world.js";

const table = MANSION_OBSTACLES[0];

if (!table) {
  throw new Error("La mesa debe estar definida en el layout de la mansión.");
}

describe("MANSION_OBSTACLES", () => {
  it("incluye los tabiques interiores como obstáculos", () => {
    expect(MANSION_OBSTACLES.some((obstacle) => obstacle.id === "west-partition-mid")).toBe(true);
    expect(MANSION_OBSTACLES.some((obstacle) => obstacle.id === "east-partition-mid")).toBe(true);
  });
});

describe("resolveCollisions", () => {
  it("expulsa al jugador por el lado más cercano cuando queda dentro de un obstáculo", () => {
    const player = { x: 0, z: 0 };

    resolveCollisions(player, [table]);

    expect(player.x).toBe(0);
    expect(player.z).toBeCloseTo(-1.45);
  });

  it("deja libre al jugador que no toca ningún obstáculo", () => {
    const player = { x: -6, z: -4 };

    resolveCollisions(player, MANSION_OBSTACLES);

    expect(player.x).toBe(-6);
    expect(player.z).toBe(-4);
  });

  it("no atraviesa la mesa al moverse desde fuera", () => {
    const player = { x: 0, z: -2 };

    for (let step = 0; step < 20; step += 1) {
      applyMovement(player, { moveX: 0, moveZ: 1 }, 4, 0.05, 9, [table]);
    }

    expect(player.z).toBeLessThanOrEqual(table.minZ - 0.34);
  });
});

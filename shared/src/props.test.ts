import { describe, expect, it } from "vitest";

import { ROOM_BOUNDS } from "./constants.js";
import { findNearbyClue } from "./clues.js";
import { applyMovement } from "./math.js";
import { findMansionZone } from "./mansion.js";
import { ENTRANCE_HALL_PROPS } from "./props.js";
import { MANSION_OBSTACLES } from "./world.js";

describe("ENTRANCE_HALL_PROPS", () => {
  it("usa identificadores únicos y permanece dentro del vestíbulo", () => {
    const ids = ENTRANCE_HALL_PROPS.map((prop) => prop.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const prop of ENTRANCE_HALL_PROPS) {
      const centerX = (prop.minX + prop.maxX) / 2;
      const centerZ = (prop.minZ + prop.maxZ) / 2;

      expect(findMansionZone(centerX, centerZ)?.id).toBe("entrance-hall");
    }
  });

  it("registra cada mueble como obstáculo compartido", () => {
    for (const prop of ENTRANCE_HALL_PROPS) {
      const obstacle = MANSION_OBSTACLES.find((entry) => entry.id === prop.id);

      expect(obstacle).toMatchObject({
        minX: prop.minX,
        maxX: prop.maxX,
        minZ: prop.minZ,
        maxZ: prop.maxZ,
      });
    }
  });

  it("deja accesible el libro de visitas desde el spawn", () => {
    const player = { x: -6, z: -4 };

    for (let step = 0; step < 6; step += 1) {
      applyMovement(player, { moveX: 0, moveZ: 1 }, 4, 0.05, ROOM_BOUNDS, MANSION_OBSTACLES);
    }

    expect(findNearbyClue(player.x, player.z)?.id).toBe("guest-book");
  });
});

import { PLAYER_RADIUS } from "./constants.js";
import { MANSION_WALLS } from "./mansion.js";
import type { MutablePosition } from "./math.js";
import { ENTRANCE_HALL_PROPS } from "./props.js";

export interface Obstacle {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const MANSION_OBSTACLES: readonly Obstacle[] = [
  { id: "table", minX: -2.1, maxX: 2.1, minZ: -1.1, maxZ: 1.1 },
  { id: "chair-nw", minX: -1.6, maxX: -0.8, minZ: 1.5, maxZ: 2.3 },
  { id: "chair-ne", minX: 0.8, maxX: 1.6, minZ: 1.5, maxZ: 2.3 },
  { id: "chair-sw", minX: -1.6, maxX: -0.8, minZ: -2.3, maxZ: -1.5 },
  { id: "chair-se", minX: 0.8, maxX: 1.6, minZ: -2.3, maxZ: -1.5 },
  { id: "fireplace", minX: -8.5, maxX: -4.3, minZ: 8.25, maxZ: 9.9 },
  ...ENTRANCE_HALL_PROPS.map((prop) => ({
    id: prop.id,
    minX: prop.minX,
    maxX: prop.maxX,
    minZ: prop.minZ,
    maxZ: prop.maxZ,
  })),
  ...MANSION_WALLS.map((wall) => ({
    id: wall.id,
    minX: wall.minX,
    maxX: wall.maxX,
    minZ: wall.minZ,
    maxZ: wall.maxZ,
  })),
];

export function resolveCollisions(position: MutablePosition, obstacles: readonly Obstacle[]): void {
  for (const obstacle of obstacles) {
    const closestX = Math.min(Math.max(position.x, obstacle.minX), obstacle.maxX);
    const closestZ = Math.min(Math.max(position.z, obstacle.minZ), obstacle.maxZ);
    const deltaX = position.x - closestX;
    const deltaZ = position.z - closestZ;
    const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;

    if (distanceSquared >= PLAYER_RADIUS * PLAYER_RADIUS) {
      continue;
    }

    if (distanceSquared > 0) {
      const distance = Math.sqrt(distanceSquared);
      const push = (PLAYER_RADIUS - distance) / distance;

      position.x += deltaX * push;
      position.z += deltaZ * push;
      continue;
    }

    const distanceToLeft = Math.abs(position.x - obstacle.minX);
    const distanceToRight = Math.abs(obstacle.maxX - position.x);
    const distanceToBack = Math.abs(position.z - obstacle.minZ);
    const distanceToFront = Math.abs(obstacle.maxZ - position.z);
    const minimum = Math.min(distanceToLeft, distanceToRight, distanceToBack, distanceToFront);

    if (minimum === distanceToLeft) {
      position.x = obstacle.minX - PLAYER_RADIUS;
    } else if (minimum === distanceToRight) {
      position.x = obstacle.maxX + PLAYER_RADIUS;
    } else if (minimum === distanceToBack) {
      position.z = obstacle.minZ - PLAYER_RADIUS;
    } else {
      position.z = obstacle.maxZ + PLAYER_RADIUS;
    }
  }
}

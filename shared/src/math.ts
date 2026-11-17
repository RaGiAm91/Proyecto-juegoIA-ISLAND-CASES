import type { MovementAxes } from "./types.js";
import { resolveCollisions, type Obstacle } from "./world.js";

export interface MutablePosition {
  x: number;
  z: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAxes(axes: MovementAxes): MovementAxes {
  const length = Math.hypot(axes.moveX, axes.moveZ);

  if (length <= 1) {
    return { moveX: axes.moveX, moveZ: axes.moveZ };
  }

  const scale = 1 / length;

  return {
    moveX: axes.moveX * scale,
    moveZ: axes.moveZ * scale,
  };
}

export function applyMovement(
  player: MutablePosition,
  axes: MovementAxes,
  speed: number,
  dt: number,
  bounds: number,
  obstacles: readonly Obstacle[] = [],
): void {
  const normalized = normalizeAxes(axes);

  player.x = clamp(player.x + normalized.moveX * speed * dt, -bounds, bounds);
  player.z = clamp(player.z + normalized.moveZ * speed * dt, -bounds, bounds);

  if (obstacles.length > 0) {
    resolveCollisions(player, obstacles);
  }
}

export function lerpAngle(from: number, to: number, amount: number): number {
  let difference = (to - from) % (Math.PI * 2);

  if (difference > Math.PI) {
    difference -= Math.PI * 2;
  }

  if (difference < -Math.PI) {
    difference += Math.PI * 2;
  }

  return from + difference * amount;
}

export function smoothingFactor(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

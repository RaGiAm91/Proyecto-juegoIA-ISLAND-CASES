import type { PlayerInput } from "@island-cases/shared";

export interface MutablePosition {
  x: number;
  z: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applyMovement(
  player: MutablePosition,
  input: Pick<PlayerInput, "moveX" | "moveZ">,
  speed: number,
  dt: number,
  bounds: number,
): void {
  const length = Math.hypot(input.moveX, input.moveZ);

  if (length === 0) {
    return;
  }

  const scale = length > 1 ? 1 / length : 1;

  player.x = clamp(player.x + input.moveX * scale * speed * dt, -bounds, bounds);
  player.z = clamp(player.z + input.moveZ * scale * speed * dt, -bounds, bounds);
}

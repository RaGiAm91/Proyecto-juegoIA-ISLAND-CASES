import type { MATCH_PHASES } from "./constants.js";

export type MatchPhase = (typeof MATCH_PHASES)[keyof typeof MATCH_PHASES];

export interface MovementAxes {
  moveX: number;
  moveZ: number;
}

export interface PlayerInput extends MovementAxes {
  seq: number;
  yaw: number;
}

export interface JoinOptions {
  name: string;
}

export interface PlayerView {
  x: number;
  y: number;
  z: number;
  rotation: number;
  name: string;
  connected: boolean;
}

export interface MatchStateView {
  phase: MatchPhase;
  players: ReadonlyMap<string, PlayerView>;
}

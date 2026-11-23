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

export interface ReadyPayload {
  ready: boolean;
}

export interface InspectPayload {
  clueId: string;
}

export interface HubInteractPayload {
  interactableId: string;
}

export interface DebugSetPositionPayload {
  x: number;
  z: number;
}

export interface PlayerView {
  x: number;
  y: number;
  z: number;
  rotation: number;
  name: string;
  connected: boolean;
  team: number;
  ready: boolean;
  alive: boolean;
  spectating: boolean;
  spectatorTarget: string;
  deathCause: string;
}

export interface TeamView {
  discoveredClues: readonly string[];
}

export interface MatchStateView {
  phase: MatchPhase;
  countdown: number;
  players: ReadonlyMap<string, PlayerView>;
  teams: ReadonlyMap<string, TeamView>;
  eventLog: readonly string[];
}

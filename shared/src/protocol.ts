export const PROTOCOL_VERSION = "0.1.0";
export const ROOM_NAME = "match";
export const DEFAULT_SERVER_PORT = 2567;

export const TICK_RATE = 20;
export const INPUT_SEND_RATE = 30;

export const PLAYER_SPEED = 4;
export const ROOM_BOUNDS = 9;
export const PLAYER_HEIGHT = 1.8;

export interface PlayerInput {
  seq: number;
  moveX: number;
  moveZ: number;
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
  phase: string;
  players: Map<string, PlayerView>;
}

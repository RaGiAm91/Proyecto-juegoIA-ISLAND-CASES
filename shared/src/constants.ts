export const PROTOCOL_VERSION = "0.1.0";
export const ROOM_NAME = "match";
export const DEFAULT_SERVER_PORT = 2567;

export const MAX_PLAYERS = 20;
export const TEAM_SIZE = 2;
export const MAX_TEAMS = 10;
export const COUNTDOWN_SECONDS = 3;
export const TICK_RATE = 20;
export const INPUT_SEND_RATE = 30;

export const PLAYER_SPEED = 4;
export const ROOM_BOUNDS = 9;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_RADIUS = 0.35;
export const INTERACTION_RADIUS = 1.6;

export const MIN_PLAYER_NAME_LENGTH = 1;
export const MAX_PLAYER_NAME_LENGTH = 20;
export const DEFAULT_PLAYER_NAME = "Investigador";

export const LOCAL_CORRECTION_THRESHOLD = 0.75;
export const LOCAL_CORRECTION_RATE = 8;
export const REMOTE_INTERPOLATION_RATE = 12;

export const MATCH_PHASES = {
  WAITING: "WAITING",
  COUNTDOWN: "COUNTDOWN",
  PLAYING: "PLAYING",
} as const;

import type { PlayerInput, ReadyPayload } from "./types.js";

export const CLIENT_MESSAGES = {
  PLAYER_INPUT: "player:input",
  LOBBY_READY: "lobby:ready",
} as const;

export type ClientMessageName = (typeof CLIENT_MESSAGES)[keyof typeof CLIENT_MESSAGES];

export interface ClientMessagePayloads {
  [CLIENT_MESSAGES.PLAYER_INPUT]: PlayerInput;
  [CLIENT_MESSAGES.LOBBY_READY]: ReadyPayload;
}

export type ClientMessage = {
  [Name in ClientMessageName]: {
    name: Name;
    payload: ClientMessagePayloads[Name];
  };
}[ClientMessageName];

import type { PlayerInput } from "./types.js";

export const CLIENT_MESSAGES = {
  PLAYER_INPUT: "player:input",
} as const;

export type ClientMessageName = (typeof CLIENT_MESSAGES)[keyof typeof CLIENT_MESSAGES];

export interface ClientMessagePayloads {
  [CLIENT_MESSAGES.PLAYER_INPUT]: PlayerInput;
}

export type ClientMessage = {
  [Name in ClientMessageName]: {
    name: Name;
    payload: ClientMessagePayloads[Name];
  };
}[ClientMessageName];

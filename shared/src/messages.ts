import type { HubPanelPayload } from "./hub.js";
import type {
  DebugSetPositionPayload,
  HubInteractPayload,
  InspectPayload,
  PlayerInput,
  ReadyPayload,
} from "./types.js";

export const CLIENT_MESSAGES = {
  PLAYER_INPUT: "player:input",
  LOBBY_READY: "lobby:ready",
  CLUE_INSPECT: "clue:inspect",
  HUB_INTERACT: "hub:interact",
  DEBUG_SET_POSITION: "debug:set-position",
} as const;

export type ClientMessageName = (typeof CLIENT_MESSAGES)[keyof typeof CLIENT_MESSAGES];

export interface ClientMessagePayloads {
  [CLIENT_MESSAGES.PLAYER_INPUT]: PlayerInput;
  [CLIENT_MESSAGES.LOBBY_READY]: ReadyPayload;
  [CLIENT_MESSAGES.CLUE_INSPECT]: InspectPayload;
  [CLIENT_MESSAGES.HUB_INTERACT]: HubInteractPayload;
  [CLIENT_MESSAGES.DEBUG_SET_POSITION]: DebugSetPositionPayload;
}

export const SERVER_MESSAGES = {
  HUB_PANEL: "hub:panel",
} as const;

export type ServerMessageName = (typeof SERVER_MESSAGES)[keyof typeof SERVER_MESSAGES];

export interface ServerMessagePayloads {
  [SERVER_MESSAGES.HUB_PANEL]: HubPanelPayload;
}

export type ClientMessage = {
  [Name in ClientMessageName]: {
    name: Name;
    payload: ClientMessagePayloads[Name];
  };
}[ClientMessageName];

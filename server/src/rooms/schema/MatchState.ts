import { DEFAULT_PLAYER_NAME, MATCH_PHASES } from "@island-cases/shared";
import { schema, t, type SchemaType } from "@colyseus/schema";

export const PlayerState = schema(
  {
    x: t.number().default(0),
    y: t.number().default(0),
    z: t.number().default(0),
    rotation: t.number().default(0),
    name: t.string().default(DEFAULT_PLAYER_NAME),
    connected: t.boolean().default(true),
    team: t.number().default(0),
    ready: t.boolean().default(false),
    alive: t.boolean().default(true),
    spectating: t.boolean().default(false),
    spectatorTarget: t.string().default(""),
    deathCause: t.string().default(""),
  },
  "PlayerState",
);

export type PlayerState = SchemaType<typeof PlayerState>;

export const TeamState = schema(
  {
    discoveredClues: t.array("string"),
  },
  "TeamState",
);

export type TeamState = SchemaType<typeof TeamState>;

export const MatchState = schema(
  {
    phase: t.string().default(MATCH_PHASES.WAITING),
    countdown: t.number().default(0),
    players: t.map(PlayerState),
    teams: t.map(TeamState),
    eventLog: t.array("string"),
  },
  "MatchState",
);

export type MatchState = SchemaType<typeof MatchState>;

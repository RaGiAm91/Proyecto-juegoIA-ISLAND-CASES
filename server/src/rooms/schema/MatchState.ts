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
  },
  "PlayerState",
);

export type PlayerState = SchemaType<typeof PlayerState>;

export const MatchState = schema(
  {
    phase: t.string().default(MATCH_PHASES.WAITING),
    players: t.map(PlayerState),
  },
  "MatchState",
);

export type MatchState = SchemaType<typeof MatchState>;

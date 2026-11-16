import { schema, t, type SchemaType } from "@colyseus/schema";

export const PlayerState = schema(
  {
    x: t.number().default(0),
    y: t.number().default(0),
    z: t.number().default(0),
    rotation: t.number().default(0),
    name: t.string().default("Investigador"),
    connected: t.boolean().default(true),
  },
  "PlayerState",
);

export type PlayerState = SchemaType<typeof PlayerState>;

export const MatchState = schema(
  {
    phase: t.string().default("WAITING"),
    players: t.map(PlayerState),
  },
  "MatchState",
);

export type MatchState = SchemaType<typeof MatchState>;

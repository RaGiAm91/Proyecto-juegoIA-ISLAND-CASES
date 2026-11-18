import { z } from "zod";

import { MAX_PLAYER_NAME_LENGTH, MIN_PLAYER_NAME_LENGTH } from "./constants.js";
import type { JoinOptions, PlayerInput, ReadyPayload } from "./types.js";

export const playerInputSchema: z.ZodType<PlayerInput> = z.object({
  seq: z.number().int().nonnegative(),
  moveX: z.number().min(-1).max(1),
  moveZ: z.number().min(-1).max(1),
  yaw: z.number().finite(),
});

export const playerNameSchema = z
  .string()
  .trim()
  .min(MIN_PLAYER_NAME_LENGTH)
  .max(MAX_PLAYER_NAME_LENGTH)
  .transform((name) => name.replace(/\s+/g, " "));

export const readySchema: z.ZodType<ReadyPayload> = z.object({
  ready: z.boolean(),
});

export const joinOptionsSchema: z.ZodType<JoinOptions> = z.object({
  name: playerNameSchema,
});

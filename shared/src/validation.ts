import { z } from "zod";

import type { JoinOptions, PlayerInput } from "./protocol.js";

export const playerInputSchema: z.ZodType<PlayerInput> = z.object({
  seq: z.number().int().nonnegative(),
  moveX: z.number().min(-1).max(1),
  moveZ: z.number().min(-1).max(1),
  yaw: z.number().finite(),
});

export const joinOptionsSchema: z.ZodType<JoinOptions> = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((name) => name.replace(/\s+/g, " ")),
});

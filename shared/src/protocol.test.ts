import { describe, expect, it } from "vitest";

import { joinOptionsSchema, playerInputSchema } from "./validation.js";

describe("player input contract", () => {
  it("accepts a valid input frame", () => {
    const result = playerInputSchema.safeParse({
      seq: 3,
      moveX: 0.5,
      moveZ: -1,
      yaw: 1.2,
    });

    expect(result.success).toBe(true);
  });

  it("rejects out-of-range movement", () => {
    const result = playerInputSchema.safeParse({
      seq: 1,
      moveX: 2,
      moveZ: 0,
      yaw: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe("join options", () => {
  it("collapses whitespace in names", () => {
    const result = joinOptionsSchema.parse({ name: "  Ada   Lovelace  " });

    expect(result.name).toBe("Ada Lovelace");
  });

  it("rejects blank names", () => {
    const result = joinOptionsSchema.safeParse({ name: "   " });

    expect(result.success).toBe(false);
  });
});

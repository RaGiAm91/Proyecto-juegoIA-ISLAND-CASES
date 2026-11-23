import { describe, expect, it } from "vitest";

import { MAX_PLAYER_NAME_LENGTH } from "./constants.js";
import {
  debugSetPositionSchema,
  hubInteractSchema,
  joinOptionsSchema,
  playerNameSchema,
  playerInputSchema,
} from "./validation.js";

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

  it("rejects non-finite rotation", () => {
    const result = playerInputSchema.safeParse({
      seq: 1,
      moveX: 0,
      moveZ: 0,
      yaw: Number.POSITIVE_INFINITY,
    });

    expect(result.success).toBe(false);
  });
});

describe("player name contract", () => {
  it("trims and collapses whitespace", () => {
    expect(playerNameSchema.parse("  Ada   Lovelace  ")).toBe("Ada Lovelace");
  });

  it("rejects blank names", () => {
    expect(playerNameSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects names over the shared limit", () => {
    expect(playerNameSchema.safeParse("a".repeat(MAX_PLAYER_NAME_LENGTH + 1)).success).toBe(false);
  });
});

describe("join options", () => {
  it("normalizes the investigator name", () => {
    const result = joinOptionsSchema.parse({ name: "  Ada   Lovelace  " });

    expect(result.name).toBe("Ada Lovelace");
  });

  it("rejects missing names", () => {
    expect(joinOptionsSchema.safeParse({}).success).toBe(false);
  });
});

describe("hub interaction contract", () => {
  it("accepts a shared interactable id", () => {
    const result = hubInteractSchema.safeParse({ interactableId: "entrance-directory" });

    expect(result.success).toBe(true);
  });

  it("rejects empty interactable ids", () => {
    expect(hubInteractSchema.safeParse({ interactableId: "" }).success).toBe(false);
  });
});

describe("debug position contract", () => {
  it("accepts a position inside room bounds", () => {
    expect(debugSetPositionSchema.safeParse({ x: -6, z: -2.2 }).success).toBe(true);
  });

  it("rejects positions outside room bounds", () => {
    expect(debugSetPositionSchema.safeParse({ x: 20, z: 0 }).success).toBe(false);
  });
});

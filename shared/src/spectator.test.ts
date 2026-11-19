import { describe, expect, it } from "vitest";

import { chooseSpectatorTarget } from "./spectator.js";
import type { PlayerView } from "./types.js";

function player(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    name: "Investigador",
    connected: true,
    team: 0,
    ready: true,
    alive: true,
    spectating: false,
    spectatorTarget: "",
    deathCause: "",
    ...overrides,
  };
}

describe("chooseSpectatorTarget", () => {
  it("prefers an alive connected teammate", () => {
    const players = new Map<string, PlayerView>([
      ["dead", player({ team: 0, alive: false, spectating: true })],
      ["other-team", player({ team: 1 })],
      ["teammate", player({ team: 0 })],
    ]);

    expect(chooseSpectatorTarget(players, "dead")).toBe("teammate");
  });

  it("falls back to any alive connected player", () => {
    const players = new Map<string, PlayerView>([
      ["dead", player({ team: 0, alive: false, spectating: true })],
      ["other-team", player({ team: 1 })],
      ["disconnected", player({ team: 0, connected: false })],
    ]);

    expect(chooseSpectatorTarget(players, "dead")).toBe("other-team");
  });

  it("returns an empty target when nobody is available", () => {
    const players = new Map<string, PlayerView>([
      ["dead", player({ alive: false, spectating: true })],
      ["other-dead", player({ team: 1, alive: false })],
    ]);

    expect(chooseSpectatorTarget(players, "dead")).toBe("");
  });
});

import { describe, expect, it } from "vitest";

import { assignTeam, canStartMatch, type LobbyPlayer } from "./lobby.js";

function player(team: number, ready = true, connected = true): LobbyPlayer {
  return { team, ready, connected };
}

describe("assignTeam", () => {
  it("pairs consecutive players into the same team", () => {
    expect(assignTeam(0)).toBe(0);
    expect(assignTeam(1)).toBe(0);
    expect(assignTeam(2)).toBe(1);
    expect(assignTeam(19)).toBe(9);
  });
});

describe("canStartMatch", () => {
  it("allows a complete ready pair", () => {
    expect(canStartMatch([player(0), player(0)])).toBe(true);
  });

  it("rejects a lone player", () => {
    expect(canStartMatch([player(0)])).toBe(false);
  });

  it("rejects an incomplete team", () => {
    expect(canStartMatch([player(0), player(1)])).toBe(false);
  });

  it("rejects a pair with a player not ready", () => {
    expect(canStartMatch([player(0), player(0, false)])).toBe(false);
  });

  it("rejects a pair with a disconnected player", () => {
    expect(canStartMatch([player(0), player(0, true, false)])).toBe(false);
  });
});

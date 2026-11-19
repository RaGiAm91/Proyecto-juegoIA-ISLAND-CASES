import { describe, expect, it } from "vitest";

import { CLUES } from "./clues.js";
import { GAME_EVENT_BY_CLUE, GAME_EVENT_BY_ID, GAME_EVENTS, getEventForClue } from "./events.js";

describe("GAME_EVENTS", () => {
  it("uses unique event and clue identifiers", () => {
    expect(new Set(GAME_EVENTS.map((event) => event.id)).size).toBe(GAME_EVENTS.length);
    expect(new Set(GAME_EVENTS.map((event) => event.triggerClueId)).size).toBe(GAME_EVENTS.length);
  });

  it("references defined clues", () => {
    const clueIds = new Set(CLUES.map((clue) => clue.id));

    for (const event of GAME_EVENTS) {
      expect(clueIds.has(event.triggerClueId)).toBe(true);
      expect(GAME_EVENT_BY_ID.get(event.id)).toBe(event);
      expect(GAME_EVENT_BY_CLUE.get(event.triggerClueId)).toBe(event);
    }
  });

  it("resolves the fatal guest-book event", () => {
    expect(getEventForClue("guest-book")?.id).toBe("firma-sangrienta");
    expect(getEventForClue("guest-book")?.fatal).toBe(true);
    expect(getEventForClue("desconocida")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { CLUES } from "./clues.js";
import { INTERACTION_RADIUS } from "./constants.js";
import {
  buildHubPanelPayload,
  findNearbyHubInteractable,
  HUB_DESTINATIONS,
  HUB_INTERACTABLES,
  isHubInteractableInRange,
} from "./hub.js";
import { findMansionZone } from "./mansion.js";

describe("HUB_INTERACTABLES", () => {
  it("usa identificadores únicos y permanece en el vestíbulo", () => {
    const ids = HUB_INTERACTABLES.map((interactable) => interactable.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const interactable of HUB_INTERACTABLES) {
      expect(findMansionZone(interactable.x, interactable.z)?.id).toBe("entrance-hall");
    }
  });

  it("detecta el interactuable cercano y respeta el radio de interacción", () => {
    const directory = HUB_INTERACTABLES[0];
    const board = HUB_INTERACTABLES[1];

    expect(directory).toBeDefined();
    expect(board).toBeDefined();
    expect(findNearbyHubInteractable(-9.2, -4.7)?.id).toBe(directory?.id);
    expect(findNearbyHubInteractable(-3, -8.4)?.id).toBe(board?.id);
    expect(findNearbyHubInteractable(0, 0)).toBeNull();

    if (!directory) {
      return;
    }

    expect(isHubInteractableInRange(directory, directory.x + INTERACTION_RADIUS, directory.z)).toBe(
      true,
    );
    expect(
      isHubInteractableInRange(directory, directory.x + INTERACTION_RADIUS + 0.01, directory.z),
    ).toBe(false);
  });

  it("compone el panel con progreso real y destinos compartidos", () => {
    const interactable = HUB_INTERACTABLES[0];

    expect(interactable).toBeDefined();

    if (!interactable) {
      return;
    }

    const panel = buildHubPanelPayload(interactable, ["guest-book", "desconocida"], 2);

    expect(panel).toMatchObject({
      id: interactable.id,
      kind: interactable.kind,
      title: interactable.title,
      cluesFound: 1,
      cluesTotal: CLUES.length,
      events: 2,
    });
    expect(panel.destinations).toEqual(HUB_DESTINATIONS);
  });
});

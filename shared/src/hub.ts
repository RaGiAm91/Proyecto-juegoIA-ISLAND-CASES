import { CLUES } from "./clues.js";
import { INTERACTION_RADIUS } from "./constants.js";

export type HubInteractableKind = "directory" | "board";

export interface HubInteractable {
  id: string;
  kind: HubInteractableKind;
  title: string;
  prompt: string;
  x: number;
  z: number;
}

export interface HubDestination {
  zoneId: string;
  label: string;
  hint: string;
}

export interface HubPanelPayload {
  id: string;
  kind: HubInteractableKind;
  title: string;
  destinations: readonly HubDestination[];
  cluesFound: number;
  cluesTotal: number;
  events: number;
}

export const HUB_INTERACTABLES: readonly HubInteractable[] = [
  {
    id: "entrance-directory",
    kind: "directory",
    title: "Directorio de la mansión",
    prompt: "Consultar directorio",
    x: -9.35,
    z: -4.7,
  },
  {
    id: "investigation-board",
    kind: "board",
    title: "Tablón de investigación",
    prompt: "Leer tablón",
    x: -2.35,
    z: -8.4,
  },
];

export const HUB_INTERACTABLE_BY_ID: ReadonlyMap<string, HubInteractable> = new Map(
  HUB_INTERACTABLES.map((interactable) => [interactable.id, interactable]),
);

export const HUB_DESTINATIONS: readonly HubDestination[] = [
  {
    zoneId: "entrance-hall",
    label: "Vestíbulo",
    hint: "Punto de partida · libro de visitas",
  },
  {
    zoneId: "library",
    label: "Biblioteca",
    hint: "Al norte · archivos y correspondencia",
  },
  {
    zoneId: "main-hall",
    label: "Salón principal",
    hint: "Al este · mesa, sillas y chimenea",
  },
  {
    zoneId: "dining-room",
    label: "Comedor",
    hint: "Más al este · cerrado desde 1954",
  },
  {
    zoneId: "portrait-gallery",
    label: "Galería",
    hint: "Al noreste · retratos y ventana",
  },
];

export function isHubInteractableInRange(
  interactable: HubInteractable,
  x: number,
  z: number,
): boolean {
  const deltaX = interactable.x - x;
  const deltaZ = interactable.z - z;

  return deltaX * deltaX + deltaZ * deltaZ <= INTERACTION_RADIUS * INTERACTION_RADIUS;
}

export function findNearbyHubInteractable(x: number, z: number): HubInteractable | null {
  for (const interactable of HUB_INTERACTABLES) {
    if (isHubInteractableInRange(interactable, x, z)) {
      return interactable;
    }
  }

  return null;
}

export function buildHubPanelPayload(
  interactable: HubInteractable,
  discoveredClueIds: readonly string[],
  eventCount: number,
): HubPanelPayload {
  return {
    id: interactable.id,
    kind: interactable.kind,
    title: interactable.title,
    destinations: HUB_DESTINATIONS,
    cluesFound: CLUES.filter((clue) => discoveredClueIds.includes(clue.id)).length,
    cluesTotal: CLUES.length,
    events: eventCount,
  };
}

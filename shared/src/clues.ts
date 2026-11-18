import { INTERACTION_RADIUS } from "./constants.js";

export interface ClueDefinition {
  id: string;
  title: string;
  detail: string;
  x: number;
  z: number;
}

export const CLUES: readonly ClueDefinition[] = [
  {
    id: "guest-book",
    title: "Libro de visitas",
    detail:
      "La última firma está fechada el 14 de octubre de 1954 y no corresponde a ningún huésped conocido.",
    x: -6,
    z: -2.2,
  },
  {
    id: "mantel-letter",
    title: "Carta junto a la chimenea",
    detail:
      "Una carta sin enviar menciona una llave escondida antes de que la isla quedara aislada.",
    x: -6.4,
    z: 8,
  },
  {
    id: "table-ledger",
    title: "Libro de cuentas",
    detail:
      "El registro de la mansión anota una cena para seis personas, pero solo hay cuatro sillas.",
    x: 0,
    z: 2.8,
  },
  {
    id: "window-photograph",
    title: "Fotografía junto a la ventana",
    detail:
      "La fotografía muestra la mansión con una torre que ya no existe en el blockout actual.",
    x: 5.5,
    z: 8.6,
  },
];

export const CLUE_BY_ID: ReadonlyMap<string, ClueDefinition> = new Map(
  CLUES.map((clue) => [clue.id, clue]),
);

export function isClueInRange(clue: ClueDefinition, x: number, z: number): boolean {
  const deltaX = clue.x - x;
  const deltaZ = clue.z - z;

  return deltaX * deltaX + deltaZ * deltaZ <= INTERACTION_RADIUS * INTERACTION_RADIUS;
}

export function findNearbyClue(x: number, z: number): ClueDefinition | null {
  for (const clue of CLUES) {
    if (isClueInRange(clue, x, z)) {
      return clue;
    }
  }

  return null;
}

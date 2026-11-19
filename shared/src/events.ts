export interface GameEventDefinition {
  id: string;
  title: string;
  detail: string;
  triggerClueId: string;
  fatal: boolean;
}

export const GAME_EVENTS: readonly GameEventDefinition[] = [
  {
    id: "firma-sangrienta",
    title: "Firma sangrienta",
    detail:
      "El libro de visitas se cierra de golpe. La última firma empieza a sangrar y la puerta del salón se condena.",
    triggerClueId: "guest-book",
    fatal: true,
  },
  {
    id: "carta-sin-remitente",
    title: "Carta sin remitente",
    detail:
      "La carta junto a la chimenea se consume en una llama fría que no calienta la habitación.",
    triggerClueId: "mantel-letter",
    fatal: false,
  },
  {
    id: "cena-incompleta",
    title: "Cena incompleta",
    detail: "Las cuatro sillas se desplazan solas hasta dejar un sitio vacío frente a la ventana.",
    triggerClueId: "table-ledger",
    fatal: false,
  },
  {
    id: "torre-desaparecida",
    title: "Torre desaparecida",
    detail: "En la fotografía, la torre que ya no existe vuelve a aparecer durante un instante.",
    triggerClueId: "window-photograph",
    fatal: false,
  },
];

export const GAME_EVENT_BY_ID: ReadonlyMap<string, GameEventDefinition> = new Map(
  GAME_EVENTS.map((event) => [event.id, event]),
);

export const GAME_EVENT_BY_CLUE: ReadonlyMap<string, GameEventDefinition> = new Map(
  GAME_EVENTS.map((event) => [event.triggerClueId, event]),
);

export function getEventForClue(clueId: string): GameEventDefinition | null {
  return GAME_EVENT_BY_CLUE.get(clueId) ?? null;
}

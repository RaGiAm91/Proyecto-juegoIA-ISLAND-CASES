import type { MansionBounds } from "./mansion.js";

export type MansionPropKind = "console" | "coat-rack" | "lectern";

export interface MansionProp extends MansionBounds {
  id: string;
  kind: MansionPropKind;
  height: number;
}

export const ENTRANCE_HALL_PROPS: readonly MansionProp[] = [
  {
    id: "entrance-console",
    kind: "console",
    minX: -9.5,
    maxX: -8.7,
    minZ: -3.8,
    maxZ: -1.4,
    height: 1.05,
  },
  {
    id: "entrance-coat-rack",
    kind: "coat-rack",
    minX: -9.05,
    maxX: -8.55,
    minZ: -8.45,
    maxZ: -7.95,
    height: 1.85,
  },
  {
    id: "guest-book-lectern",
    kind: "lectern",
    minX: -6.35,
    maxX: -5.65,
    minZ: -1.9,
    maxZ: -1.2,
    height: 0.95,
  },
];

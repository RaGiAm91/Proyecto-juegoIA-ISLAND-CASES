export interface MansionBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MansionZone extends MansionBounds {
  id: string;
  name: string;
}

export interface MansionWall extends MansionBounds {
  id: string;
  kind: "exterior" | "partition";
}

export interface MansionDoorway {
  id: string;
  x: number;
  z: number;
  width: number;
  axis: "x" | "z";
}

export const MANSION_ZONES: readonly MansionZone[] = [
  { id: "entrance-hall", name: "Vestíbulo", minX: -10, maxX: -2, minZ: -10, maxZ: 2 },
  { id: "library", name: "Biblioteca", minX: -10, maxX: -2, minZ: 2, maxZ: 10 },
  { id: "main-hall", name: "Salón principal", minX: -2, maxX: 4, minZ: -10, maxZ: 10 },
  { id: "dining-room", name: "Comedor", minX: 4, maxX: 10, minZ: -10, maxZ: 0 },
  { id: "portrait-gallery", name: "Galería", minX: 4, maxX: 10, minZ: 0, maxZ: 10 },
];

export const MANSION_WALLS: readonly MansionWall[] = [
  { id: "exterior-north", kind: "exterior", minX: -10, maxX: 10, minZ: 9.75, maxZ: 10.25 },
  { id: "exterior-south", kind: "exterior", minX: -10, maxX: 10, minZ: -10.25, maxZ: -9.75 },
  { id: "exterior-west", kind: "exterior", minX: -10.25, maxX: -9.75, minZ: -10, maxZ: 10 },
  { id: "exterior-east", kind: "exterior", minX: 9.75, maxX: 10.25, minZ: -10, maxZ: 10 },
  {
    id: "west-partition-south",
    kind: "partition",
    minX: -2.15,
    maxX: -1.85,
    minZ: -10,
    maxZ: -7.6,
  },
  {
    id: "west-partition-mid",
    kind: "partition",
    minX: -2.15,
    maxX: -1.85,
    minZ: -4.4,
    maxZ: 3.4,
  },
  {
    id: "west-partition-north",
    kind: "partition",
    minX: -2.15,
    maxX: -1.85,
    minZ: 6.6,
    maxZ: 10,
  },
  {
    id: "east-partition-south",
    kind: "partition",
    minX: 3.85,
    maxX: 4.15,
    minZ: -10,
    maxZ: -7,
  },
  {
    id: "east-partition-mid",
    kind: "partition",
    minX: 3.85,
    maxX: 4.15,
    minZ: -5,
    maxZ: 2,
  },
  {
    id: "east-partition-north",
    kind: "partition",
    minX: 3.85,
    maxX: 4.15,
    minZ: 4,
    maxZ: 10,
  },
  {
    id: "west-cross-west",
    kind: "partition",
    minX: -10,
    maxX: -7.6,
    minZ: 1.85,
    maxZ: 2.15,
  },
  {
    id: "west-cross-east",
    kind: "partition",
    minX: -4.4,
    maxX: -2,
    minZ: 1.85,
    maxZ: 2.15,
  },
  {
    id: "east-cross-west",
    kind: "partition",
    minX: 4,
    maxX: 6,
    minZ: -0.15,
    maxZ: 0.15,
  },
  {
    id: "east-cross-east",
    kind: "partition",
    minX: 8,
    maxX: 10,
    minZ: -0.15,
    maxZ: 0.15,
  },
];

export const MANSION_DOORWAYS: readonly MansionDoorway[] = [
  { id: "west-south-door", x: -2, z: -6, width: 3.2, axis: "z" },
  { id: "west-north-door", x: -2, z: 5, width: 3.2, axis: "z" },
  { id: "east-south-door", x: 4, z: -6, width: 2, axis: "z" },
  { id: "east-north-door", x: 4, z: 3, width: 2, axis: "z" },
  { id: "west-cross-door", x: -6, z: 2, width: 3.2, axis: "x" },
  { id: "east-cross-door", x: 7, z: 0, width: 2, axis: "x" },
];

export function isInsideMansionBounds(bounds: MansionBounds, x: number, z: number): boolean {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

export function findMansionZone(x: number, z: number): MansionZone | null {
  for (const zone of MANSION_ZONES) {
    if (isInsideMansionBounds(zone, x, z)) {
      return zone;
    }
  }

  return null;
}

export function isInsideMansionWall(x: number, z: number): boolean {
  return MANSION_WALLS.some((wall) => isInsideMansionBounds(wall, x, z));
}

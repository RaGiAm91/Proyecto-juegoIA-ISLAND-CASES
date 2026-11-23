import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/Builders/capsuleBuilder";
import "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import "@babylonjs/core/Meshes/Builders/discBuilder";
import "@babylonjs/core/Meshes/Builders/planeBuilder";
import "@babylonjs/core/Meshes/Builders/sphereBuilder";
import "@babylonjs/core/Meshes/Builders/torusBuilder";

export interface CharacterView {
  root: TransformNode;
  dispose: () => void;
}

function createNameplate(scene: Scene, name: string): Mesh {
  const texture = new DynamicTexture(
    `nameplate-${name}`,
    { width: 512, height: 128 },
    scene,
    false,
  );
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;

  context.clearRect(0, 0, 512, 128);
  context.font = "600 48px Georgia, serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0, 0, 0, 0.95)";
  context.shadowBlur = 14;
  context.fillStyle = "#F4EBDD";
  context.fillText(name, 256, 64);
  texture.update();

  const plane = MeshBuilder.CreatePlane(
    `nameplate-plane-${name}`,
    { width: 2.4, height: 0.6 },
    scene,
  );
  const material = new StandardMaterial(`nameplate-material-${name}`, scene);

  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = Color3.White();
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.useAlphaFromDiffuseTexture = true;

  plane.material = material;
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;
  plane.position.y = 2.35;

  return plane;
}

export function createCharacter(
  scene: Scene,
  name: string,
  colorHex: string,
  isLocal: boolean,
): CharacterView {
  const root = new TransformNode(`character-${name}`, scene);

  const bodyMaterial = new PBRMaterial(`body-material-${name}`, scene);
  bodyMaterial.albedoColor = Color3.FromHexString(colorHex);
  bodyMaterial.metallic = 0;
  bodyMaterial.roughness = 0.72;

  const skinMaterial = new PBRMaterial(`skin-material-${name}`, scene);
  skinMaterial.albedoColor = Color3.FromHexString("#C99B72");
  skinMaterial.metallic = 0;
  skinMaterial.roughness = 0.86;

  const hatMaterial = new PBRMaterial(`hat-material-${name}`, scene);
  hatMaterial.albedoColor = Color3.FromHexString("#241B17");
  hatMaterial.metallic = 0;
  hatMaterial.roughness = 0.92;

  const body = MeshBuilder.CreateCapsule(
    `body-${name}`,
    { height: 1.2, radius: 0.32, tessellation: 12 },
    scene,
  );
  body.material = bodyMaterial;
  body.position.y = 0.8;
  body.parent = root;

  const head = MeshBuilder.CreateSphere(`head-${name}`, { diameter: 0.48, segments: 12 }, scene);
  head.material = skinMaterial;
  head.position.y = 1.58;
  head.parent = root;

  const hatBrim = MeshBuilder.CreateCylinder(
    `hat-brim-${name}`,
    { height: 0.05, diameter: 0.66, tessellation: 16 },
    scene,
  );
  hatBrim.material = hatMaterial;
  hatBrim.position.y = 1.82;
  hatBrim.parent = root;

  const hatCrown = MeshBuilder.CreateCylinder(
    `hat-crown-${name}`,
    { height: 0.24, diameter: 0.42, tessellation: 16 },
    scene,
  );
  hatCrown.material = hatMaterial;
  hatCrown.position.y = 1.95;
  hatCrown.parent = root;

  const shadow = MeshBuilder.CreateDisc(
    `shadow-${name}`,
    { radius: 0.46, tessellation: 24 },
    scene,
  );
  const shadowMaterial = new StandardMaterial(`shadow-material-${name}`, scene);
  shadowMaterial.diffuseColor = Color3.Black();
  shadowMaterial.emissiveColor = Color3.Black();
  shadowMaterial.alpha = 0.32;
  shadowMaterial.disableLighting = true;
  shadowMaterial.backFaceCulling = false;
  shadow.material = shadowMaterial;
  shadow.rotation.x = Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.isPickable = false;
  shadow.parent = root;

  if (isLocal) {
    const ring = MeshBuilder.CreateTorus(
      `local-ring-${name}`,
      { diameter: 1.15, thickness: 0.055, tessellation: 32 },
      scene,
    );
    const ringMaterial = new StandardMaterial(`local-ring-material-${name}`, scene);
    ringMaterial.emissiveColor = Color3.FromHexString("#A8863F");
    ringMaterial.diffuseColor = Color3.Black();
    ringMaterial.disableLighting = true;
    ring.material = ringMaterial;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    ring.isPickable = false;
    ring.parent = root;
  }

  const nameplate = createNameplate(scene, name);
  nameplate.parent = root;

  return {
    root,
    dispose: () => {
      root.dispose(false, true);
    },
  };
}

export function createTestCharacter(scene: Scene): CharacterView {
  const character = createCharacter(scene, "PRUEBAS", "#2E4057", false);
  const detailMaterial = new PBRMaterial("test-character-detail-material", scene);

  detailMaterial.albedoColor = Color3.FromHexString("#2E4057");
  detailMaterial.metallic = 0;
  detailMaterial.roughness = 0.8;

  for (const side of [-1, 1]) {
    const arm = MeshBuilder.CreateCapsule(
      `test-character-arm-${side}`,
      { height: 0.78, radius: 0.09, tessellation: 10 },
      scene,
    );
    arm.material = detailMaterial;
    arm.position.set(side * 0.42, 0.86, 0);
    arm.rotation.z = side * 0.22;
    arm.parent = character.root;

    const leg = MeshBuilder.CreateCapsule(
      `test-character-leg-${side}`,
      { height: 0.7, radius: 0.11, tessellation: 10 },
      scene,
    );
    leg.material = detailMaterial;
    leg.position.set(side * 0.16, 0.35, 0);
    leg.parent = character.root;
  }

  const badgeTexture = new DynamicTexture(
    "test-character-badge-texture",
    { width: 256, height: 96 },
    scene,
    false,
  );
  const context = badgeTexture.getContext() as unknown as CanvasRenderingContext2D;

  context.fillStyle = "#A8863F";
  context.fillRect(0, 0, 256, 96);
  context.fillStyle = "#0B0B0D";
  context.font = "bold 52px Courier New";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("TEST", 128, 50);
  badgeTexture.update();

  const badgeMaterial = new StandardMaterial("test-character-badge-material", scene);
  badgeMaterial.diffuseTexture = badgeTexture;
  badgeMaterial.emissiveColor = Color3.White();
  badgeMaterial.disableLighting = true;
  badgeMaterial.backFaceCulling = false;

  const badge = MeshBuilder.CreatePlane(
    "test-character-badge",
    { width: 0.52, height: 0.2 },
    scene,
  );
  badge.material = badgeMaterial;
  badge.position.set(0, 0.98, 0.34);
  badge.isPickable = false;
  badge.parent = character.root;

  return character;
}

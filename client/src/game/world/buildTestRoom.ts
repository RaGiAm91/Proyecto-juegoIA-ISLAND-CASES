import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/Builders/boxBuilder";
import "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import "@babylonjs/core/Meshes/Builders/groundBuilder";
import "@babylonjs/core/Meshes/Builders/sphereBuilder";

function makePbr(scene: Scene, name: string, color: string, roughness = 0.8): PBRMaterial {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = Color3.FromHexString(color);
  material.metallic = 0;
  material.roughness = roughness;
  return material;
}

function makeEmissive(scene: Scene, name: string, color: string): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.Black();
  material.emissiveColor = Color3.FromHexString(color);
  material.disableLighting = true;
  return material;
}

export function buildTestRoom(scene: Scene): void {
  scene.clearColor = new Color4(0.012, 0.014, 0.018, 1);
  scene.ambientColor = new Color3(0.03, 0.03, 0.04);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.035;
  scene.fogColor = Color3.FromHexString("#0B0B0D");
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType =
    ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.25;
  scene.imageProcessingConfiguration.contrast = 1.12;

  const floorMaterial = makePbr(scene, "floor-material", "#3B2A20", 0.88);
  const wallMaterial = makePbr(scene, "wall-material", "#1F3A2E", 0.92);
  const trimMaterial = makePbr(scene, "trim-material", "#A8863F", 0.42);
  const darkWood = makePbr(scene, "dark-wood", "#241B17", 0.78);
  const rugMaterial = makePbr(scene, "rug-material", "#5A1F26", 0.95);
  const stoneMaterial = makePbr(scene, "stone-material", "#4A4A46", 0.96);
  const windowMaterial = makeEmissive(scene, "window-material", "#8FB4D8");
  const candleMaterial = makeEmissive(scene, "candle-material", "#FFB35C");

  const floor = MeshBuilder.CreateGround("floor", { width: 20, height: 20 }, scene);
  floor.material = floorMaterial;

  const ceiling = MeshBuilder.CreateBox("ceiling", { width: 20, height: 0.25, depth: 20 }, scene);
  ceiling.position.y = 6.55;
  ceiling.material = darkWood;

  const wallSpecs = [
    { name: "wall-back", x: 0, z: 10, width: 20, depth: 0.5 },
    { name: "wall-front", x: 0, z: -10, width: 20, depth: 0.5 },
    { name: "wall-left", x: -10, z: 0, width: 0.5, depth: 20 },
    { name: "wall-right", x: 10, z: 0, width: 0.5, depth: 20 },
  ];

  for (const wallSpec of wallSpecs) {
    const wall = MeshBuilder.CreateBox(
      wallSpec.name,
      { width: wallSpec.width, height: 6.4, depth: wallSpec.depth },
      scene,
    );
    wall.position.set(wallSpec.x, 3.2, wallSpec.z);
    wall.material = wallMaterial;
  }

  const baseboardBack = MeshBuilder.CreateBox(
    "baseboard-back",
    { width: 20, height: 0.35, depth: 0.12 },
    scene,
  );
  baseboardBack.position.set(0, 0.35, 9.68);
  baseboardBack.material = trimMaterial;

  const baseboardLeft = MeshBuilder.CreateBox(
    "baseboard-left",
    { width: 0.12, height: 0.35, depth: 20 },
    scene,
  );
  baseboardLeft.position.set(-9.68, 0.35, 0);
  baseboardLeft.material = trimMaterial;

  const rug = MeshBuilder.CreateGround("rug", { width: 8, height: 5 }, scene);
  rug.position.y = 0.02;
  rug.material = rugMaterial;

  const windowFrame = MeshBuilder.CreateBox(
    "window-frame",
    { width: 3.2, height: 3, depth: 0.16 },
    scene,
  );
  windowFrame.position.set(5.5, 3.3, 9.68);
  windowFrame.material = darkWood;

  const windowGlass = MeshBuilder.CreateBox(
    "window-glass",
    { width: 2.7, height: 2.5, depth: 0.08 },
    scene,
  );
  windowGlass.position.set(5.5, 3.3, 9.58);
  windowGlass.material = windowMaterial;

  const windowBarV = MeshBuilder.CreateBox(
    "window-bar-v",
    { width: 0.08, height: 2.5, depth: 0.12 },
    scene,
  );
  windowBarV.position.set(5.5, 3.3, 9.52);
  windowBarV.material = trimMaterial;

  const windowBarH = MeshBuilder.CreateBox(
    "window-bar-h",
    { width: 2.7, height: 0.08, depth: 0.12 },
    scene,
  );
  windowBarH.position.set(5.5, 3.3, 9.5);
  windowBarH.material = trimMaterial;

  const fireplace = MeshBuilder.CreateBox(
    "fireplace",
    { width: 3.4, height: 2.6, depth: 0.7 },
    scene,
  );
  fireplace.position.set(-6.4, 1.3, 9.55);
  fireplace.material = stoneMaterial;

  const fireplaceOpening = MeshBuilder.CreateBox(
    "fireplace-opening",
    { width: 1.8, height: 1.35, depth: 0.15 },
    scene,
  );
  fireplaceOpening.position.set(-6.4, 0.8, 9.15);
  fireplaceOpening.material = darkWood;

  const hearth = MeshBuilder.CreateBox("hearth", { width: 4.2, height: 0.18, depth: 1.2 }, scene);
  hearth.position.set(-6.4, 0.09, 8.85);
  hearth.material = stoneMaterial;

  const mantel = MeshBuilder.CreateBox("mantel", { width: 4, height: 0.2, depth: 1 }, scene);
  mantel.position.set(-6.4, 2.65, 9.1);
  mantel.material = darkWood;

  const paintingFrame = MeshBuilder.CreateBox(
    "painting-frame",
    { width: 2.1, height: 2.6, depth: 0.12 },
    scene,
  );
  paintingFrame.position.set(9.68, 3.2, -2.4);
  paintingFrame.material = trimMaterial;

  const paintingCanvas = MeshBuilder.CreateBox(
    "painting-canvas",
    { width: 1.8, height: 2.3, depth: 0.06 },
    scene,
  );
  paintingCanvas.position.set(9.58, 3.2, -2.4);
  paintingCanvas.material = rugMaterial;

  const tableTop = MeshBuilder.CreateBox(
    "table-top",
    { width: 4.2, height: 0.18, depth: 2.2 },
    scene,
  );
  tableTop.position.y = 0.98;
  tableTop.material = darkWood;

  const tableLegPositions = [
    [-1.8, -0.85],
    [1.8, -0.85],
    [-1.8, 0.85],
    [1.8, 0.85],
  ];

  for (const [x, z] of tableLegPositions) {
    const leg = MeshBuilder.CreateCylinder(
      "table-leg",
      { height: 0.95, diameter: 0.14, tessellation: 10 },
      scene,
    );
    leg.position.set(x ?? 0, 0.475, z ?? 0);
    leg.material = darkWood;
  }

  const chairSpecs = [
    { x: -1.2, z: 1.9, rotation: 0 },
    { x: 1.2, z: 1.9, rotation: 0 },
    { x: -1.2, z: -1.9, rotation: Math.PI },
    { x: 1.2, z: -1.9, rotation: Math.PI },
  ];

  for (const chairSpec of chairSpecs) {
    const seat = MeshBuilder.CreateBox(
      "chair-seat",
      { width: 0.8, height: 0.12, depth: 0.8 },
      scene,
    );
    seat.position.set(chairSpec.x, 0.55, chairSpec.z);
    seat.rotation.y = chairSpec.rotation;
    seat.material = darkWood;

    const back = MeshBuilder.CreateBox(
      "chair-back",
      { width: 0.8, height: 0.9, depth: 0.12 },
      scene,
    );
    back.position.set(chairSpec.x, 1.05, chairSpec.z + (chairSpec.z > 0 ? 0.34 : -0.34));
    back.rotation.y = chairSpec.rotation;
    back.material = darkWood;
  }

  const candleA = MeshBuilder.CreateCylinder(
    "candle-a",
    { height: 0.35, diameter: 0.08, tessellation: 10 },
    scene,
  );
  candleA.position.set(-0.7, 1.24, 0);
  candleA.material = candleMaterial;

  const candleB = MeshBuilder.CreateCylinder(
    "candle-b",
    { height: 0.28, diameter: 0.08, tessellation: 10 },
    scene,
  );
  candleB.position.set(0.7, 1.21, 0);
  candleB.material = candleMaterial;

  const chain = MeshBuilder.CreateCylinder(
    "chandelier-chain",
    { height: 1.4, diameter: 0.05, tessellation: 8 },
    scene,
  );
  chain.position.set(0, 5.7, 0);
  chain.material = trimMaterial;

  const chandelier = MeshBuilder.CreateCylinder(
    "chandelier",
    { height: 0.14, diameter: 1.5, tessellation: 20 },
    scene,
  );
  chandelier.position.set(0, 4.95, 0);
  chandelier.material = trimMaterial;

  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const bulb = MeshBuilder.CreateSphere(
      `chandelier-bulb-${index}`,
      { diameter: 0.18, segments: 8 },
      scene,
    );
    bulb.position.set(Math.cos(angle) * 0.65, 4.85, Math.sin(angle) * 0.65);
    bulb.material = candleMaterial;
  }

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.38;
  ambient.diffuse = Color3.FromHexString("#C9D4E0");
  ambient.groundColor = Color3.FromHexString("#241B17");

  const moonlight = new DirectionalLight("moonlight", new Vector3(-0.4, -1, 0.3), scene);
  moonlight.position = new Vector3(8, 9, -8);
  moonlight.intensity = 1.1;
  moonlight.diffuse = Color3.FromHexString("#9FB6D8");

  const windowLight = new PointLight("window-light", new Vector3(5.5, 3.2, 8.8), scene);
  windowLight.intensity = 9;
  windowLight.range = 9;
  windowLight.diffuse = Color3.FromHexString("#8FB4D8");

  const chandelierLight = new PointLight("chandelier-light", new Vector3(0, 4.6, 0), scene);
  chandelierLight.intensity = 14;
  chandelierLight.range = 15;
  chandelierLight.diffuse = Color3.FromHexString("#FFB35C");

  const fireLight = new PointLight("fire-light", new Vector3(-6.4, 1, 8.6), scene);
  fireLight.intensity = 10;
  fireLight.range = 8;
  fireLight.diffuse = Color3.FromHexString("#FF7A3D");
}

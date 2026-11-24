import { ENTRANCE_HALL_PROPS, MANSION_DOORWAYS, MANSION_WALLS } from "@island-cases/shared";
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
import "@babylonjs/core/Meshes/Builders/planeBuilder";
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

function createWallBox(
  scene: Scene,
  name: string,
  material: PBRMaterial,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): void {
  const mesh = MeshBuilder.CreateBox(
    name,
    { width: maxX - minX, height: maxY - minY, depth: maxZ - minZ },
    scene,
  );
  mesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  mesh.material = material;
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
  const partitionMaterial = makePbr(scene, "partition-material", "#2E2A24", 0.9);
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

  for (const wall of MANSION_WALLS) {
    if (wall.id === "exterior-north") {
      createWallBox(scene, "wall-exterior-north-left", wallMaterial, -10, 3.7, 0, 6.4, 9.75, 10.25);
      createWallBox(scene, "wall-exterior-north-right", wallMaterial, 7.3, 10, 0, 6.4, 9.75, 10.25);
      createWallBox(
        scene,
        "wall-exterior-north-below",
        wallMaterial,
        3.7,
        7.3,
        0,
        1.65,
        9.75,
        10.25,
      );
      createWallBox(
        scene,
        "wall-exterior-north-above",
        wallMaterial,
        3.7,
        7.3,
        4.95,
        6.4,
        9.75,
        10.25,
      );
      continue;
    }

    if (wall.id === "exterior-south") {
      createWallBox(
        scene,
        "wall-exterior-south-left",
        wallMaterial,
        -10,
        -9,
        0,
        6.4,
        -10.25,
        -9.75,
      );
      createWallBox(
        scene,
        "wall-exterior-south-right",
        wallMaterial,
        -5,
        10,
        0,
        6.4,
        -10.25,
        -9.75,
      );
      createWallBox(
        scene,
        "wall-exterior-south-above",
        wallMaterial,
        -9,
        -5,
        3.7,
        6.4,
        -10.25,
        -9.75,
      );
      continue;
    }

    createWallBox(
      scene,
      `wall-${wall.id}`,
      wall.kind === "exterior" ? wallMaterial : partitionMaterial,
      wall.minX,
      wall.maxX,
      0,
      6.4,
      wall.minZ,
      wall.maxZ,
    );
  }

  for (const doorway of MANSION_DOORWAYS) {
    const lintelDepth = doorway.axis === "z" ? doorway.width : 0.55;
    const lintelWidth = doorway.axis === "x" ? doorway.width : 0.55;
    const lintel = MeshBuilder.CreateBox(
      `door-lintel-${doorway.id}`,
      { width: lintelWidth, height: 0.28, depth: lintelDepth },
      scene,
    );
    lintel.position.set(doorway.x, 2.85, doorway.z);
    lintel.material = trimMaterial;

    const jambPositions =
      doorway.axis === "z"
        ? [
            { x: doorway.x, z: doorway.z - doorway.width / 2 },
            { x: doorway.x, z: doorway.z + doorway.width / 2 },
          ]
        : [
            { x: doorway.x - doorway.width / 2, z: doorway.z },
            { x: doorway.x + doorway.width / 2, z: doorway.z },
          ];

    for (const [index, jambPosition] of jambPositions.entries()) {
      const jamb = MeshBuilder.CreateBox(
        `door-jamb-${doorway.id}-${index}`,
        { width: 0.55, height: 2.8, depth: 0.55 },
        scene,
      );
      jamb.position.set(jambPosition.x, 1.4, jambPosition.z);
      jamb.material = trimMaterial;
    }
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

  const frontDoorFrame = MeshBuilder.CreateBox(
    "front-door-frame",
    { width: 3.6, height: 3.7, depth: 0.18 },
    scene,
  );
  frontDoorFrame.position.set(-7, 1.85, -9.64);
  frontDoorFrame.material = trimMaterial;

  const frontDoorLeft = MeshBuilder.CreateBox(
    "front-door-left",
    { width: 1.55, height: 3.2, depth: 0.14 },
    scene,
  );
  frontDoorLeft.position.set(-7.8, 1.6, -9.5);
  frontDoorLeft.material = darkWood;

  const frontDoorRight = MeshBuilder.CreateBox(
    "front-door-right",
    { width: 1.55, height: 3.2, depth: 0.14 },
    scene,
  );
  frontDoorRight.position.set(-6.2, 1.6, -9.5);
  frontDoorRight.material = darkWood;

  const frontDoorTransom = MeshBuilder.CreateBox(
    "front-door-transom",
    { width: 3.1, height: 0.38, depth: 0.12 },
    scene,
  );
  frontDoorTransom.position.set(-7, 3.35, -9.5);
  frontDoorTransom.material = windowMaterial;

  const frontDoorKnocker = MeshBuilder.CreateSphere(
    "front-door-knocker",
    { diameter: 0.18, segments: 10 },
    scene,
  );
  frontDoorKnocker.position.set(-6.45, 1.65, -9.38);
  frontDoorKnocker.material = trimMaterial;

  const entranceMedallion = MeshBuilder.CreateCylinder(
    "entrance-medallion",
    { height: 0.02, diameter: 1.8, tessellation: 32 },
    scene,
  );
  entranceMedallion.position.set(-8.2, 0.03, -8.6);
  entranceMedallion.material = stoneMaterial;

  const entranceMedallionCore = MeshBuilder.CreateCylinder(
    "entrance-medallion-core",
    { height: 0.03, diameter: 1.1, tessellation: 32 },
    scene,
  );
  entranceMedallionCore.position.set(-8.2, 0.05, -8.6);
  entranceMedallionCore.material = trimMaterial;

  const runnerBorder = MeshBuilder.CreateGround(
    "entrance-runner-border",
    { width: 3.8, height: 7.6 },
    scene,
  );
  runnerBorder.position.set(-6.2, 0.022, -5.5);
  runnerBorder.material = trimMaterial;

  const eastGuide = MeshBuilder.CreateGround(
    "entrance-guide-east",
    { width: 3.8, height: 0.16 },
    scene,
  );
  eastGuide.position.set(-3.7, 0.03, -6);
  eastGuide.material = makeEmissive(scene, "entrance-guide-east-material", "#3E6B5E");

  const northGuide = MeshBuilder.CreateGround(
    "entrance-guide-north",
    { width: 0.16, height: 3.6 },
    scene,
  );
  northGuide.position.set(-6, 0.03, 0.2);
  northGuide.material = makeEmissive(scene, "entrance-guide-north-material", "#3E6B5E");

  const entranceRunner = MeshBuilder.CreateGround(
    "entrance-runner",
    { width: 3.4, height: 7.2 },
    scene,
  );
  entranceRunner.position.set(-6.2, 0.025, -5.5);
  entranceRunner.material = rugMaterial;

  for (const prop of ENTRANCE_HALL_PROPS) {
    const width = prop.maxX - prop.minX;
    const depth = prop.maxZ - prop.minZ;
    const x = (prop.minX + prop.maxX) / 2;
    const z = (prop.minZ + prop.maxZ) / 2;

    if (prop.kind === "coat-rack") {
      const pole = MeshBuilder.CreateCylinder(
        `prop-${prop.id}-pole`,
        { height: prop.height, diameter: 0.08, tessellation: 10 },
        scene,
      );
      pole.position.set(x, prop.height / 2, z);
      pole.material = trimMaterial;

      const base = MeshBuilder.CreateCylinder(
        `prop-${prop.id}-base`,
        { height: 0.08, diameter: width, tessellation: 12 },
        scene,
      );
      base.position.set(x, 0.04, z);
      base.material = darkWood;

      for (let index = 0; index < 3; index += 1) {
        const hook = MeshBuilder.CreateSphere(
          `prop-${prop.id}-hook-${index}`,
          { diameter: 0.12, segments: 8 },
          scene,
        );
        hook.position.set(x + (index - 1) * 0.16, prop.height - 0.25, z);
        hook.material = trimMaterial;
      }

      continue;
    }

    const body = MeshBuilder.CreateBox(
      `prop-${prop.id}-body`,
      { width, height: prop.height, depth },
      scene,
    );
    body.position.set(x, prop.height / 2, z);
    body.material = darkWood;

    if (prop.kind === "console") {
      const drawer = MeshBuilder.CreateBox(
        `prop-${prop.id}-drawer`,
        { width: width * 0.8, height: 0.12, depth: depth * 0.8 },
        scene,
      );
      drawer.position.set(x, prop.height * 0.68, z);
      drawer.material = trimMaterial;
      continue;
    }

    const top = MeshBuilder.CreateBox(
      `prop-${prop.id}-top`,
      { width: width * 1.1, height: 0.1, depth: depth * 0.9 },
      scene,
    );
    top.position.set(x, prop.height + 0.05, z - depth * 0.08);
    top.rotation.x = -0.25;
    top.material = trimMaterial;
  }

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

  const entranceChain = MeshBuilder.CreateCylinder(
    "entrance-chandelier-chain",
    { height: 1.2, diameter: 0.04, tessellation: 8 },
    scene,
  );
  entranceChain.position.set(-7, 5.75, -5.5);
  entranceChain.material = trimMaterial;

  const entranceChandelier = MeshBuilder.CreateCylinder(
    "entrance-chandelier",
    { height: 0.14, diameter: 1.3, tessellation: 20 },
    scene,
  );
  entranceChandelier.position.set(-7, 5.05, -5.5);
  entranceChandelier.material = trimMaterial;

  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const bulb = MeshBuilder.CreateSphere(
      `entrance-chandelier-bulb-${index}`,
      { diameter: 0.16, segments: 8 },
      scene,
    );
    bulb.position.set(-7 + Math.cos(angle) * 0.55, 4.95, -5.5 + Math.sin(angle) * 0.55);
    bulb.material = candleMaterial;
  }

  for (const z of [-2.4, -5.8, -8.2, 0.6]) {
    const sconce = MeshBuilder.CreateBox(
      `entrance-sconce-${z}`,
      { width: 0.12, height: 0.42, depth: 0.28 },
      scene,
    );
    sconce.position.set(-9.66, 2.6, z);
    sconce.material = trimMaterial;

    const glow = MeshBuilder.CreateSphere(
      `entrance-sconce-glow-${z}`,
      { diameter: 0.14, segments: 8 },
      scene,
    );
    glow.position.set(-9.52, 2.6, z);
    glow.material = candleMaterial;
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

  const entranceLight = new PointLight("entrance-light", new Vector3(-7, 4.6, -5.5), scene);
  entranceLight.intensity = 9;
  entranceLight.range = 9;
  entranceLight.diffuse = Color3.FromHexString("#FFB35C");

  const boardLight = new PointLight("entrance-board-light", new Vector3(-9.2, 2.6, -4.7), scene);
  boardLight.intensity = 3;
  boardLight.range = 4;
  boardLight.diffuse = Color3.FromHexString("#7FD1B9");

  const panelLight = new PointLight("entrance-panel-light", new Vector3(-2.7, 2.6, -8.4), scene);
  panelLight.intensity = 3;
  panelLight.range = 4;
  panelLight.diffuse = Color3.FromHexString("#7FD1B9");

  const occluderPrefixes = [
    "wall-",
    "door-lintel-",
    "door-jamb-",
    "baseboard-",
    "front-door-",
    "prop-",
    "window-frame",
    "fireplace",
    "hearth",
    "mantel",
    "painting-frame",
    "painting-canvas",
    "table-",
    "chair-",
    "ceiling",
  ];

  for (const mesh of scene.meshes) {
    if (occluderPrefixes.some((prefix) => mesh.name.startsWith(prefix))) {
      const metadata = mesh.metadata as Record<string, unknown> | null;
      mesh.metadata = { ...(metadata ?? {}), occluder: true };
    }
  }
}

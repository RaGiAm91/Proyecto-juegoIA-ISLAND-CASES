import {
  applyMovement,
  CLUES,
  findNearbyClue,
  findNearbyHubInteractable,
  HUB_INTERACTABLES,
  INPUT_SEND_RATE,
  lerpAngle,
  LOCAL_CORRECTION_RATE,
  LOCAL_CORRECTION_THRESHOLD,
  MATCH_PHASES,
  MANSION_OBSTACLES,
  PLAYER_SPEED,
  REMOTE_INTERPOLATION_RATE,
  ROOM_BOUNDS,
  smoothingFactor,
} from "@island-cases/shared";
import type {
  ClueDefinition,
  HubInteractable,
  MatchStateView,
  MovementAxes,
  PlayerView,
} from "@island-cases/shared";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import "@babylonjs/core/Culling/ray";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Scene } from "@babylonjs/core/scene";

import {
  createCharacter,
  createTestCharacter,
  type CharacterView,
} from "../characters/CharacterView";
import { InputController } from "../input/InputController";
import type { NetworkClient } from "../net/NetworkClient";
import { buildTestRoom } from "../world/buildTestRoom";

export interface SceneStats {
  fps: number;
  players: number;
}

interface CharacterEntry {
  view: CharacterView;
  isLocal: boolean;
}

interface DebugSnapshot {
  local: {
    x: number;
    z: number;
    alive: boolean;
    spectating: boolean;
    spectatorTarget: string;
  } | null;
  authoritative: { x: number; z: number } | null;
  remote: Array<{ sessionId: string; x: number; z: number; alive: boolean }>;
  cameraTarget: { x: number; z: number } | null;
  cameraAlpha: number;
  cameraBeta: number;
  testCharacter: { x: number; z: number } | null;
}

type DebugWindow = Window & {
  __islandCasesDebug?: {
    getSnapshot: () => DebugSnapshot;
    moveFor: (axes: MovementAxes, durationMs: number) => Promise<void>;
    setTestCharacter: (x: number, z: number) => void;
    setCameraAlpha: (alpha: number) => void;
  };
};

export type InteractionFocus =
  { kind: "clue"; clue: ClueDefinition } | { kind: "hub"; interactable: HubInteractable };

type InteractionHandler = (focus: InteractionFocus | null) => void;
type HubCloseHandler = () => void;

const PALETTE = ["#5A1F26", "#1F3A2E", "#3B2A20", "#A8863F", "#6B4F3A", "#2E4057"];

function colorFor(sessionId: string): string {
  let hash = 0;

  for (const character of sessionId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return PALETTE[Math.abs(hash) % PALETTE.length] ?? "#A8863F";
}

function applyAlivePose(view: CharacterView, alive: boolean): void {
  view.root.scaling.y = alive ? 1 : 0.35;
  view.root.rotation.z = alive ? 0 : -Math.PI / 2;
}

export class MatchScene {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly input = new InputController(() => this.sendCurrentInput());
  private readonly characters = new Map<string, CharacterEntry>();
  private readonly clueMarkers: Array<{
    id: string;
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
  }> = [];
  private readonly hubMarkers: Array<{
    id: string;
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
  }> = [];
  private readonly onStats: (stats: SceneStats) => void;
  private readonly onInteraction: InteractionHandler;
  private readonly onHubClose: HubCloseHandler;
  private readonly resizeHandler = (): void => {
    this.engine.resize();
  };
  private readonly canvas: HTMLCanvasElement;
  private lastPointer: { x: number; y: number } | null = null;
  private readonly pointerMoveHandler = (event: PointerEvent): void => {
    if (this.disposed || event.buttons !== 0) {
      this.lastPointer = null;
      return;
    }

    if (this.lastPointer) {
      const deltaX = event.clientX - this.lastPointer.x;
      const deltaY = event.clientY - this.lastPointer.y;
      this.camera.inertialAlphaOffset -= deltaX * 0.002;
      this.camera.inertialBetaOffset -= deltaY * 0.002;
    }

    this.lastPointer = { x: event.clientX, y: event.clientY };
  };
  private readonly pointerLeaveHandler = (): void => {
    this.lastPointer = null;
  };

  private readonly debugApi = {
    getSnapshot: (): DebugSnapshot => this.getDebugSnapshot(),
    moveFor: (axes: MovementAxes, durationMs: number): Promise<void> =>
      this.moveFor(axes, durationMs),
    setTestCharacter: (x: number, z: number): void => this.moveTestCharacter(x, z),
    setCameraAlpha: (alpha: number): void => {
      this.camera.alpha = alpha;
      this.camera.inertialAlphaOffset = 0;
    },
  };

  private readonly testCharacter: CharacterView | null;
  private localSessionId: string | null = null;
  private localView: CharacterView | null = null;
  private interactionBlocked = false;
  private testCharacterElapsed = 0;
  private inputTimer: ReturnType<typeof setInterval> | null = null;
  private statsAccumulator = 0;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly network: NetworkClient,
    onStats: (stats: SceneStats) => void,
    onInteraction: InteractionHandler,
    onHubClose: HubCloseHandler,
  ) {
    this.onStats = onStats;
    this.onInteraction = onInteraction;
    this.onHubClose = onHubClose;
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, {
      antialias: true,
      stencil: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    this.engine.setHardwareScalingLevel(1);

    this.scene = new Scene(this.engine);
    this.scene.skipPointerMovePicking = true;
    buildTestRoom(this.scene);

    this.testCharacter = import.meta.env.DEV ? createTestCharacter(this.scene) : null;
    this.testCharacter?.root.position.set(-7.4, 0, -6.2);

    const markerMaterial = new StandardMaterial("clue-marker-material", this.scene);
    markerMaterial.emissiveColor = Color3.FromHexString("#A8863F");
    markerMaterial.disableLighting = true;

    for (const clue of CLUES) {
      const marker = MeshBuilder.CreateSphere(
        `clue-marker-${clue.id}`,
        { diameter: 0.16, segments: 8 },
        this.scene,
      );
      marker.position.set(clue.x, 1.1, clue.z);
      marker.material = markerMaterial;
      this.clueMarkers.push({ id: clue.id, mesh: marker });
    }

    const hubMarkerMaterial = new StandardMaterial("hub-marker-material", this.scene);
    hubMarkerMaterial.emissiveColor = Color3.FromHexString("#7FD1B9");
    hubMarkerMaterial.disableLighting = true;

    for (const interactable of HUB_INTERACTABLES) {
      const marker = MeshBuilder.CreateSphere(
        `hub-marker-${interactable.id}`,
        { diameter: 0.2, segments: 8 },
        this.scene,
      );
      marker.position.set(interactable.x, 1.35, interactable.z);
      marker.material = hubMarkerMaterial;
      this.hubMarkers.push({ id: interactable.id, mesh: marker });
    }

    this.camera = new ArcRotateCamera(
      "third-person-camera",
      -Math.PI / 2,
      1.08,
      6,
      new Vector3(0, 1.4, 0),
      this.scene,
    );
    this.camera.attachControl(canvas, true);
    canvas.addEventListener("pointermove", this.pointerMoveHandler);
    canvas.addEventListener("pointerleave", this.pointerLeaveHandler);
    this.camera.lowerRadiusLimit = 3.5;
    this.camera.upperRadiusLimit = 7.5;
    this.camera.lowerBetaLimit = 0.6;
    this.camera.upperBetaLimit = 1.25;
    this.camera.wheelPrecision = 40;
    this.camera.panningSensibility = 0;
    this.camera.inertia = 0.72;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 50;

    window.addEventListener("resize", this.resizeHandler);

    if (import.meta.env.DEV) {
      (window as DebugWindow).__islandCasesDebug = this.debugApi;
    }

    this.engine.runRenderLoop(() => this.render());

    this.inputTimer = setInterval(() => this.sendCurrentInput(), 1000 / INPUT_SEND_RATE);
  }

  private sendCurrentInput(): void {
    if (this.disposed || this.network.state?.phase !== MATCH_PHASES.PLAYING) {
      return;
    }

    const localState = this.localSessionId
      ? this.network.state?.players.get(this.localSessionId)
      : undefined;

    if (localState && !localState.alive) {
      return;
    }

    const yaw = this.localView?.root.rotation.y ?? 0;

    if (this.interactionBlocked) {
      this.network.sendInput({ moveX: 0, moveZ: 0, yaw });
      return;
    }

    const axes = this.getWorldAxes();
    this.network.sendInput({ ...axes, yaw });
  }

  private getWorldAxes(): MovementAxes {
    const axes = this.input.getAxes();

    if (axes.moveX === 0 && axes.moveZ === 0) {
      return axes;
    }

    const forward = this.camera.getForwardRay().direction;
    forward.y = 0;

    if (forward.lengthSquared() < 0.0001) {
      forward.set(0, 0, 1);
    } else {
      forward.normalize();
    }

    const right = Vector3.Cross(Vector3.Up(), forward).normalize();
    const desired = forward.scale(axes.moveZ).addInPlace(right.scale(axes.moveX));

    if (desired.lengthSquared() > 0.0001) {
      desired.normalize();
    }

    return { moveX: desired.x, moveZ: desired.z };
  }

  private async moveFor(axes: MovementAxes, durationMs: number): Promise<void> {
    if (
      this.disposed ||
      this.interactionBlocked ||
      this.network.state?.phase !== MATCH_PHASES.PLAYING
    ) {
      return;
    }

    const yaw = this.localView?.root.rotation.y ?? 0;
    this.network.sendInput({ ...axes, yaw });
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    this.network.sendInput({ moveX: 0, moveZ: 0, yaw });
  }

  addPlayer(sessionId: string, player: PlayerView, isLocal: boolean): void {
    if (this.characters.has(sessionId)) {
      return;
    }

    const view = createCharacter(
      this.scene,
      player.name,
      isLocal ? "#A8863F" : colorFor(sessionId),
      isLocal,
    );
    view.root.position.set(player.x, 0, player.z);

    this.characters.set(sessionId, { view, isLocal });

    if (isLocal) {
      this.localSessionId = sessionId;
      this.localView = view;
      this.camera.target.copyFrom(view.root.position);
      this.camera.target.y += 1.4;
    }
  }

  removePlayer(sessionId: string): void {
    const entry = this.characters.get(sessionId);

    if (!entry) {
      return;
    }

    entry.view.dispose();
    this.characters.delete(sessionId);

    if (this.localSessionId === sessionId) {
      this.localSessionId = null;
      this.localView = null;
    }
  }

  setInteractionBlocked(blocked: boolean): void {
    this.interactionBlocked = blocked;

    if (blocked) {
      this.input.consumeInteract();
      this.onInteraction(null);
    }
  }

  private moveTestCharacter(x: number, z: number): void {
    this.testCharacter?.root.position.set(x, 0, z);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.engine.stopRenderLoop();

    if (this.inputTimer) {
      clearInterval(this.inputTimer);
      this.inputTimer = null;
    }

    window.removeEventListener("resize", this.resizeHandler);
    this.canvas.removeEventListener("pointermove", this.pointerMoveHandler);
    this.canvas.removeEventListener("pointerleave", this.pointerLeaveHandler);
    this.input.dispose();

    if ((window as DebugWindow).__islandCasesDebug === this.debugApi) {
      delete (window as DebugWindow).__islandCasesDebug;
    }

    for (const entry of this.characters.values()) {
      entry.view.dispose();
    }

    this.characters.clear();
    this.scene.dispose();
    this.engine.dispose();
  }

  private render(): void {
    if (this.disposed) {
      return;
    }

    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.25);

    if (this.testCharacter) {
      this.testCharacterElapsed += dt;
      this.testCharacter.root.position.y = Math.sin(this.testCharacterElapsed * 2) * 0.025;
    }

    this.updateLocal(dt);
    this.syncRemotePlayers(dt);
    this.syncClueMarkers();
    this.scene.render();

    this.statsAccumulator += dt;

    if (this.statsAccumulator >= 0.5) {
      this.statsAccumulator = 0;
      this.onStats({
        fps: Math.round(this.engine.getFps()),
        players: this.characters.size,
      });
    }
  }

  private updateLocal(dt: number): void {
    const local = this.localView;

    if (!local) {
      return;
    }

    if (this.interactionBlocked) {
      this.input.consumeInteract();

      if (this.input.consumeCancel()) {
        this.onHubClose();
      }

      this.camera.target.copyFrom(local.root.position);
      this.camera.target.y += 1.4;
      return;
    }

    const authoritative = this.localSessionId
      ? this.network.state?.players.get(this.localSessionId)
      : undefined;
    const isDead = authoritative?.alive === false;

    applyAlivePose(local, !isDead);

    if (isDead) {
      this.input.consumeInteract();
      this.onInteraction(null);
      this.followSpectatorTarget(dt);
      return;
    }

    if (this.network.state?.phase !== MATCH_PHASES.PLAYING) {
      this.input.consumeInteract();
      this.onInteraction(null);
      this.camera.target.copyFrom(local.root.position);
      this.camera.target.y += 1.4;
      return;
    }

    const axes = this.getWorldAxes();

    if (axes.moveX !== 0 || axes.moveZ !== 0) {
      local.root.rotation.y = Math.atan2(axes.moveX, axes.moveZ);
      applyMovement(local.root.position, axes, PLAYER_SPEED, dt, ROOM_BOUNDS, MANSION_OBSTACLES);
    }

    if (authoritative) {
      const errorX = authoritative.x - local.root.position.x;
      const errorZ = authoritative.z - local.root.position.z;

      const thresholdSquared = LOCAL_CORRECTION_THRESHOLD * LOCAL_CORRECTION_THRESHOLD;

      if (errorX * errorX + errorZ * errorZ > thresholdSquared) {
        const correction = smoothingFactor(LOCAL_CORRECTION_RATE, dt);
        local.root.position.x += errorX * correction;
        local.root.position.z += errorZ * correction;
      }
    }

    this.camera.target.copyFrom(local.root.position);
    this.camera.target.y += 1.4;

    this.input.consumeCancel();

    const promptPosition = authoritative ?? local.root.position;
    const nearbyHub = findNearbyHubInteractable(promptPosition.x, promptPosition.z);
    const nearbyClue = nearbyHub ? null : findNearbyClue(promptPosition.x, promptPosition.z);
    const focus: InteractionFocus | null = nearbyHub
      ? { kind: "hub", interactable: nearbyHub }
      : nearbyClue
        ? { kind: "clue", clue: nearbyClue }
        : null;
    const shouldInteract = this.input.consumeInteract();
    this.onInteraction(focus);

    if (!shouldInteract) {
      return;
    }

    if (nearbyHub) {
      this.network.sendHubInteract(nearbyHub.id);
    } else if (nearbyClue) {
      this.network.sendInspect(nearbyClue.id);
    }
  }

  private followSpectatorTarget(dt: number): void {
    const state = this.network.state;
    const localState = this.localSessionId ? state?.players.get(this.localSessionId) : undefined;
    const targetId = localState?.spectatorTarget;
    const targetPlayer = targetId ? state?.players.get(targetId) : undefined;
    const targetView = targetId ? this.characters.get(targetId) : undefined;

    let destination: Vector3 | null = null;

    if (targetPlayer) {
      destination = new Vector3(targetPlayer.x, 1.4, targetPlayer.z);
    } else if (targetView) {
      destination = new Vector3(
        targetView.view.root.position.x,
        1.4,
        targetView.view.root.position.z,
      );
    } else if (this.localView) {
      destination = new Vector3(
        this.localView.root.position.x,
        1.4,
        this.localView.root.position.z,
      );
    }

    if (!destination) {
      return;
    }

    this.camera.target.copyFrom(
      Vector3.Lerp(this.camera.target, destination, smoothingFactor(REMOTE_INTERPOLATION_RATE, dt)),
    );
  }

  private syncClueMarkers(): void {
    const state = this.network.state;
    const localTeam = this.localSessionId
      ? state?.players.get(this.localSessionId)?.team
      : undefined;
    const discovered =
      localTeam === undefined ? [] : (state?.teams.get(String(localTeam))?.discoveredClues ?? []);

    for (const marker of this.clueMarkers) {
      marker.mesh.setEnabled(!discovered.includes(marker.id));
    }
  }

  private getDebugSnapshot(): DebugSnapshot {
    const remote: DebugSnapshot["remote"] = [];
    const state = this.network.state;

    for (const [sessionId, entry] of this.characters) {
      if (entry.isLocal) {
        continue;
      }

      remote.push({
        sessionId,
        x: entry.view.root.position.x,
        z: entry.view.root.position.z,
        alive: state?.players.get(sessionId)?.alive ?? true,
      });
    }

    const authoritative = this.localSessionId ? state?.players.get(this.localSessionId) : undefined;

    return {
      local: this.localView
        ? {
            x: this.localView.root.position.x,
            z: this.localView.root.position.z,
            alive: authoritative?.alive ?? true,
            spectating: authoritative?.spectating ?? false,
            spectatorTarget: authoritative?.spectatorTarget ?? "",
          }
        : null,
      authoritative: authoritative
        ? {
            x: authoritative.x,
            z: authoritative.z,
          }
        : null,
      remote,
      cameraTarget: {
        x: this.camera.target.x,
        z: this.camera.target.z,
      },
      cameraAlpha: this.camera.alpha,
      cameraBeta: this.camera.beta,
      testCharacter: this.testCharacter
        ? {
            x: this.testCharacter.root.position.x,
            z: this.testCharacter.root.position.z,
          }
        : null,
    };
  }

  private syncRemotePlayers(dt: number): void {
    const state: MatchStateView | null = this.network.state;

    if (!state) {
      return;
    }

    const smoothing = smoothingFactor(REMOTE_INTERPOLATION_RATE, dt);

    for (const [sessionId, entry] of this.characters) {
      if (entry.isLocal) {
        continue;
      }

      const player = state.players.get(sessionId);

      if (!player) {
        continue;
      }

      applyAlivePose(entry.view, player.alive);

      const target = new Vector3(player.x, 0, player.z);
      entry.view.root.position.copyFrom(Vector3.Lerp(entry.view.root.position, target, smoothing));
      entry.view.root.rotation.y = lerpAngle(
        entry.view.root.rotation.y,
        player.rotation,
        smoothing,
      );
    }
  }
}

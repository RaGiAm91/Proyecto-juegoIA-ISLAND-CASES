import {
  applyMovement,
  CLUES,
  findNearbyClue,
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
import type { ClueDefinition, MatchStateView, PlayerView } from "@island-cases/shared";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import "@babylonjs/core/Culling/ray";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Scene } from "@babylonjs/core/scene";

import { createCharacter, type CharacterView } from "../characters/CharacterView";
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
}

type DebugWindow = Window & {
  __islandCasesDebug?: { getSnapshot: () => DebugSnapshot };
};

type InteractionHandler = (clue: ClueDefinition | null) => void;

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
  private readonly input = new InputController();
  private readonly characters = new Map<string, CharacterEntry>();
  private readonly clueMarkers: Array<{
    id: string;
    mesh: ReturnType<typeof MeshBuilder.CreateSphere>;
  }> = [];
  private readonly onStats: (stats: SceneStats) => void;
  private readonly onInteraction: InteractionHandler;
  private readonly resizeHandler = (): void => {
    this.engine.resize();
  };

  private readonly debugApi = {
    getSnapshot: (): DebugSnapshot => this.getDebugSnapshot(),
  };

  private localSessionId: string | null = null;
  private localView: CharacterView | null = null;
  private inputTimer: ReturnType<typeof setInterval> | null = null;
  private statsAccumulator = 0;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly network: NetworkClient,
    onStats: (stats: SceneStats) => void,
    onInteraction: InteractionHandler,
  ) {
    this.onStats = onStats;
    this.onInteraction = onInteraction;
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

    this.camera = new ArcRotateCamera(
      "third-person-camera",
      -Math.PI / 2,
      1.08,
      6,
      new Vector3(0, 1.4, 0),
      this.scene,
    );
    this.camera.attachControl(canvas, true);
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

    this.inputTimer = setInterval(() => {
      if (this.disposed || this.network.state?.phase !== MATCH_PHASES.PLAYING) {
        return;
      }

      const localState = this.localSessionId
        ? this.network.state?.players.get(this.localSessionId)
        : undefined;

      if (localState && !localState.alive) {
        return;
      }

      const axes = this.input.getAxes();
      this.network.sendInput({
        ...axes,
        yaw: this.localView?.root.rotation.y ?? 0,
      });
    }, 1000 / INPUT_SEND_RATE);
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

    const axes = this.input.getAxes();
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
      local.root.rotation.y = Math.atan2(desired.x, desired.z);
      applyMovement(
        local.root.position,
        { moveX: desired.x, moveZ: desired.z },
        PLAYER_SPEED,
        dt,
        ROOM_BOUNDS,
        MANSION_OBSTACLES,
      );
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

    const promptPosition = authoritative ?? local.root.position;
    const nearbyClue = findNearbyClue(promptPosition.x, promptPosition.z);
    const shouldInteract = this.input.consumeInteract();
    this.onInteraction(nearbyClue);

    if (nearbyClue && shouldInteract) {
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

import {
  applyMovement,
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
import type { MatchStateView, PlayerView } from "@island-cases/shared";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import "@babylonjs/core/Culling/ray";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
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
  local: { x: number; z: number } | null;
  remote: Array<{ sessionId: string; x: number; z: number }>;
}

type DebugWindow = Window & {
  __islandCasesDebug?: { getSnapshot: () => DebugSnapshot };
};

const PALETTE = ["#5A1F26", "#1F3A2E", "#3B2A20", "#A8863F", "#6B4F3A", "#2E4057"];

function colorFor(sessionId: string): string {
  let hash = 0;

  for (const character of sessionId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return PALETTE[Math.abs(hash) % PALETTE.length] ?? "#A8863F";
}

export class MatchScene {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly input = new InputController();
  private readonly characters = new Map<string, CharacterEntry>();
  private readonly onStats: (stats: SceneStats) => void;
  private readonly resizeHandler = (): void => {
    this.engine.resize();
  };

  private readonly debugApi = {
    getSnapshot: (): DebugSnapshot => this.getDebugSnapshot(),
  };

  private localSessionId: string | null = null;
  private localView: CharacterView | null = null;
  private sendAccumulator = 0;
  private statsAccumulator = 0;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly network: NetworkClient,
    onStats: (stats: SceneStats) => void,
  ) {
    this.onStats = onStats;
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

    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);

    this.updateLocal(dt);
    this.syncRemotePlayers(dt);
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

    if (this.network.state?.phase !== MATCH_PHASES.PLAYING) {
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

    const authoritative = this.localSessionId
      ? this.network.state?.players.get(this.localSessionId)
      : undefined;

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
    this.sendAccumulator += dt;

    if (this.sendAccumulator >= 1 / INPUT_SEND_RATE) {
      this.sendAccumulator %= 1 / INPUT_SEND_RATE;
      this.network.sendInput({
        moveX: axes.moveX,
        moveZ: axes.moveZ,
        yaw: local.root.rotation.y,
      });
    }
  }

  private getDebugSnapshot(): DebugSnapshot {
    const remote: DebugSnapshot["remote"] = [];

    for (const [sessionId, entry] of this.characters) {
      if (entry.isLocal) {
        continue;
      }

      remote.push({
        sessionId,
        x: entry.view.root.position.x,
        z: entry.view.root.position.z,
      });
    }

    return {
      local: this.localView
        ? {
            x: this.localView.root.position.x,
            z: this.localView.root.position.z,
          }
        : null,
      remote,
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

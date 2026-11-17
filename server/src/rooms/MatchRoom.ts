import {
  applyMovement,
  CLIENT_MESSAGES,
  DEFAULT_PLAYER_NAME,
  joinOptionsSchema,
  MATCH_PHASES,
  MANSION_OBSTACLES,
  MAX_PLAYERS,
  playerInputSchema,
  PLAYER_SPEED,
  ROOM_BOUNDS,
  TICK_RATE,
} from "@island-cases/shared";
import type { JoinOptions, PlayerInput } from "@island-cases/shared";
import { Room, type Client, type CloseCode, validate } from "colyseus";

import { MatchState, PlayerState } from "./schema/MatchState.js";

const SPAWN_POINTS = Array.from({ length: 20 }, (_, index) => ({
  x: -6 + (index % 5) * 3,
  z: -4 + Math.floor(index / 5) * 3,
}));

export class MatchRoom extends Room {
  override maxClients = MAX_PLAYERS;
  override state = new MatchState();

  private readonly lastInputs = new Map<string, PlayerInput>();
  private readonly lastSequences = new Map<string, number>();

  override messages = {
    [CLIENT_MESSAGES.PLAYER_INPUT]: validate(
      playerInputSchema,
      (client: Client, input: PlayerInput) => {
        const previousSequence = this.lastSequences.get(client.sessionId) ?? -1;

        if (input.seq <= previousSequence) {
          return;
        }

        this.lastSequences.set(client.sessionId, input.seq);
        this.lastInputs.set(client.sessionId, input);
      },
    ),
  };

  override onCreate(): void {
    this.setFixedTimestep((context) => this.step(context.dt), TICK_RATE);
  }

  override onJoin(client: Client, options: unknown): void {
    const parsed = joinOptionsSchema.safeParse(options);
    const name = parsed.success ? parsed.data.name : DEFAULT_PLAYER_NAME;
    const spawn = SPAWN_POINTS[this.state.players.size % SPAWN_POINTS.length] ?? SPAWN_POINTS[0];

    const player = new PlayerState();
    player.name = name;
    player.x = spawn?.x ?? 0;
    player.z = spawn?.z ?? 0;

    this.state.players.set(client.sessionId, player);
    this.state.phase = this.state.players.size > 1 ? MATCH_PHASES.PLAYING : MATCH_PHASES.WAITING;
    this.lastInputs.set(client.sessionId, { seq: 0, moveX: 0, moveZ: 0, yaw: 0 });
  }

  override onDrop(client: Client, _code: CloseCode): void {
    const player = this.state.players.get(client.sessionId);

    if (player) {
      player.connected = false;
    }

    this.allowReconnection(client, 30);
  }

  override onReconnect(client: Client): void {
    const player = this.state.players.get(client.sessionId);

    if (player) {
      player.connected = true;
    }
  }

  override onLeave(client: Client, _code: CloseCode): void {
    this.state.players.delete(client.sessionId);
    this.lastInputs.delete(client.sessionId);
    this.lastSequences.delete(client.sessionId);
    this.state.phase = this.state.players.size > 1 ? MATCH_PHASES.PLAYING : MATCH_PHASES.WAITING;
  }

  override onDispose(): void {
    this.lastInputs.clear();
    this.lastSequences.clear();
  }

  private step(dt: number): void {
    for (const [sessionId, player] of this.state.players) {
      if (!player.connected) {
        continue;
      }

      const input = this.lastInputs.get(sessionId);

      if (!input) {
        continue;
      }

      applyMovement(player, input, PLAYER_SPEED, dt, ROOM_BOUNDS, MANSION_OBSTACLES);
      player.rotation = input.yaw;
    }
  }
}

export type { JoinOptions };

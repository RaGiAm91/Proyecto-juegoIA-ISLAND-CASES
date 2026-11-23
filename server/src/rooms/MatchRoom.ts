import {
  applyMovement,
  assignTeam,
  canStartMatch,
  chooseSpectatorTarget,
  CLIENT_MESSAGES,
  CLUE_BY_ID,
  COUNTDOWN_SECONDS,
  DEFAULT_PLAYER_NAME,
  debugSetPositionSchema,
  GAME_EVENT_BY_CLUE,
  HUB_INTERACTABLE_BY_ID,
  hubInteractSchema,
  buildHubPanelPayload,
  inspectSchema,
  isClueInRange,
  isHubInteractableInRange,
  joinOptionsSchema,
  MATCH_PHASES,
  MANSION_OBSTACLES,
  MAX_PLAYERS,
  playerInputSchema,
  PLAYER_SPEED,
  readySchema,
  ROOM_BOUNDS,
  SERVER_MESSAGES,
  TICK_RATE,
} from "@island-cases/shared";
import type {
  DebugSetPositionPayload,
  HubInteractPayload,
  InspectPayload,
  JoinOptions,
  PlayerInput,
  ReadyPayload,
} from "@island-cases/shared";
import { Room, type Client, type CloseCode, validate } from "colyseus";

import { MatchState, PlayerState, TeamState } from "./schema/MatchState.js";

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
        const player = this.state.players.get(client.sessionId);

        if (this.state.phase !== MATCH_PHASES.PLAYING || !player?.connected || !player.alive) {
          return;
        }

        const previousSequence = this.lastSequences.get(client.sessionId) ?? -1;

        if (input.seq <= previousSequence) {
          return;
        }

        this.lastSequences.set(client.sessionId, input.seq);
        this.lastInputs.set(client.sessionId, input);
      },
    ),
    [CLIENT_MESSAGES.LOBBY_READY]: validate(
      readySchema,
      (client: Client, payload: ReadyPayload) => {
        const player = this.state.players.get(client.sessionId);

        if (!player) {
          return;
        }

        player.ready = payload.ready;
        this.updateLobby();
      },
    ),
    [CLIENT_MESSAGES.CLUE_INSPECT]: validate(
      inspectSchema,
      (client: Client, payload: InspectPayload) => {
        if (this.state.phase !== MATCH_PHASES.PLAYING) {
          return;
        }

        const player = this.state.players.get(client.sessionId);
        const clue = CLUE_BY_ID.get(payload.clueId);

        if (
          !player ||
          !player.connected ||
          !player.alive ||
          !clue ||
          !isClueInRange(clue, player.x, player.z)
        ) {
          return;
        }

        const team = this.state.teams.get(String(player.team));

        if (team && !team.discoveredClues.includes(payload.clueId)) {
          team.discoveredClues.push(payload.clueId);
        }

        this.triggerClueEvent(player, payload.clueId);
      },
    ),
    [CLIENT_MESSAGES.HUB_INTERACT]: validate(
      hubInteractSchema,
      (client: Client, payload: HubInteractPayload) => {
        if (this.state.phase !== MATCH_PHASES.PLAYING) {
          return;
        }

        const player = this.state.players.get(client.sessionId);
        const interactable = HUB_INTERACTABLE_BY_ID.get(payload.interactableId);

        if (
          !player ||
          !player.connected ||
          !player.alive ||
          !interactable ||
          !isHubInteractableInRange(interactable, player.x, player.z)
        ) {
          return;
        }

        const team = this.state.teams.get(String(player.team));
        const panel = buildHubPanelPayload(
          interactable,
          team?.discoveredClues ?? [],
          this.state.eventLog.length,
        );

        client.send(SERVER_MESSAGES.HUB_PANEL, panel);
      },
    ),
    [CLIENT_MESSAGES.DEBUG_SET_POSITION]: validate(
      debugSetPositionSchema,
      (client: Client, payload: DebugSetPositionPayload) => {
        if (process.env.NODE_ENV === "production") {
          return;
        }

        const player = this.state.players.get(client.sessionId);

        if (this.state.phase !== MATCH_PHASES.PLAYING || !player?.connected || !player.alive) {
          return;
        }

        player.x = payload.x;
        player.z = payload.z;
      },
    ),
  };

  override onCreate(): void {
    this.setFixedTimestep((context) => this.step(context.dt), TICK_RATE);
  }

  override onJoin(client: Client, options: unknown): void {
    const parsed = joinOptionsSchema.safeParse(options);
    const name = parsed.success ? parsed.data.name : DEFAULT_PLAYER_NAME;
    const index = this.state.players.size;
    const spawn = SPAWN_POINTS[index % SPAWN_POINTS.length] ?? SPAWN_POINTS[0];

    const player = new PlayerState();
    player.name = name;
    player.x = spawn?.x ?? 0;
    player.z = spawn?.z ?? 0;
    player.team = assignTeam(index);

    this.state.players.set(client.sessionId, player);
    this.ensureTeam(player.team);
    this.lastInputs.set(client.sessionId, { seq: 0, moveX: 0, moveZ: 0, yaw: 0 });
    this.updateLobby();
    this.updateSpectators();
  }

  override onDrop(client: Client, _code: CloseCode): void {
    const player = this.state.players.get(client.sessionId);

    if (player) {
      player.connected = false;
    }

    this.allowReconnection(client, 30);
    this.updateLobby();
    this.updateSpectators();
  }

  override onReconnect(client: Client): void {
    const player = this.state.players.get(client.sessionId);

    if (player) {
      player.connected = true;
    }

    this.updateLobby();
    this.updateSpectators();
  }

  override onLeave(client: Client, _code: CloseCode): void {
    this.state.players.delete(client.sessionId);
    this.lastInputs.delete(client.sessionId);
    this.lastSequences.delete(client.sessionId);
    this.resetLobby();
  }

  override onDispose(): void {
    this.lastInputs.clear();
    this.lastSequences.clear();
  }

  private ensureTeam(team: number): void {
    const key = String(team);

    if (!this.state.teams.has(key)) {
      this.state.teams.set(key, new TeamState());
    }
  }

  private resetLobby(): void {
    let index = 0;

    this.state.teams.clear();
    this.state.eventLog.clear();
    this.lastInputs.clear();
    this.lastSequences.clear();

    for (const [sessionId, player] of this.state.players) {
      player.team = assignTeam(index);
      player.ready = false;
      player.alive = true;
      player.spectating = false;
      player.spectatorTarget = "";
      player.deathCause = "";
      this.ensureTeam(player.team);
      this.lastInputs.set(sessionId, { seq: 0, moveX: 0, moveZ: 0, yaw: 0 });
      index += 1;
    }

    this.state.phase = MATCH_PHASES.WAITING;
    this.state.countdown = 0;
    this.updateSpectators();
  }

  private updateLobby(): void {
    if (this.state.phase === MATCH_PHASES.PLAYING) {
      return;
    }

    if (canStartMatch([...this.state.players.values()])) {
      if (this.state.phase !== MATCH_PHASES.COUNTDOWN) {
        this.state.phase = MATCH_PHASES.COUNTDOWN;
        this.state.countdown = COUNTDOWN_SECONDS;
      }

      return;
    }

    if (this.state.phase === MATCH_PHASES.COUNTDOWN) {
      this.state.phase = MATCH_PHASES.WAITING;
      this.state.countdown = 0;
    }
  }

  private updateSpectators(): void {
    for (const [sessionId, player] of this.state.players) {
      if (player.alive) {
        player.spectating = false;
        player.spectatorTarget = "";
        continue;
      }

      player.spectating = true;
      player.spectatorTarget = chooseSpectatorTarget(this.state.players, sessionId);
    }
  }

  private triggerClueEvent(player: PlayerState, clueId: string): void {
    const event = GAME_EVENT_BY_CLUE.get(clueId);

    if (!event || [...this.state.eventLog].includes(event.id)) {
      return;
    }

    this.state.eventLog.push(event.id);

    if (event.fatal && player.alive) {
      player.alive = false;
      player.deathCause = event.id;
      this.updateSpectators();
    }
  }

  private step(dt: number): void {
    if (this.state.phase === MATCH_PHASES.COUNTDOWN) {
      this.state.countdown = Math.max(0, this.state.countdown - dt);

      if (this.state.countdown === 0) {
        this.state.phase = MATCH_PHASES.PLAYING;
      }

      return;
    }

    if (this.state.phase !== MATCH_PHASES.PLAYING) {
      return;
    }

    for (const [sessionId, player] of this.state.players) {
      if (!player.connected || !player.alive) {
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

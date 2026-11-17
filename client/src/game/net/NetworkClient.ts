import { CLIENT_MESSAGES, DEFAULT_SERVER_PORT, ROOM_NAME } from "@island-cases/shared";
import type { MatchStateView, PlayerInput, PlayerView } from "@island-cases/shared";
import { Callbacks, Client, CloseCode, type Room } from "@colyseus/sdk";

export type ConnectionStatus =
  "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export interface NetworkEvents {
  onStatus: (status: ConnectionStatus, message?: string) => void;
  onPlayerAdd: (sessionId: string, player: PlayerView) => void;
  onPlayerRemove: (sessionId: string) => void;
  onPlayerCount: (count: number) => void;
}

function resolveServerUrl(): string {
  const configuredUrl = import.meta.env.VITE_SERVER_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  const host = window.location.hostname || "localhost";
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";

  return `${protocol}//${host}:${DEFAULT_SERVER_PORT}`;
}

export class NetworkClient {
  private room: Room | null = null;
  private sequence = 0;

  get sessionId(): string | null {
    return this.room?.sessionId ?? null;
  }

  get state(): MatchStateView | null {
    const state = this.room?.state as Partial<MatchStateView> | undefined;

    if (!state?.players) {
      return null;
    }

    return state as MatchStateView;
  }

  async connect(name: string, events: NetworkEvents): Promise<void> {
    events.onStatus("connecting");

    const client = new Client(resolveServerUrl());

    try {
      const room = await client.joinOrCreate(ROOM_NAME, { name });
      this.room = room;

      const callbacks = Callbacks.get(room);
      const syncPlayerCount = (): void => {
        events.onPlayerCount(this.state?.players?.size ?? 0);
      };

      callbacks.onAdd("players", (player: unknown, key: unknown) => {
        const sessionId = String(key);
        events.onPlayerAdd(sessionId, player as PlayerView);
        syncPlayerCount();
      });

      callbacks.onRemove("players", (_player: unknown, key: unknown) => {
        events.onPlayerRemove(String(key));
        syncPlayerCount();
      });

      room.onStateChange((state) => {
        const view = state as Partial<MatchStateView>;
        events.onPlayerCount(view.players?.size ?? 0);
      });

      room.onDrop(() => {
        events.onStatus("reconnecting");
      });

      room.onReconnect(() => {
        events.onStatus("connected");
      });

      room.onLeave((code) => {
        if (code === CloseCode.FAILED_TO_RECONNECT) {
          events.onStatus("disconnected", "No se pudo reconectar. Recarga la página.");
          return;
        }

        events.onStatus("disconnected");
      });

      events.onStatus("connected");
      events.onPlayerCount(this.state?.players.size ?? 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo conectar";
      events.onStatus("error", message);
      this.room = null;
      throw error;
    }
  }

  sendInput(input: Omit<PlayerInput, "seq">): void {
    if (!this.room) {
      return;
    }

    this.sequence += 1;
    this.room.send(CLIENT_MESSAGES.PLAYER_INPUT, { ...input, seq: this.sequence });
  }

  leave(): void {
    this.room?.leave();
    this.room = null;
  }
}

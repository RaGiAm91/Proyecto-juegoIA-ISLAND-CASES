import { useCallback, useEffect, useRef, useState } from "react";

import type { PlayerView } from "@island-cases/shared";

import styles from "./App.module.css";
import { NetworkClient, type ConnectionStatus } from "./game/net/NetworkClient";
import { MatchScene, type SceneStats } from "./game/scenes/MatchScene";

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: "EN ESPERA",
  connecting: "CONECTANDO",
  connected: "EN LÍNEA",
  reconnecting: "RECONECTANDO",
  disconnected: "DESCONECTADO",
  error: "ERROR",
};

export default function App(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<NetworkClient | null>(null);
  const sceneRef = useRef<MatchScene | null>(null);

  const [name, setName] = useState("Investigador");
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [playerCount, setPlayerCount] = useState(0);
  const [stats, setStats] = useState<SceneStats>({ fps: 0, players: 0 });

  useEffect(() => {
    return () => {
      sceneRef.current?.dispose();
      networkRef.current?.leave();
    };
  }, []);

  const handleJoin = useCallback(async (): Promise<void> => {
    const canvas = canvasRef.current;

    if (!canvas || connecting) {
      return;
    }

    setConnecting(true);
    setStatus("connecting");
    setStatusMessage("");

    const network = new NetworkClient();
    const scene = new MatchScene(canvas, network, setStats);
    networkRef.current = network;
    sceneRef.current = scene;

    try {
      await network.connect(name.trim() || "Investigador", {
        onStatus: (nextStatus, message) => {
          setStatus(nextStatus);
          setStatusMessage(message ?? "");
        },
        onPlayerAdd: (sessionId: string, player: PlayerView) => {
          scene.addPlayer(sessionId, player, sessionId === network.sessionId);
        },
        onPlayerRemove: (sessionId: string) => {
          scene.removePlayer(sessionId);
        },
        onPlayerCount: setPlayerCount,
      });
      setJoined(true);
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "No se pudo conectar.");
      scene.dispose();
      network.leave();
      sceneRef.current = null;
      networkRef.current = null;
    } finally {
      setConnecting(false);
    }
  }, [connecting, name]);

  const handleLeave = useCallback((): void => {
    sceneRef.current?.dispose();
    sceneRef.current = null;
    networkRef.current?.leave();
    networkRef.current = null;
    setJoined(false);
    setStatus("idle");
    setStatusMessage("");
    setPlayerCount(0);
    setStats({ fps: 0, players: 0 });
  }, []);

  return (
    <main className={styles.app}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.vignette} />

      {joined ? (
        <div className={styles.hud}>
          <header className={styles.topbar}>
            <div className={styles.brandBlock}>
              <p className={styles.eyebrow}>ARCHIVO INSULAR · 1954</p>
              <h1 className={styles.brand}>ISLAND CASES</h1>
            </div>
            <div className={styles.statusGroup} aria-live="polite">
              <span className={`${styles.statusDot} ${styles[status]}`} />
              <span className={styles.statusText}>{STATUS_LABELS[status]}</span>
              <button type="button" className={styles.leaveButton} onClick={handleLeave}>
                Salir
              </button>
            </div>
          </header>

          <aside className={styles.panel} data-testid="player-panel" data-players={stats.players}>
            <p className={styles.panelEyebrow}>INVESTIGADORES</p>
            <p className={styles.playerCount}>
              {playerCount.toString().padStart(2, "0")}
              <span> / 20</span>
            </p>
            <div className={styles.divider} />
            <p className={styles.panelLabel}>CONTROLES</p>
            <div className={styles.controlRow}>
              <kbd>W A S D</kbd>
              <span>Moverse</span>
            </div>
            <div className={styles.controlRow}>
              <kbd>RATÓN</kbd>
              <span>Mirar</span>
            </div>
            <div className={styles.controlRow}>
              <kbd>RUEDA</kbd>
              <span>Zoom</span>
            </div>
            <div className={styles.divider} />
            <p className={styles.panelLabel}>RENDIMIENTO</p>
            <div className={styles.statRow}>
              <span>FPS</span>
              <strong>{stats.fps}</strong>
            </div>
            <div className={styles.statRow}>
              <span>JUGADORES</span>
              <strong>{stats.players}</strong>
            </div>
          </aside>

          <footer className={styles.footer}>
            <span>Salón principal · Mansión Blackwood</span>
            <span>{statusMessage || "Explora la mansión. La investigación comienza pronto."}</span>
          </footer>
        </div>
      ) : (
        <section className={styles.startOverlay}>
          <div className={styles.card}>
            <p className={styles.eyebrow}>ARCHIVO INSULAR · EXPEDIENTE 001</p>
            <h1 className={styles.title}>
              ISLAND
              <br />
              <span>CASES</span>
            </h1>
            <p className={styles.subtitle}>
              Mansión Blackwood, 1954. Una isla cerrada. Un expediente incompleto.
            </p>

            <div className={styles.form}>
              <label className={styles.label} htmlFor="investigator-name">
                Nombre de investigador
              </label>
              <input
                id="investigator-name"
                className={styles.input}
                value={name}
                maxLength={20}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleJoin();
                  }
                }}
                disabled={connecting}
                autoFocus
              />
              <button
                type="button"
                className={styles.button}
                onClick={() => void handleJoin()}
                disabled={connecting}
              >
                {connecting ? "Conectando..." : "Entrar en la isla"}
              </button>
            </div>

            {status === "error" && (
              <p className={styles.error} role="alert">
                {statusMessage || "No se pudo conectar con el servidor."}
              </p>
            )}

            <p className={styles.hint}>
              {window.location.hostname}:2567 · WASD para mover · Arrastra para mirar · Rueda para
              zoom
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

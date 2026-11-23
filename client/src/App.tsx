import { useCallback, useEffect, useRef, useState } from "react";

import {
  CLUES,
  DEFAULT_PLAYER_NAME,
  GAME_EVENT_BY_ID,
  MATCH_PHASES,
  MAX_PLAYER_NAME_LENGTH,
  MAX_PLAYERS,
  MAX_TEAMS,
  type HubPanelPayload,
  type MatchStateView,
  type PlayerView,
} from "@island-cases/shared";

import styles from "./App.module.css";
import { NetworkClient, type ConnectionStatus } from "./game/net/NetworkClient";
import { MatchScene, type InteractionFocus, type SceneStats } from "./game/scenes/MatchScene";

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

  const [name, setName] = useState(DEFAULT_PLAYER_NAME);
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [playerCount, setPlayerCount] = useState(0);
  const [matchState, setMatchState] = useState<MatchStateView | null>(null);
  const [interactionFocus, setInteractionFocus] = useState<InteractionFocus | null>(null);
  const [hubPanel, setHubPanel] = useState<HubPanelPayload | null>(null);
  const [deathNoticeVisible, setDeathNoticeVisible] = useState(false);
  const [stats, setStats] = useState<SceneStats>({ fps: 0, players: 0 });

  useEffect(() => {
    return () => {
      sceneRef.current?.dispose();
      networkRef.current?.leave();
    };
  }, []);

  const handleCloseHubPanel = useCallback((): void => {
    setHubPanel(null);
    sceneRef.current?.setInteractionBlocked(false);
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
    const scene = new MatchScene(
      canvas,
      network,
      setStats,
      setInteractionFocus,
      handleCloseHubPanel,
    );
    networkRef.current = network;
    sceneRef.current = scene;

    try {
      await network.connect(name.trim() || DEFAULT_PLAYER_NAME, {
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
        onMatchState: setMatchState,
        onHubPanel: (panel) => {
          setHubPanel(panel);
          scene.setInteractionBlocked(true);
        },
      });
      setJoined(true);
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "No se pudo conectar.");
      scene.dispose();
      network.leave();
      sceneRef.current = null;
      networkRef.current = null;
      setMatchState(null);
      setInteractionFocus(null);
      setHubPanel(null);
    } finally {
      setConnecting(false);
    }
  }, [connecting, handleCloseHubPanel, name]);

  const handleLeave = useCallback((): void => {
    sceneRef.current?.dispose();
    sceneRef.current = null;
    networkRef.current?.leave();
    networkRef.current = null;
    setJoined(false);
    setStatus("idle");
    setStatusMessage("");
    setPlayerCount(0);
    setMatchState(null);
    setInteractionFocus(null);
    setHubPanel(null);
    setStats({ fps: 0, players: 0 });
  }, []);

  const phase = matchState?.phase ?? MATCH_PHASES.WAITING;
  const countdown = matchState?.countdown ?? 0;
  const localPlayer = matchState?.players.get(networkRef.current?.sessionId ?? "");
  const localReady = localPlayer?.ready ?? false;
  const teams = Array.from({ length: MAX_TEAMS }, (_, index) => ({
    index,
    members: [...(matchState?.players.values() ?? [])].filter((player) => player.team === index),
  })).filter((team) => team.members.length > 0);

  const localTeam = matchState?.players.get(networkRef.current?.sessionId ?? "")?.team;
  const discoveredClues =
    (localTeam === undefined
      ? undefined
      : matchState?.teams.get(String(localTeam))?.discoveredClues) ?? [];
  const lastEventId = matchState?.eventLog.at(-1);
  const lastEvent = lastEventId ? GAME_EVENT_BY_ID.get(lastEventId) : undefined;
  const spectatorTargetName = localPlayer?.spectatorTarget
    ? (matchState?.players.get(localPlayer.spectatorTarget)?.name ?? "")
    : "";
  const localAlive = localPlayer?.alive;

  useEffect(() => {
    if (localAlive !== false) {
      setDeathNoticeVisible(false);
      return;
    }

    setDeathNoticeVisible(true);
    const timer = setTimeout(() => setDeathNoticeVisible(false), 3600);
    return () => clearTimeout(timer);
  }, [localAlive]);

  return (
    <main className={styles.app}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.vignette} />

      {joined ? (
        <div className={styles.hud} data-testid="match-phase" data-phase={phase}>
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

          {phase !== MATCH_PHASES.PLAYING && (
            <section className={styles.lobby} data-testid="lobby" data-phase={phase}>
              <p className={styles.panelEyebrow}>SALA DE ESPERA</p>
              <p className={styles.lobbyPhase}>
                {phase === MATCH_PHASES.COUNTDOWN
                  ? `SALIDA EN ${Math.ceil(countdown)}`
                  : "ESPERANDO PAREJAS COMPLETAS"}
              </p>
              <div className={styles.teams}>
                {teams.map((team) => (
                  <div key={team.index} className={styles.teamRow}>
                    <span>EQUIPO {String(team.index + 1).padStart(2, "0")}</span>
                    <span>
                      {team.members
                        .map((member) => `${member.name}${member.ready ? " (listo)" : ""}`)
                        .join(" · ")}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={styles.readyButton}
                data-testid="ready-button"
                aria-pressed={localReady}
                onClick={() => networkRef.current?.sendReady(!localReady)}
              >
                {localReady ? "Cancelar listo" : "Listo"}
              </button>
            </section>
          )}

          {phase === MATCH_PHASES.PLAYING && (
            <section
              className={styles.dossier}
              data-testid="dossier"
              data-clues={discoveredClues.length}
            >
              <p className={styles.panelEyebrow}>EXPEDIENTE 001</p>
              <p className={styles.dossierTitle}>
                Pistas registradas {discoveredClues.length}/{CLUES.length}
              </p>
              <ul className={styles.clueList}>
                {CLUES.map((clue) => {
                  const found = discoveredClues.includes(clue.id);

                  return (
                    <li
                      key={clue.id}
                      className={found ? styles.clueFound : styles.clueMissing}
                      data-clue={clue.id}
                      data-found={found}
                    >
                      <strong>{found ? clue.title : "Pista sin registrar"}</strong>
                      {found && <span>{clue.detail}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {phase === MATCH_PHASES.PLAYING && lastEvent && (
            <section
              className={styles.eventLog}
              data-testid="event-log"
              data-event={lastEvent.id}
              aria-live="polite"
            >
              <p className={styles.panelEyebrow}>EVENTO REGISTRADO</p>
              <strong>{lastEvent.title}</strong>
              <span>{lastEvent.detail}</span>
            </section>
          )}

          {phase === MATCH_PHASES.PLAYING &&
            interactionFocus &&
            localPlayer?.alive !== false &&
            !hubPanel && (
              <div
                className={styles.interactionPrompt}
                data-testid={interactionFocus.kind === "hub" ? "hub-prompt" : "clue-prompt"}
              >
                <kbd>E</kbd>
                <span>
                  {interactionFocus.kind === "hub"
                    ? interactionFocus.interactable.prompt
                    : `Registrar pista: ${interactionFocus.clue.title}`}
                </span>
              </div>
            )}

          {hubPanel && (
            <section
              className={styles.hubPanel}
              data-testid="hub-panel"
              data-interactable={hubPanel.id}
              aria-label={hubPanel.title}
            >
              <div className={styles.hubPanelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>
                    {hubPanel.kind === "directory" ? "PUNTO DE INFORMACIÓN" : "REGISTRO DE CAMPO"}
                  </p>
                  <h2 className={styles.hubTitle}>{hubPanel.title}</h2>
                </div>
                <button
                  type="button"
                  className={styles.hubClose}
                  onClick={handleCloseHubPanel}
                  aria-label="Cerrar panel"
                >
                  ×
                </button>
              </div>
              <div className={styles.hubSummary}>
                <span>
                  PISTAS {hubPanel.cluesFound}/{hubPanel.cluesTotal}
                </span>
                <span>EVENTOS {hubPanel.events}</span>
              </div>
              <ul className={styles.hubDestinations}>
                {hubPanel.destinations.map((destination) => (
                  <li key={destination.zoneId}>
                    <strong>{destination.label}</strong>
                    <span>{destination.hint}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.hubHint}>
                Pulsa <kbd>Esc</kbd> para cerrar el panel.
              </p>
            </section>
          )}

          {phase === MATCH_PHASES.PLAYING &&
            localPlayer &&
            !localPlayer.alive &&
            deathNoticeVisible && (
              <div className={styles.deathOverlay} data-testid="death-overlay">
                <div className={styles.deathCard}>
                  <p className={styles.panelEyebrow}>INVESTIGADOR CAÍDO</p>
                  <h2 className={styles.deathTitle}>HAS MUERTO</h2>
                  <p className={styles.deathDetail}>
                    {lastEvent?.detail ?? "La mansión se ha cerrado para ti."}
                  </p>
                  <p className={styles.deathSpectator}>
                    {spectatorTargetName
                      ? `ESPECTANDO A ${spectatorTargetName}`
                      : "SIN OBJETIVO VISIBLE"}
                  </p>
                </div>
              </div>
            )}

          {phase === MATCH_PHASES.PLAYING && localPlayer && !localPlayer.alive && (
            <div
              className={styles.spectatorChip}
              data-testid="spectator-banner"
              data-alive={localPlayer.alive}
              data-target={localPlayer.spectatorTarget}
            >
              <span className={styles.spectatorDot} />
              {spectatorTargetName ? `ESPECTANDO A ${spectatorTargetName}` : "SIN OBJETIVO VISIBLE"}
            </div>
          )}

          <aside className={styles.panel} data-testid="player-panel" data-players={stats.players}>
            <p className={styles.panelEyebrow}>INVESTIGADORES</p>
            <p className={styles.playerCount}>
              {playerCount.toString().padStart(2, "0")}
              <span> / {MAX_PLAYERS}</span>
            </p>
            <div className={styles.divider} />
            <p className={styles.panelLabel}>CONTROLES</p>
            <div className={styles.controlRow}>
              <kbd>W A S D</kbd>
              <span>Moverse</span>
            </div>
            <div className={styles.controlRow}>
              <kbd>RATÓN</kbd>
              <span>Mover cámara al pasar</span>
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
            <span>
              {statusMessage ||
                (phase === MATCH_PHASES.PLAYING
                  ? "Explora la mansión. La investigación ha comenzado."
                  : "Forma pareja y pulsa listo para comenzar.")}
            </span>
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
                maxLength={MAX_PLAYER_NAME_LENGTH}
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

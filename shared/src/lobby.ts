import { MAX_TEAMS, TEAM_SIZE } from "./constants.js";

export interface LobbyPlayer {
  team: number;
  ready: boolean;
  connected: boolean;
}

export function assignTeam(index: number): number {
  return Math.floor(index / TEAM_SIZE) % MAX_TEAMS;
}

export function canStartMatch(players: readonly LobbyPlayer[]): boolean {
  if (players.length < TEAM_SIZE) {
    return false;
  }

  if (players.some((player) => !player.connected || !player.ready)) {
    return false;
  }

  const teams = new Set(players.map((player) => player.team));

  return [...teams].every(
    (team) => players.filter((player) => player.team === team).length === TEAM_SIZE,
  );
}

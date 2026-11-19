export interface SpectatorPlayer {
  team: number;
  alive: boolean;
  connected: boolean;
}

export function chooseSpectatorTarget(
  players: Iterable<readonly [string, SpectatorPlayer]>,
  sessionId: string,
): string {
  let spectator: SpectatorPlayer | undefined;
  const candidates: Array<readonly [string, SpectatorPlayer]> = [];

  for (const [candidateId, candidate] of players) {
    if (candidateId === sessionId) {
      spectator = candidate;
      continue;
    }

    if (candidate.alive && candidate.connected) {
      candidates.push([candidateId, candidate]);
    }
  }

  if (spectator) {
    const teammate = candidates.find(([, candidate]) => candidate.team === spectator.team);

    if (teammate) {
      return teammate[0];
    }
  }

  return candidates[0]?.[0] ?? "";
}

import { submitScore } from './leaderboardApi';

// Game IDs we track for the base clicker. submitScore() on the server
// already compares against the existing row and no-ops if not better,
// so we don't keep a local "last submitted" cache — a failed submit
// (e.g. DB schema mismatch) would poison that cache and we'd never retry.
// The server is the source of truth.
const STAT_IDS = ['base_pancakes', 'base_pps', 'base_click', 'base_achievements'] as const;
type StatKey = typeof STAT_IDS[number];

export function submitBaseGameScoresIfBetter(values: Record<StatKey, number>): void {
  const name = localStorage.getItem('pancake-player-name')?.trim();
  if (!name) return;
  for (const gameId of STAT_IDS) {
    const current = values[gameId];
    if (!Number.isFinite(current) || current <= 0) continue;
    submitScore(gameId, name, current).catch(err => {
      console.warn(`Base-game submit failed for ${gameId}:`, err);
    });
  }
}

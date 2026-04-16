import { submitScore } from './leaderboardApi';

// Persisted highs per stat — we only push to Supabase when the current value
// beats the stored high, so the write rate stays low even at 60fps.
const ENTRIES = [
  { gameId: 'base_pancakes', storageKey: 'pancake-peak-pancakes-high' },
  { gameId: 'base_pps',      storageKey: 'pancake-pps-high' },
  { gameId: 'base_click',    storageKey: 'pancake-click-power-high' },
] as const;

type StatKey = typeof ENTRIES[number]['gameId'];

export function submitBaseGameScoresIfBetter(values: Record<StatKey, number>): void {
  const name = localStorage.getItem('pancake-player-name')?.trim();
  if (!name) return;
  for (const { gameId, storageKey } of ENTRIES) {
    const current = values[gameId];
    if (!Number.isFinite(current) || current <= 0) continue;
    const stored = parseFloat(localStorage.getItem(storageKey) || '0');
    if (current > stored) {
      localStorage.setItem(storageKey, String(current));
      submitScore(gameId, name, current).catch(err => {
        console.warn(`Base-game submit failed for ${gameId}:`, err);
      });
    }
  }
}

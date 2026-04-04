import { submitScore } from './leaderboardApi';

export function autoSubmitScore(gameId: string, score: number): void {
  const name = localStorage.getItem('pancake-player-name')?.trim();
  if (!name) return;

  submitScore(gameId, name, score).catch(err => {
    console.warn('Auto-submit score failed:', err);
  });
}

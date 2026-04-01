import { supabase } from './supabaseClient';

export interface LeaderboardEntry {
  id: number;
  game_id: string;
  player_name: string;
  score: number;
  created_at: string;
}

// Game configs: whether lower score is better, and how to format
export const GAME_CONFIGS: Record<string, { lowerIsBetter: boolean; label: string; format: (s: number) => string }> = {
  split:   { lowerIsBetter: false, label: 'Split the Pancake', format: s => `${s}%` },
  edge:    { lowerIsBetter: true,  label: 'Edge Slicer',       format: s => `${s}%` },
  chopper: { lowerIsBetter: false, label: 'Pancake Chopper',   format: s => `${s} cuts` },
  stacker: { lowerIsBetter: false, label: 'Pancake Stacker',   format: s => `${s}` },
  flipper: { lowerIsBetter: false, label: 'Pancake Flipper',   format: s => `${s}` },
  catcher: { lowerIsBetter: false, label: 'Batter Catcher',    format: s => `${s}` },
  recipe:  { lowerIsBetter: false, label: 'Recipe Rush',       format: s => `${s}` },
};

export async function fetchLeaderboard(gameId: string, limit = 20): Promise<LeaderboardEntry[]> {
  const config = GAME_CONFIGS[gameId];
  const ascending = config?.lowerIsBetter ?? false;

  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('game_id', gameId)
    .order('score', { ascending })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Leaderboard fetch error:', error);
    return [];
  }
  return data ?? [];
}

export async function submitScore(gameId: string, playerName: string, score: number): Promise<boolean> {
  const { error } = await supabase
    .from('leaderboard')
    .insert({ game_id: gameId, player_name: playerName.trim().slice(0, 20), score });

  if (error) {
    console.error('Leaderboard submit error:', error);
    return false;
  }
  return true;
}

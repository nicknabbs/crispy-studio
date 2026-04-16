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
  split:   { lowerIsBetter: false, label: 'Split the Pancake',       format: s => `${s}%` },
  edge:    { lowerIsBetter: true,  label: 'Edge Slicer',             format: s => `${s}%` },
  chopper: { lowerIsBetter: false, label: 'Pancake Chopper',         format: s => `${s} cuts` },
  stacker: { lowerIsBetter: false, label: 'Pancake Stacker',         format: s => `${s}` },
  flipper: { lowerIsBetter: false, label: 'Pancake Flipper',         format: s => `${s}` },
  catcher: { lowerIsBetter: false, label: 'Batter Catcher',          format: s => `${s}` },
  recipe:  { lowerIsBetter: false, label: 'Recipe Rush',             format: s => `${s}` },
  syrup:   { lowerIsBetter: false, label: 'Syrup Drizzle',           format: s => `${s}%` },
  berry:   { lowerIsBetter: false, label: 'Blueberry Sort',          format: s => `${s}` },
  toss:    { lowerIsBetter: false, label: 'Pancake Toss & Catch',    format: s => `${s} catches` },
  pour:    { lowerIsBetter: false, label: 'Batter Pour Precision',   format: s => `${s}` },
  maze:    { lowerIsBetter: false, label: 'Pancake Maze Roll',       format: s => `${s}` },
  memory:  { lowerIsBetter: false, label: 'Short Stack Memory',      format: s => `${s} steps` },
  grid:    { lowerIsBetter: false, label: 'Griddle Grid Puzzle',     format: s => `${s}` },
  blast:   { lowerIsBetter: false, label: 'Pancake Blast',           format: s => `${s}` },
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

export async function fetchLeaderboardPage(
  gameId: string,
  page: number,
  pageSize = 20,
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  const config = GAME_CONFIGS[gameId];
  const ascending = config?.lowerIsBetter ?? false;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { count } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId);

  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('game_id', gameId)
    .order('score', { ascending })
    .order('created_at', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('Leaderboard page fetch error:', error);
    return { entries: [], total: 0 };
  }
  return { entries: data ?? [], total: count ?? 0 };
}

export async function submitScore(gameId: string, playerName: string, score: number): Promise<'ok' | 'not_better' | 'error'> {
  const trimmedName = playerName.trim().slice(0, 20);
  const config = GAME_CONFIGS[gameId];

  // Check for existing entry by this player for this game
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('id, score')
    .eq('game_id', gameId)
    .eq('player_name', trimmedName)
    .limit(1);

  if (existing && existing.length > 0) {
    const isBetter = config?.lowerIsBetter
      ? score < existing[0].score
      : score > existing[0].score;

    if (!isBetter) {
      return 'not_better';
    }

    const { error } = await supabase
      .from('leaderboard')
      .update({ score })
      .eq('id', existing[0].id);

    if (error) {
      console.error('Leaderboard update error:', error);
      return 'error';
    }
    return 'ok';
  }

  // Insert new entry
  const { error } = await supabase
    .from('leaderboard')
    .insert({ game_id: gameId, player_name: trimmedName, score });

  if (error) {
    console.error('Leaderboard submit error:', error);
    return 'error';
  }
  return 'ok';
}

export async function adminSetScore(gameId: string, playerName: string, score: number): Promise<'ok' | 'error'> {
  const trimmedName = playerName.trim().slice(0, 20);
  if (!trimmedName) return 'error';

  const { data: existing } = await supabase
    .from('leaderboard')
    .select('id')
    .eq('game_id', gameId)
    .eq('player_name', trimmedName)
    .limit(1);

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('leaderboard')
      .update({ score })
      .eq('id', existing[0].id);
    if (error) {
      console.error('Admin update error:', error);
      return 'error';
    }
    return 'ok';
  }

  const { error } = await supabase
    .from('leaderboard')
    .insert({ game_id: gameId, player_name: trimmedName, score });
  if (error) {
    console.error('Admin insert error:', error);
    return 'error';
  }
  return 'ok';
}

export async function deleteScore(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('leaderboard')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Leaderboard delete error:', error);
    return false;
  }
  return true;
}

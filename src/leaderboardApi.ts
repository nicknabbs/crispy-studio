import { supabase } from './supabaseClient';
import { formatNumber } from './gameData';

export interface LeaderboardEntry {
  id: number;
  game_id: string;
  player_name: string;
  player_id: string | null;
  score: number;
  created_at: string;
}

// Stable per-browser player id. Generated once and persisted, then sent up
// with every score submission so the server can follow a single player
// across name changes (no more duplicate leaderboard rows when "John"
// becomes "Jonathan"). Old entries that pre-date this id get linked to it
// automatically on the next score submission OR the next rename.
const PLAYER_ID_KEY = 'pancake-player-id';
export function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY);
    if (existing && existing.length > 0) return existing;
    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `p-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return '';
  }
}

// Game configs: whether lower score is better, and how to format
export const GAME_CONFIGS: Record<string, { lowerIsBetter: boolean; label: string; format: (s: number) => string }> = {
  // Base clicker game leaderboards first — these are the "main" game stats
  base_pancakes: { lowerIsBetter: false, label: '🥞 Most Pancakes Ever',  format: s => formatNumber(s) },
  base_pps:      { lowerIsBetter: false, label: '⚡ Pancakes per Second', format: s => `${formatNumber(s)}/s` },
  base_click:    { lowerIsBetter: false, label: '👆 Pancakes per Click',  format: s => formatNumber(s) },
  base_achievements: { lowerIsBetter: false, label: '🏆 Achievements Unlocked', format: s => Math.round(s).toLocaleString() },
  // Mini games
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
  shuffle: { lowerIsBetter: false, label: 'Pancake Toppings Shuffle', format: s => `${s}` },
  pop:     { lowerIsBetter: true,  label: 'Pancake Pop Reaction Test', format: s => `${(s/1000).toFixed(2)}s` },
  boss:    { lowerIsBetter: false, label: 'Pancake Boss',              format: s => `Level ${s}` },
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
  if (!trimmedName) return 'error';
  const lowerIsBetter = GAME_CONFIGS[gameId]?.lowerIsBetter ?? false;

  const { error } = await supabase.rpc('submit_score', {
    p_game_id: gameId,
    p_player_name: trimmedName,
    p_score: score,
    p_lower_is_better: lowerIsBetter,
    p_player_id: getPlayerId() || null,
  });

  if (error) {
    console.error('Leaderboard submit error:', error);
    return 'error';
  }
  return 'ok';
}

// When a player saves a new display name, rename their existing leaderboard
// entries to the new name in one server call (rather than orphaning the old
// rows). Returns the number of rows that were renamed.
export async function renameLeaderboardPlayer(oldName: string, newName: string): Promise<number> {
  const playerId = getPlayerId();
  if (!playerId) return 0;
  const trimmedNew = newName.trim().slice(0, 20);
  if (!trimmedNew) return 0;
  const trimmedOld = (oldName ?? '').trim().slice(0, 20);
  if (trimmedNew === trimmedOld) return 0;

  const { data, error } = await supabase.rpc('rename_leaderboard_player', {
    p_old_name: trimmedOld,
    p_new_name: trimmedNew,
    p_player_id: playerId,
  });

  if (error) {
    console.error('Leaderboard rename error:', error);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

export async function adminSetScore(gameId: string, playerName: string, score: number): Promise<'ok' | 'error'> {
  const trimmedName = playerName.trim().slice(0, 20);
  if (!trimmedName) return 'error';

  const { error } = await supabase
    .from('leaderboard')
    .upsert(
      { game_id: gameId, player_name: trimmedName, score },
      { onConflict: 'game_id,player_name' },
    );

  if (error) {
    console.error('Admin upsert error:', error);
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

import { supabase } from './supabaseClient';
import { getPlayerId } from './leaderboardApi';
import { bnNorm, type BigNum } from './bignum';

// Leaderboard for "Numbers Go Up". The score is a big-number (mantissa +
// exponent), stored as two columns so ranking is a plain
// ORDER BY exponent DESC, mantissa DESC. Net-new table — see
// supabase/migrations/20260530000000_ngu_leaderboard.sql. All reads/writes
// degrade gracefully (return [] / swallow) if the migration hasn't been
// applied yet, so the rest of the mini-game works regardless.

export interface NguLeaderboardEntry {
  player_id: string;
  player_name: string;
  mantissa: number;
  exponent: number;
  best: BigNum;
}

export async function submitNguScore(playerName: string, best: BigNum): Promise<'ok' | 'error'> {
  const name = playerName.trim().slice(0, 20);
  if (!name) return 'error';
  const playerId = getPlayerId();
  if (!playerId) return 'error';
  const norm = bnNorm(best.m, best.e); // ensure 1 ≤ m < 10 for valid ranking
  const { error } = await supabase.rpc('submit_ngu_score', {
    p_player_id: playerId,
    p_player_name: name,
    p_mantissa: norm.m,
    p_exponent: norm.e,
  });
  if (error) {
    console.warn('NGU score submit failed:', error.message);
    return 'error';
  }
  return 'ok';
}

export async function fetchNguLeaderboard(limit = 20): Promise<NguLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('ngu_leaderboard')
    .select('player_id, player_name, mantissa, exponent')
    .order('exponent', { ascending: false })
    .order('mantissa', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('NGU leaderboard fetch failed:', error.message);
    return [];
  }
  return (data ?? []).map(r => ({
    player_id: r.player_id,
    player_name: r.player_name,
    mantissa: r.mantissa,
    exponent: r.exponent,
    best: bnNorm(r.mantissa, r.exponent),
  }));
}

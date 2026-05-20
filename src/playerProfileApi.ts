import { supabase } from './supabaseClient';
import type { PancakeSkin } from './skinEngine';

export interface PlayerProfile {
  player_id: string;
  player_name: string;
  favorite_skin: PancakeSkin | null;
  peak_pancakes: number;
  achievements: number;
  first_seen: string;
  days_played: number;
}

// Fetch the public profile + stats for any player by their browser-local
// player_id. Anyone can read; the RPC joins player_profiles with the
// leaderboard to derive stats. Returns null if the player is completely
// unknown (no leaderboard entries, no profile row).
export async function fetchPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  if (!playerId) return null;
  const { data, error } = await supabase.rpc('get_player_profile', { p_player_id: playerId });
  if (error) throw new Error(error.message);
  const rows = (data as PlayerProfile[] | null) ?? [];
  if (rows.length === 0) return null;
  const row = rows[0];
  // Heuristic for "completely unknown player": no name, no skin, zero stats,
  // first_seen ≈ now. Cleanest signal to show a friendly empty state.
  if (
    (row.player_name === 'Guest' || !row.player_name)
    && row.peak_pancakes === 0
    && row.achievements === 0
    && row.favorite_skin === null
  ) {
    return null;
  }
  return row;
}

// Save (or overwrite) the player's profile metadata. Called when their
// display name changes, when they swap skins, or after first display-name
// claim. The skin is sent as the full PancakeSkin JSON so the viewer can
// re-render it exactly as the owner sees it.
export async function upsertPlayerProfile(opts: {
  playerId: string;
  playerName: string;
  favoriteSkin: PancakeSkin | null;
}): Promise<void> {
  const { playerId, playerName, favoriteSkin } = opts;
  if (!playerId) return;
  const { error } = await supabase.rpc('upsert_player_profile', {
    p_player_id: playerId,
    p_player_name: playerName || 'Guest',
    p_favorite_skin: favoriteSkin ?? null,
  });
  if (error) throw new Error(error.message);
}

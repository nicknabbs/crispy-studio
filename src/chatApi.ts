import { supabase } from './supabaseClient';

export interface ChatMessage {
  id: number;
  player_id: string;
  player_name: string;
  is_owner: boolean;
  text: string;
  created_at: string;
  /**
   * Message variant. `user` (default) renders as a normal chat row.
   * `donation` and `event` are system messages — centered colored banners
   * with no player attribution + no reactions allowed.
   */
  kind: 'user' | 'donation' | 'event';
}

const RECENT_LIMIT = 100;

// Initial backfill — most recent messages, freshest last (so the UI can
// append directly and auto-scroll to the bottom without sorting).
export async function fetchRecentMessages(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, player_id, player_name, is_owner, text, created_at, kind')
    .order('id', { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw new Error(error.message);
  const rows = (data as ChatMessage[] | null) ?? [];
  return rows.reverse();
}

// Send via RPC. The RPC enforces validation, profanity, and rate-limit; its
// error message is already user-ready ("Please keep it appropriate...",
// "Slow down — one message every couple seconds.", etc.) so we just
// surface it.
export async function sendChatMessage(opts: {
  playerId: string;
  playerName: string;
  text: string;
}): Promise<number> {
  const { playerId, playerName, text } = opts;
  const { data, error } = await supabase.rpc('send_chat_message', {
    p_player_id: playerId,
    p_player_name: playerName,
    p_text: text,
  });
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : Number(data);
}

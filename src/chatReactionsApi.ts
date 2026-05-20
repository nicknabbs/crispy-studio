import { supabase } from './supabaseClient';

export const REACTION_EMOJIS = ['🥞', '👍', '👑', '😂', '💀'] as const;
export type ReactionEmoji = typeof REACTION_EMOJIS[number];

export interface ChatReactionRow {
  id: number;
  message_id: number;
  player_id: string;
  player_name: string;
  emoji: ReactionEmoji;
  created_at: string;
}

const RECENT_LIMIT = 1000;

// Fetch reactions for the recent chat backfill window. We don't try to
// scope it to specific message ids — the chat cache holds the last ~100
// messages, and 1000 reactions covers ~10 reactions/msg average.
export async function fetchRecentReactions(): Promise<ChatReactionRow[]> {
  const { data, error } = await supabase
    .from('chat_reactions')
    .select('id, message_id, player_id, player_name, emoji, created_at')
    .order('id', { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw new Error(error.message);
  return (data as ChatReactionRow[] | null) ?? [];
}

// Toggle a reaction. Returns true if the reaction is now ON (the player
// just added it) or false if it's now OFF (the player un-reacted).
export async function toggleChatReaction(opts: {
  messageId: number;
  playerId: string;
  playerName: string;
  emoji: ReactionEmoji;
}): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_chat_reaction', {
    p_message_id: opts.messageId,
    p_player_id: opts.playerId,
    p_player_name: opts.playerName,
    p_emoji: opts.emoji,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

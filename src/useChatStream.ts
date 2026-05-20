import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { fetchRecentMessages, type ChatMessage } from './chatApi';
import {
  fetchRecentReactions,
  type ChatReactionRow,
  type ReactionEmoji,
  REACTION_EMOJIS,
} from './chatReactionsApi';

// Module-level cache so opening/closing the chat drawer doesn't re-fetch
// the backfill every time, and so the OwnerPanel chat section + the
// player drawer stay in sync without duplicating subscriptions.
let cached: ChatMessage[] = [];
let initialized = false;
let initializing: Promise<void> | null = null;
const listeners = new Set<(msgs: ChatMessage[]) => void>();
let channelStarted = false;

// Per-message reaction map. Keyed by message_id then emoji. Each entry
// stores the set of player_ids that have reacted with that emoji, so we
// can both render the count AND know if the local player has reacted.
type EmojiPlayers = Map<ReactionEmoji, Set<string>>;
let reactionCache: Map<number, EmojiPlayers> = new Map();
const reactionListeners = new Set<(map: Map<number, EmojiPlayers>) => void>();
let reactionsInitialized = false;
let reactionsInitializing: Promise<void> | null = null;

function notify() {
  for (const cb of listeners) cb(cached);
}

function sortAndCap(arr: ChatMessage[]): ChatMessage[] {
  // Optimistic placeholders use large positive ids (Date.now * 1000) so they
  // naturally sort after real BIGSERIAL ids. created_at is the tiebreaker
  // for the brief window before reconcile swaps the optimistic id.
  const sorted = [...arr].sort((a, b) => {
    if (a.id !== b.id) return a.id - b.id;
    return a.created_at < b.created_at ? -1 : 1;
  });
  return sorted.length > 200 ? sorted.slice(sorted.length - 200) : sorted;
}

function append(msg: ChatMessage) {
  if (cached.some(m => m.id === msg.id)) return;
  cached = sortAndCap([...cached, msg]);
  notify();
}

function notifyReactions() {
  // Pass a fresh Map reference so React's useState diff fires.
  for (const cb of reactionListeners) cb(new Map(reactionCache));
}

function applyReactionInsert(row: ChatReactionRow) {
  let perMsg = reactionCache.get(row.message_id);
  if (!perMsg) {
    perMsg = new Map();
    reactionCache.set(row.message_id, perMsg);
  }
  let players = perMsg.get(row.emoji);
  if (!players) {
    players = new Set();
    perMsg.set(row.emoji, players);
  }
  if (players.has(row.player_id)) return; // dedupe
  players.add(row.player_id);
  notifyReactions();
}

function applyReactionDelete(messageId: number, playerId: string, emoji: ReactionEmoji) {
  const perMsg = reactionCache.get(messageId);
  if (!perMsg) return;
  const players = perMsg.get(emoji);
  if (!players) return;
  if (!players.delete(playerId)) return;
  if (players.size === 0) perMsg.delete(emoji);
  if (perMsg.size === 0) reactionCache.delete(messageId);
  notifyReactions();
}

function ensureChannel() {
  if (channelStarted) return;
  channelStarted = true;
  const ch = supabase.channel('chat-stream');
  ch.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages' },
    (payload: { new: ChatMessage }) => {
      const m = payload.new;
      if (m && typeof m.id === 'number') append(m);
    },
  );
  ch.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_reactions' },
    (payload: { new: ChatReactionRow }) => {
      const r = payload.new;
      if (r && typeof r.id === 'number') applyReactionInsert(r);
    },
  );
  ch.on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'chat_reactions' },
    (payload: { old: Partial<ChatReactionRow> }) => {
      const o = payload.old;
      if (!o) return;
      if (typeof o.message_id !== 'number') return;
      if (typeof o.player_id !== 'string') return;
      if (!o.emoji || !REACTION_EMOJIS.includes(o.emoji as ReactionEmoji)) return;
      applyReactionDelete(o.message_id, o.player_id, o.emoji as ReactionEmoji);
    },
  );
  ch.subscribe();
}

async function ensureReactionsInit() {
  if (reactionsInitialized) return;
  if (reactionsInitializing) return reactionsInitializing;
  reactionsInitializing = (async () => {
    try {
      const rows = await fetchRecentReactions();
      for (const r of rows) applyReactionInsert(r);
      reactionsInitialized = true;
    } catch {
      reactionsInitialized = true;
    } finally {
      reactionsInitializing = null;
    }
  })();
  return reactionsInitializing;
}

async function ensureInit() {
  if (initialized) return;
  if (initializing) return initializing;
  initializing = (async () => {
    try {
      const rows = await fetchRecentMessages();
      cached = rows;
      initialized = true;
      notify();
    } catch {
      // Network error — leave cached empty; next mount can retry by
      // setting initialized=false (we don't, to avoid loops). UI shows the
      // empty state.
      initialized = true;
    } finally {
      initializing = null;
    }
  })();
  return initializing;
}

// Manually inject a just-sent message so the sender sees their own text
// instantly (no need to wait for the realtime round-trip).
export function pushLocalChatMessage(msg: ChatMessage) {
  append(msg);
}

// Reconcile an optimistic row with its real id once the RPC returns. If the
// real row already arrived via realtime (raced ahead), we drop the
// optimistic placeholder instead.
export function reconcileLocalChatId(oldId: number, newId: number) {
  if (oldId === newId) return;
  if (cached.some(m => m.id === newId)) {
    cached = cached.filter(m => m.id !== oldId);
  } else {
    cached = cached.map(m => (m.id === oldId ? { ...m, id: newId } : m));
  }
  cached = sortAndCap(cached);
  notify();
}

// Drop an optimistic placeholder after the send RPC rejects (profanity,
// rate limit, etc.) so the failed text doesn't stay in the visible list.
export function removeLocalChatMessage(id: number) {
  cached = cached.filter(m => m.id !== id);
  notify();
}

// Subscribe to the live chat stream. Returns the current cached list each
// time it changes.
export function useChatStream(): ChatMessage[] {
  const [msgs, setMsgs] = useState<ChatMessage[]>(cached);

  useEffect(() => {
    listeners.add(setMsgs);
    ensureChannel();
    void ensureInit();
    return () => {
      listeners.delete(setMsgs);
    };
  }, []);

  return msgs;
}

// Subscribe to the reactions map. Returns Map<message_id, Map<emoji, Set<player_id>>>.
export function useChatReactionsMap(): Map<number, EmojiPlayers> {
  const [m, setM] = useState<Map<number, EmojiPlayers>>(reactionCache);

  useEffect(() => {
    reactionListeners.add(setM);
    ensureChannel();
    void ensureReactionsInit();
    return () => {
      reactionListeners.delete(setM);
    };
  }, []);

  return m;
}

// Optimistic add/remove so reaction taps feel instant even before the
// postgres-changes echo arrives. De-duped — calling twice is a no-op.
export function applyLocalReactionToggle(opts: {
  messageId: number;
  playerId: string;
  emoji: ReactionEmoji;
  nowReacted: boolean; // true = add, false = remove
}) {
  if (opts.nowReacted) {
    applyReactionInsert({
      id: -Math.floor(Math.random() * 1e9),
      message_id: opts.messageId,
      player_id: opts.playerId,
      player_name: 'You',
      emoji: opts.emoji,
      created_at: new Date().toISOString(),
    });
  } else {
    applyReactionDelete(opts.messageId, opts.playerId, opts.emoji);
  }
}

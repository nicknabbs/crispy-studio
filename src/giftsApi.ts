import { supabase } from './supabaseClient';
import { ADMIN_PASSWORD, OWNER_PASSWORD, INFINITE_PANCAKES_PASSWORD } from './adminPasswords';

// All gift kinds. Keep in sync with the CHECK constraint on public.gifts and
// the kind list inside the send_gift() RPC.
export type GiftKind =
  | 'pancakes'
  | 'building'
  | 'building_upgrade'
  | 'click_upgrade'
  | 'maple_stars'
  | 'admin_password'
  | 'owner_password'
  | 'infinite_pancakes_password';

export type GiftPayload =
  | { kind: 'pancakes'; amount: number }
  | { kind: 'building'; buildingId: string; buildingName: string; amount: number }
  | { kind: 'building_upgrade'; upgradeId: string; upgradeName: string }
  | { kind: 'click_upgrade'; upgradeId: string; upgradeName: string }
  | { kind: 'maple_stars'; amount: number }
  | { kind: 'admin_password' }
  | { kind: 'owner_password' }
  | { kind: 'infinite_pancakes_password' };

export interface GiftableplayerRow {
  player_id: string;
  player_name: string;
  last_seen: string;
}

export interface ClaimedGift {
  id: number;
  sender_name: string;
  kind: GiftKind;
  payload: Record<string, unknown>;
  created_at: string;
}

// List every distinct player_id ever seen on the leaderboard, freshest first.
// Owner-only — server checks is_owner().
export async function listGiftablePlayers(): Promise<GiftableplayerRow[]> {
  const { data, error } = await supabase.rpc('list_giftable_players');
  if (error) throw new Error(error.message);
  const rows = (data as GiftableplayerRow[] | null) ?? [];
  return rows.filter(r => r.player_id && r.player_name);
}

// Public variant for player-to-player gifting. Queries the public-readable
// leaderboard table directly and dedupes by player_id on the client. No
// owner check.
export async function listAllPlayers(): Promise<GiftableplayerRow[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('player_id, player_name, created_at')
    .not('player_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2000); // safety cap — Pancake Stack scale is fine
  if (error) throw new Error(error.message);
  const rows = (data as Array<{ player_id: string; player_name: string; created_at: string }>) ?? [];
  // Dedupe by player_id, keep the freshest (player_name, created_at).
  const seen = new Map<string, GiftableplayerRow>();
  for (const r of rows) {
    if (!r.player_id || !r.player_name) continue;
    if (!seen.has(r.player_id)) {
      seen.set(r.player_id, { player_id: r.player_id, player_name: r.player_name, last_seen: r.created_at });
    }
  }
  return Array.from(seen.values());
}

// Owner sends a gift. Inserts the DB row AND fires a realtime ping on the
// shared `pancake-live` channel so the recipient applies it immediately if
// they're online. The ping carries only the recipient's player_id —
// receivers fetch the gift details from the DB via claim_gifts.
export async function sendGift(opts: {
  recipientPlayerId: string;
  recipientName: string;
  payload: GiftPayload;
}): Promise<number> {
  const { recipientPlayerId, recipientName, payload } = opts;
  // Strip the discriminator before sending — the row's `kind` column already
  // identifies the variant.
  const { kind, ...rest } = payload;
  const { data, error } = await supabase.rpc('send_gift', {
    p_recipient_player_id: recipientPlayerId,
    p_recipient_name: recipientName,
    p_kind: kind,
    p_payload: rest,
  });
  if (error) throw new Error(error.message);
  const giftId = typeof data === 'number' ? data : Number(data);

  try {
    await supabase.channel('pancake-live').send({
      type: 'broadcast',
      event: 'gift-ping',
      payload: { recipientPlayerId, giftId },
    });
  } catch {
    // Realtime ping is a best-effort delivery accelerator; the DB row is the
    // source of truth and claim_gifts will pick it up on next page load.
  }

  return giftId;
}

// Peer gift: any player gifts pancakes to any other player. Same `gifts`
// table + `claim_gifts` flow as owner gifts; the row's `peer: true` flag in
// the payload + non-null sender_name make `describeGift` render the casual
// recipient notification (no Owner tag, optional message line).
//
// Sender's pancake deduction is client-side — the RPC just records the gift
// and enforces rate limit + profanity. Caller is responsible for refunding
// the local pancake count if this throws.
export async function sendPeerGift(opts: {
  senderPlayerId: string;
  senderName: string;
  recipientPlayerId: string;
  recipientName: string;
  amount: number;
  message: string;
}): Promise<number> {
  const { senderPlayerId, senderName, recipientPlayerId, recipientName, amount, message } = opts;
  const { data, error } = await supabase.rpc('send_peer_gift', {
    p_sender_player_id: senderPlayerId,
    p_sender_name: senderName,
    p_recipient_player_id: recipientPlayerId,
    p_recipient_name: recipientName,
    p_amount: amount,
    p_message: message ?? '',
  });
  if (error) throw new Error(error.message);
  const giftId = typeof data === 'number' ? data : Number(data);

  try {
    await supabase.channel('pancake-live').send({
      type: 'broadcast',
      event: 'gift-ping',
      payload: { recipientPlayerId, giftId },
    });
  } catch {
    // Realtime ping is best-effort — DB row + claim_gifts is source of truth.
  }

  return giftId;
}

// Claim all unclaimed gifts for a player. Idempotent — returns rows on the
// first call, returns nothing on subsequent calls (the rows are marked
// claimed by the same UPDATE).
export async function claimGifts(playerId: string): Promise<ClaimedGift[]> {
  if (!playerId) return [];
  const { data, error } = await supabase.rpc('claim_gifts', { p_player_id: playerId });
  if (error) throw new Error(error.message);
  return (data as ClaimedGift[] | null) ?? [];
}

// Human-readable summary for the toast notification on the recipient's end.
export function describeGift(g: ClaimedGift): string {
  const p = g.payload as Record<string, unknown>;
  // Peer gifts (player-to-player) are flagged in the payload. They use a
  // casual sender tag and include an optional friendly message line.
  const isPeer = p.peer === true;
  const senderTag = isPeer
    ? `${g.sender_name || 'Someone'}`
    : `@${g.sender_name} (Creator of Pancake Stack)`;
  const peerMessage = isPeer && typeof p.message === 'string' && p.message.trim().length > 0
    ? `\n\n"${p.message}"`
    : '';
  switch (g.kind) {
    case 'pancakes':
      return `🎁 ${senderTag} gave you ${formatNum(p.amount)} pancakes!${peerMessage}`;
    case 'building': {
      const name = String(p.buildingName ?? 'buildings');
      return `🎁 ${senderTag} gave you ${formatNum(p.amount)} ${name}!`;
    }
    case 'building_upgrade':
      return `🎁 ${senderTag} unlocked the "${String(p.upgradeName ?? 'upgrade')}" upgrade for you!`;
    case 'click_upgrade':
      return `🎁 ${senderTag} unlocked the "${String(p.upgradeName ?? 'click upgrade')}" click upgrade for you!`;
    case 'maple_stars':
      return `🎁 ${senderTag} gave you ${formatNum(p.amount)} Maple Stars!`;
    case 'admin_password':
      return `🎁 ${senderTag} gave you the Admin Panel password!\nThe password is: ${ADMIN_PASSWORD}`;
    case 'owner_password':
      return `🎁 ${senderTag} gave you the Owner Panel password!\nThe password is: ${OWNER_PASSWORD}`;
    case 'infinite_pancakes_password':
      return `🎁 ${senderTag} gave you the Infinite Pancakes password!\nType it into the Admin Panel password box: ${INFINITE_PANCAKES_PASSWORD}`;
  }
}

function formatNum(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '∞';
  if (n >= 1e100) return '∞';
  return Math.floor(n).toLocaleString();
}

import { useEffect } from 'react';
import { supabase } from './supabaseClient';
import { claimGifts, type ClaimedGift } from './giftsApi';

// Module-level dispatch. Two reasons it lives outside React:
//
// 1. The claim_gifts RPC is destructive — the same UPDATE marks rows claimed
//    AND returns them. If the network reply lands after React has unmounted
//    the calling component (which happens twice on every dev strict-mode
//    mount), we still need to hand the gifts to whoever is mounted NOW, not
//    drop them on the floor.
// 2. Two simultaneous mounts of the same hook would otherwise race each
//    other to claim — claimingByPlayer locks per recipient to prevent that.
const claimingByPlayer = new Set<string>();
const seenGiftIds = new Set<number>();
const giftListeners = new Set<(g: ClaimedGift) => void>();
const pendingGifts: ClaimedGift[] = [];

function dispatchGift(g: ClaimedGift) {
  if (seenGiftIds.has(g.id)) return;
  seenGiftIds.add(g.id);
  if (giftListeners.size === 0) {
    pendingGifts.push(g);
    return;
  }
  for (const cb of giftListeners) cb(g);
}

async function performClaim(playerId: string) {
  if (claimingByPlayer.has(playerId)) return;
  claimingByPlayer.add(playerId);
  try {
    const gifts = await claimGifts(playerId);
    for (const g of gifts) dispatchGift(g);
  } catch {
    // Network/RLS error — silent. Next ping or page load retries.
  } finally {
    claimingByPlayer.delete(playerId);
  }
}

// Polls + subscribes for incoming gifts addressed to this browser's player_id.
// On mount: claim once. On live `gift-ping` for this player: claim again.
// Gifts flow back via the `onGift` callback (always the latest one passed in).
export function useGiftInbox(opts: {
  playerId: string;
  onGift: (g: ClaimedGift) => void;
}) {
  const { playerId, onGift } = opts;

  useEffect(() => {
    if (!playerId) return;

    giftListeners.add(onGift);
    // Drain anything that arrived during a dev strict-mode unmount gap.
    while (pendingGifts.length > 0) {
      const g = pendingGifts.shift();
      if (g) onGift(g);
    }

    void performClaim(playerId);

    const channel = supabase.channel('pancake-live');
    const handler = ({ payload }: { payload: unknown }) => {
      const p = payload as { recipientPlayerId?: unknown } | null;
      if (!p || typeof p.recipientPlayerId !== 'string') return;
      if (p.recipientPlayerId !== playerId) return;
      void performClaim(playerId);
    };
    channel.on('broadcast', { event: 'gift-ping' }, handler);
    channel.subscribe();

    return () => {
      giftListeners.delete(onGift);
    };
  }, [playerId, onGift]);
}

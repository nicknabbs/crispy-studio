import { useEffect, useRef } from 'react';
import { upsertPlayerProfile } from './playerProfileApi';
import type { PancakeSkin } from './skinEngine';

// Keeps the server-side player_profiles row in sync with the player's local
// skin + display name. Debounced — rapid edits in the Pancake Stylist
// shouldn't fire a write per keystroke. First sync after mount happens
// after the debounce window too, which is fine since the profile is
// public-readable and viewers fetch fresh on every click.
const DEBOUNCE_MS = 1500;

export function usePlayerProfileSync(opts: {
  playerId: string;
  playerName: string;
  skin: PancakeSkin | null;
}) {
  const { playerId, playerName, skin } = opts;
  const lastSnapshotRef = useRef<string>('');

  useEffect(() => {
    if (!playerId) return;
    // De-dupe: if neither skin nor name changed since the last successful
    // upsert, skip — avoids an extra RPC on every render that touches state.
    const snap = JSON.stringify({ playerName, skin });
    if (snap === lastSnapshotRef.current) return;

    const id = window.setTimeout(() => {
      void upsertPlayerProfile({
        playerId,
        playerName: playerName || 'Guest',
        favoriteSkin: skin,
      }).then(() => {
        lastSnapshotRef.current = snap;
      }).catch(() => {
        // Network/RLS error — silent. Next state change retries.
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(id);
  }, [playerId, playerName, skin]);
}

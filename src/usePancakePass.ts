import { useEffect, useRef, useState } from 'react';
import type { GameState } from './useGameState';
import { PANCAKE_PASS_TIERS, type PancakePassTier } from './pancakePass';

// Auto-claims Pancake Pass tiers as the player's peak pancakes grows. Tiers
// are sticky: once claimed, spending pancakes back down doesn't un-claim.
// Backfills retroactively on first run so existing players (or players who
// load a save with a high peak) get every tier below their peak in one
// shot rather than just the current one.
//
// Each newly-claimed tier is also pushed into a small queue the caller can
// pop from to drive celebration toasts.
export function usePancakePass(opts: {
  state: GameState;
  setDirectState: (partial: Partial<GameState>) => void;
}): {
  /** Tiers unlocked this session that haven't been celebrated yet. */
  newlyClaimed: PancakePassTier[];
  /** Pop the front of the celebration queue (called by the toast UI). */
  dismissCelebration: (key: string) => void;
} {
  const { state, setDirectState } = opts;
  const [newlyClaimed, setNewlyClaimed] = useState<PancakePassTier[]>([]);

  // Stable refs so the effect doesn't re-run on every render — we only care
  // about peakCookies changing.
  const stateRef = useRef(state);
  stateRef.current = state;
  const setDirectStateRef = useRef(setDirectState);
  setDirectStateRef.current = setDirectState;

  useEffect(() => {
    const cur = stateRef.current;
    const claimedNow = cur.pancakePassClaimed || {};
    const eligible = PANCAKE_PASS_TIERS.filter(
      t => cur.peakCookies >= t.threshold && !claimedNow[t.key],
    );
    if (eligible.length === 0) return;

    // Aggregate every newly-eligible tier's reward into a single state
    // update — much cheaper than calling setDirectState N times, and
    // matches how the existing OwnerPanel self-grant works.
    let cookiesDelta = 0;
    let mapleStarsDelta = 0;
    const buildingDeltas: Record<string, number> = {};
    const claimedDelta: Record<string, boolean> = {};
    for (const tier of eligible) {
      cookiesDelta += tier.reward.pancakes;
      if (tier.reward.mapleStars) mapleStarsDelta += tier.reward.mapleStars;
      if (tier.reward.buildings) {
        const { id, count } = tier.reward.buildings;
        buildingDeltas[id] = (buildingDeltas[id] ?? 0) + count;
      }
      claimedDelta[tier.key] = true;
    }

    const nextCookies = cur.cookies + cookiesDelta;
    setDirectStateRef.current({
      cookies: nextCookies,
      totalBaked: cur.totalBaked + cookiesDelta,
      lifetimeBaked: cur.lifetimeBaked + cookiesDelta,
      peakCookies: Math.max(cur.peakCookies, nextCookies),
      sugarStars: cur.sugarStars + mapleStarsDelta,
      buildingCounts: Object.keys(buildingDeltas).length > 0
        ? Object.fromEntries(
            Object.entries({
              ...cur.buildingCounts,
              ...Object.fromEntries(
                Object.entries(buildingDeltas).map(([id, n]) => [
                  id, (cur.buildingCounts[id] ?? 0) + n,
                ]),
              ),
            }),
          )
        : cur.buildingCounts,
      pancakePassClaimed: { ...claimedNow, ...claimedDelta },
    });

    setNewlyClaimed(prev => [...prev, ...eligible]);
  }, [state.peakCookies]);

  const dismissCelebration = (key: string) => {
    setNewlyClaimed(prev => prev.filter(t => t.key !== key));
  };

  return { newlyClaimed, dismissCelebration };
}

// "Numbers Go Up" — an idle/incremental mini-game. A number ticks up every
// second; reaching a threshold unlocks a higher per-second growth factor the
// player can buy. The number is also the player's leaderboard score, so
// buying a tier never spends it (DECISION default).
//
// Designed to extend forever: adding a tier is a config entry in TIERS, not
// new code. The base tier (index 0) adds +1/sec; every tier above multiplies
// the current value by its growthFactor each second.

import {
  type BigNum,
  BN_ZERO,
  bnAdd,
  bnFromNumber,
  bnGte,
  bnMul,
  bnMulByPow,
} from './bignum';

export interface NguTier {
  /** Stable index. 0 = base (+1/sec, always active, free). */
  id: number;
  /** Per-second growth: tier 0 ADDS this; tiers ≥1 MULTIPLY by it. */
  growthFactor: number;
  /** Value the running number must reach to unlock buying this tier.
   *  Ignored for tier 0. */
  threshold: BigNum;
  /** Short label, e.g. "×2". */
  label: string;
  /** Longer description for the buy button. */
  desc: string;
}

// Extend by appending entries — higher threshold, higher growth factor.
export const TIERS: NguTier[] = [
  { id: 0, growthFactor: 1, threshold: BN_ZERO, label: '+1', desc: 'Adds 1 every second' },
  { id: 1, growthFactor: 2, threshold: bnFromNumber(10), label: '×2', desc: 'Doubles every second' },
  { id: 2, growthFactor: 4, threshold: bnFromNumber(500), label: '×4', desc: 'Quadruples every second' },
  { id: 3, growthFactor: 8, threshold: bnFromNumber(1e6), label: '×8', desc: 'Octuples every second' },
  { id: 4, growthFactor: 16, threshold: bnFromNumber(1e12), label: '×16', desc: 'Sixteen-x every second' },
];

export function findTier(id: number): NguTier | undefined {
  return TIERS.find(t => t.id === id);
}

/** Highest tier whose threshold the value has reached (i.e. the best tier the
 *  player is allowed to buy). Tier 0 is always available. */
export function highestUnlockedTier(value: BigNum): NguTier {
  let best = TIERS[0];
  for (const t of TIERS) {
    if (t.id === 0) continue;
    if (bnGte(value, t.threshold)) best = t;
  }
  return best;
}

/** The next tier the player hasn't unlocked yet, or null if maxed. Used to
 *  show "reach X to unlock ×N". */
export function nextLockedTier(value: BigNum): NguTier | null {
  for (const t of TIERS) {
    if (t.id === 0) continue;
    if (!bnGte(value, t.threshold)) return t;
  }
  return null;
}

/** Apply ONE second of growth at the given active tier. */
export function growOneSecond(value: BigNum, activeTierId: number): BigNum {
  const tier = findTier(activeTierId) ?? TIERS[0];
  if (tier.id === 0) return bnAdd(value, bnFromNumber(1));
  return bnMul(value, bnFromNumber(tier.growthFactor));
}

/** Apply `seconds` of growth at the active tier in one shot — used for
 *  offline catch-up and for batching live ticks. Base tier adds `seconds`;
 *  multiplier tiers multiply by growthFactor^seconds (computed in log space
 *  so it never overflows). */
export function growBySeconds(value: BigNum, activeTierId: number, seconds: number): BigNum {
  if (seconds <= 0) return value;
  const tier = findTier(activeTierId) ?? TIERS[0];
  if (tier.id === 0) return bnAdd(value, bnFromNumber(seconds));
  return bnMulByPow(value, tier.growthFactor, seconds);
}

// Offline catch-up is capped so a phone left for a month doesn't produce a
// single absurd jump. Idle games are expected to accrue while away, but we
// keep a sane ceiling. Tunable.
export const MAX_OFFLINE_SECONDS = 24 * 3600; // 24h

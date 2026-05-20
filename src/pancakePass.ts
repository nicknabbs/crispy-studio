import { BUILDINGS, formatNumber } from './gameData';

// PANCAKE PASS — a progression "battle pass" tied to all-time peak pancakes.
// You don't spend pancakes to unlock tiers; just reaching the threshold ever
// counts. Spending back down doesn't lose claimed rewards. The tiers grow
// effectively forever using a [1, 2.5, 5] × 10^n cycle.

export interface PancakePassReward {
  pancakes: number;
  buildings?: { id: string; count: number };
  mapleStars?: number;
}

export interface PancakePassTier {
  /** 0-indexed tier number; tier 1 in the UI is idx 0. */
  index: number;
  /** Stable string key for storing claimed-state in the save. */
  key: string;
  /** Peak pancakes needed to unlock this tier. */
  threshold: number;
  /** What the player gets when this tier unlocks. */
  reward: PancakePassReward;
  /** Human-readable summary, e.g. "+500 pancakes + 1 Cook". */
  rewardLabel: string;
}

const TOTAL_TIERS = 160; // generously past 5e54 — effectively infinite for gameplay

function generateThresholds(): number[] {
  // Tier 1 is the welcome tier (0 cookies). User-spec tiers 2 and 3 are
  // hardcoded at 1K and 5K to match the requested onboarding curve, then
  // we shift into the [1, 2.5, 5] × 10^n cycle starting at n=4 (10K).
  const out: number[] = [0, 1e3, 5e3];
  const cycle = [1, 2.5, 5];
  for (let exp = 4; out.length < TOTAL_TIERS; exp++) {
    for (const mult of cycle) {
      if (out.length >= TOTAL_TIERS) break;
      out.push(mult * Math.pow(10, exp));
    }
  }
  return out;
}

const THRESHOLDS = generateThresholds();

/**
 * Reward formula. Goal: feel meaningful at every tier without making the
 * pass trivialize normal play.
 *
 * - Welcome tier: a tiny starter gift so the very first pop matters.
 * - Default reward: 50% of the threshold as bonus pancakes. Means the pass
 *   roughly halves the time to the next tier — generous, but the pass is a
 *   one-shot bonus per tier so it doesn't snowball indefinitely.
 * - Every 3rd tier also grants a small batch of buildings; the building
 *   chosen scales with tier so high-tier players don't get spam-Spatulas.
 * - Every 10th tier grants Maple Stars (prestige currency).
 */
function rewardForIdx(idx: number, threshold: number): PancakePassReward {
  if (idx === 0) {
    return { pancakes: 100 };
  }
  const reward: PancakePassReward = {
    pancakes: Math.max(50, Math.floor(threshold * 0.5)),
  };
  if (idx % 3 === 0) {
    // Scale the building tier with the player's tier. Stop at the last
    // building in the catalog so we don't go past the available list.
    const buildingIdx = Math.min(BUILDINGS.length - 1, Math.floor(idx / 3));
    const count = Math.max(1, Math.floor(idx / 5));
    reward.buildings = { id: BUILDINGS[buildingIdx].id, count };
  }
  if (idx % 10 === 0) {
    reward.mapleStars = Math.max(1, Math.floor(idx / 10));
  }
  return reward;
}

function labelForReward(reward: PancakePassReward): string {
  const parts: string[] = [];
  if (reward.pancakes > 0) parts.push(`${formatNumber(reward.pancakes)} pancakes`);
  if (reward.buildings) {
    const building = BUILDINGS.find(b => b.id === reward.buildings!.id);
    const name = building?.name ?? reward.buildings.id;
    parts.push(`${reward.buildings.count} ${name}`);
  }
  if (reward.mapleStars && reward.mapleStars > 0) {
    parts.push(`${reward.mapleStars} Maple Star${reward.mapleStars > 1 ? 's' : ''}`);
  }
  return parts.join(' + ');
}

function buildTiers(): PancakePassTier[] {
  return THRESHOLDS.map((threshold, idx) => {
    const reward = rewardForIdx(idx, threshold);
    return {
      index: idx,
      key: `tier-${idx}`,
      threshold,
      reward,
      rewardLabel: labelForReward(reward),
    };
  });
}

export const PANCAKE_PASS_TIERS: PancakePassTier[] = buildTiers();

/**
 * How far through the pass the player is right now. Returns the highest
 * tier index unlocked by peakCookies, plus the next tier (or null at cap).
 */
export function passProgress(peakCookies: number): {
  currentTier: PancakePassTier;
  nextTier: PancakePassTier | null;
  progressToNext: number; // 0..1
} {
  let currentIdx = 0;
  for (let i = PANCAKE_PASS_TIERS.length - 1; i >= 0; i--) {
    if (peakCookies >= PANCAKE_PASS_TIERS[i].threshold) {
      currentIdx = i;
      break;
    }
  }
  const current = PANCAKE_PASS_TIERS[currentIdx];
  const next = PANCAKE_PASS_TIERS[currentIdx + 1] ?? null;
  let progressToNext = 1;
  if (next) {
    const span = next.threshold - current.threshold;
    const within = Math.max(0, peakCookies - current.threshold);
    progressToNext = span > 0 ? Math.min(1, within / span) : 1;
  }
  return { currentTier: current, nextTier: next, progressToNext };
}

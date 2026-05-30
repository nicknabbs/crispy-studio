// Pancake Garden — an original real-time growing system for Pancake Stack.
// Distinct from Cookie Clicker's Garden by design: smaller 3×4 grid, plants
// give passive bonuses (CpS / click / butter speed) only while Mature
// (Cookie Clicker plants drop sugar lumps), hybrids are discovered by
// planting between mature parents in adjacent tiles, and mythic species
// re-seed themselves on decay. Don't port mechanics from CC directly.
//
// Plant lifecycle (4 stages): Seed → Sprout → Mature → Decayed
//
//   * Seed:    just planted. No effect.
//   * Sprout:  growing. No effect.
//   * Mature:  active passive bonus is live. Player can harvest.
//   * Decayed: missed the harvest window. Tile is dead, must be cleared.
//
// Each stage takes the species' `secondsPerStage`. After the Mature stage
// ends, the plant transitions to Decayed.

// Module-level mutable garden bonuses. The garden hook (which lives outside
// useGameState) updates this on every tick; useGameState's calcCps and
// getClickPower read from it. We use a mutable object so the read path
// doesn't have to re-render — it just multiplies the live values.
export interface GardenBonusesShape {
  cpsPercent: number;
  clickPercent: number;
  butterSpeedPercent: number;
}
export const currentGardenBonuses: GardenBonusesShape = {
  cpsPercent: 0,
  clickPercent: 0,
  butterSpeedPercent: 0,
};

export type GardenStage = 'empty' | 'seed' | 'sprout' | 'mature' | 'decayed';

export interface PlantSpecies {
  id: string;
  name: string;
  emoji: string;
  /** UI-only descriptor of how the player gets this species. */
  hint: string;
  tier: 1 | 2 | 3 | 4;
  /** Seconds per growth stage. Mature window = same duration as one stage. */
  secondsPerStage: number;
  /** Passive bonus active while at Mature stage. Stacks across tiles. */
  activeBonus?: {
    cpsPercent?: number;
    clickPercent?: number;
    butterSpeedPercent?: number;
  };
  /** Reward applied when the player harvests at the Mature stage. */
  harvestDrop?: {
    pancakesFlatBase?: number;          // a flat starter bump
    pancakesCpsMultiplier?: number;     // X seconds of current CpS
    mapleStars?: number;                // small chance of stars (set probability separately)
    mapleStarsChance?: number;
  };
  /** If present, this species can also be obtained by planting any seed in
   *  an empty tile that has BOTH `parents` species at Mature in adjacent
   *  tiles. The planted seed transforms into this hybrid. */
  hybridParents?: [string, string];
}

export const GARDEN_SPECIES: PlantSpecies[] = [
  // ----- Tier 1: starter species, available from the start ------------------
  {
    id: 'batter-sprout',
    name: 'Batter Sprout',
    emoji: '🌱',
    hint: 'Starter — always available.',
    tier: 1,
    secondsPerStage: 120, // 2 min × 4 stages = 8 min total lifecycle
    harvestDrop: { pancakesCpsMultiplier: 60 }, // 1 minute of CpS in a pop
  },
  {
    id: 'syrup-stem',
    name: 'Syrup Stem',
    emoji: '🍯',
    hint: 'Starter — always available.',
    tier: 1,
    secondsPerStage: 180, // 3 min × 4 = 12 min total
    activeBonus: { cpsPercent: 2 }, // small CpS bump while mature
    harvestDrop: { pancakesCpsMultiplier: 90 },
  },
  {
    id: 'butterbloom',
    name: 'Butterbloom',
    emoji: '🧈',
    hint: 'Starter — always available.',
    tier: 1,
    secondsPerStage: 120,
    activeBonus: { butterSpeedPercent: 3 },
    harvestDrop: { pancakesCpsMultiplier: 45 },
  },

  // ----- Tier 2: common hybrids ---------------------------------------------
  {
    id: 'flapjack-fern',
    name: 'Flapjack Fern',
    emoji: '🍃',
    hint: 'Hybrid: Batter Sprout × Batter Sprout (two mature Batter Sprouts adjacent).',
    tier: 2,
    secondsPerStage: 300, // 5 min × 4 = 20 min
    activeBonus: { cpsPercent: 5 },
    harvestDrop: { pancakesCpsMultiplier: 300 },
    hybridParents: ['batter-sprout', 'batter-sprout'],
  },
  {
    id: 'maple-vine',
    name: 'Maple Vine',
    emoji: '🍁',
    hint: 'Hybrid: Syrup Stem + Batter Sprout.',
    tier: 2,
    secondsPerStage: 300,
    activeBonus: { cpsPercent: 8 },
    harvestDrop: { pancakesCpsMultiplier: 240 },
    hybridParents: ['syrup-stem', 'batter-sprout'],
  },
  {
    id: 'pat-lily',
    name: 'Pat Lily',
    emoji: '🌼',
    hint: 'Hybrid: Butterbloom + Butterbloom (two mature Butterblooms adjacent).',
    tier: 2,
    secondsPerStage: 240,
    activeBonus: { butterSpeedPercent: 10 },
    harvestDrop: { pancakesCpsMultiplier: 180 },
    hybridParents: ['butterbloom', 'butterbloom'],
  },

  // ----- Tier 3: rare hybrids -----------------------------------------------
  {
    id: 'sticky-sapling',
    name: 'Sticky Sapling',
    emoji: '🌳',
    hint: 'Hybrid: Syrup Stem + Butterbloom.',
    tier: 3,
    secondsPerStage: 600, // 10 min × 4 = 40 min
    activeBonus: { clickPercent: 25 },
    harvestDrop: { pancakesCpsMultiplier: 900 },
    hybridParents: ['syrup-stem', 'butterbloom'],
  },
  {
    id: 'crispy-crown',
    name: 'Crispy Crown',
    emoji: '👑',
    hint: 'Hybrid: Flapjack Fern + Maple Vine.',
    tier: 3,
    secondsPerStage: 600,
    activeBonus: { cpsPercent: 15 },
    harvestDrop: { pancakesCpsMultiplier: 1800, mapleStars: 1, mapleStarsChance: 0.1 },
    hybridParents: ['flapjack-fern', 'maple-vine'],
  },

  // ----- Tier 4: mythic hybrids ---------------------------------------------
  {
    id: 'cosmic-crepe',
    name: 'Cosmic Crêpe',
    emoji: '✨',
    hint: 'Hybrid: Crispy Crown + Maple Vine.',
    tier: 4,
    secondsPerStage: 900, // 15 min × 4 = 1 hour
    activeBonus: { cpsPercent: 30, clickPercent: 30 },
    harvestDrop: { pancakesCpsMultiplier: 7200, mapleStars: 1, mapleStarsChance: 0.5 },
    hybridParents: ['crispy-crown', 'maple-vine'],
  },
  {
    id: 'eternal-stack',
    name: 'Eternal Stack',
    emoji: '♾️',
    hint: 'Hybrid: Cosmic Crêpe + Pat Lily.',
    tier: 4,
    secondsPerStage: 900,
    activeBonus: { cpsPercent: 50 },
    harvestDrop: { pancakesCpsMultiplier: 14400, mapleStars: 3, mapleStarsChance: 0.8 },
    hybridParents: ['cosmic-crepe', 'pat-lily'],
  },
  {
    id: 'honeycomb-whisper',
    name: 'Honeycomb Whisper',
    emoji: '🐝',
    hint: 'Hybrid: Eternal Stack + Sticky Sapling.',
    tier: 4,
    secondsPerStage: 1200, // 20 min × 4 = ~80 min
    activeBonus: { cpsPercent: 75, clickPercent: 50, butterSpeedPercent: 25 },
    harvestDrop: { pancakesCpsMultiplier: 36000, mapleStars: 5, mapleStarsChance: 1.0 },
    hybridParents: ['eternal-stack', 'sticky-sapling'],
  },
];

export const STARTER_SPECIES_IDS = ['batter-sprout', 'syrup-stem', 'butterbloom'] as const;

export const GARDEN_TILE_COUNT = 12;
export const GARDEN_COLUMNS = 4; // 3 rows × 4 cols

export function findSpecies(id: string): PlantSpecies | undefined {
  return GARDEN_SPECIES.find(s => s.id === id);
}

/** Canonical "time to fully mature", in seconds — the SINGLE source of
 *  truth shared by the growth logic and the UI countdown, so the displayed
 *  duration always equals the real one. This is the same value the plant
 *  picker has always displayed (secondsPerStage × 3), so existing plants'
 *  shown times don't change — but now a plant genuinely takes that long to
 *  mature instead of maturing early at the 2× mark. */
export function secondsToMature(species: PlantSpecies): number {
  return species.secondsPerStage * 3;
}

/** Given the time since planting, return the "natural" stage based on
 *  elapsed real time alone (the seed → sprout → mature transition). The
 *  separate decay rule is governed by harvestExpiresAt; see
 *  computeEffectiveStage below. Growth (seed/sprout → mature) is
 *  unconditional and timestamp-driven so it happens correctly while the
 *  player is offline.
 *
 *  Lifecycle: the run-up to maturity is split evenly into seed (first
 *  half) and sprout (second half); maturity lands exactly at
 *  secondsToMature(). The displayed countdown reads the same value, so
 *  "6 minutes to mature" really takes 6 minutes. */
export function computeStage(species: PlantSpecies, ageSeconds: number): GardenStage {
  const matureAt = secondsToMature(species);
  if (ageSeconds < matureAt / 2) return 'seed';
  if (ageSeconds < matureAt) return 'sprout';
  return 'mature';
}

/** The actual stage shown to the player, after applying the
 *  harvest-window rules. Decay can only happen while harvestExpiresAt is
 *  set and elapsed — so a plant that matured while the player was offline
 *  stays alive until they come back. */
export function computeEffectiveStage(
  species: PlantSpecies,
  ageSeconds: number,
  harvestExpiresAt: number | null | undefined,
  nowMs: number,
): GardenStage {
  const natural = computeStage(species, ageSeconds);
  if (natural === 'seed' || natural === 'sprout') return natural;
  // natural === 'mature': decay only if the window has been set AND passed.
  if (harvestExpiresAt != null && nowMs > harvestExpiresAt) return 'decayed';
  return 'mature';
}

/** Progress within the current growth stage, 0..1 (used for the progress
 *  bar). seed and sprout each span half of the run-up to maturity. */
export function stageProgress(species: PlantSpecies, ageSeconds: number): number {
  const half = secondsToMature(species) / 2;
  if (ageSeconds >= half * 2) return 1; // mature
  const within = ageSeconds % half;
  return Math.min(1, Math.max(0, within / half));
}

/** Seconds until the plant reaches the next growth stage (seed → sprout
 *  → mature). Returns 0 once at mature — the post-mature decay countdown
 *  is independent and driven by harvestExpiresAt, not by this. */
export function secondsToNextStage(species: PlantSpecies, ageSeconds: number): number {
  const matureAt = secondsToMature(species);
  const half = matureAt / 2;
  if (ageSeconds >= matureAt) return 0;
  const nextBoundary = ageSeconds < half ? half : matureAt;
  return Math.max(0, nextBoundary - ageSeconds);
}

/** Seconds remaining in the harvest window for a mature plant. Null if the
 *  window hasn't been set yet (the player hasn't been online to start the
 *  decay timer). */
export function secondsUntilDecay(
  harvestExpiresAt: number | null | undefined,
  nowMs: number,
): number | null {
  if (harvestExpiresAt == null) return null;
  return Math.max(0, (harvestExpiresAt - nowMs) / 1000);
}

/** Grid neighbors (4-adjacent, no diagonals) for hybrid checks. */
export function getNeighborIndexes(tileIndex: number): number[] {
  const row = Math.floor(tileIndex / GARDEN_COLUMNS);
  const col = tileIndex % GARDEN_COLUMNS;
  const neighbors: number[] = [];
  if (row > 0) neighbors.push((row - 1) * GARDEN_COLUMNS + col);
  if (row < Math.floor((GARDEN_TILE_COUNT - 1) / GARDEN_COLUMNS)) neighbors.push((row + 1) * GARDEN_COLUMNS + col);
  if (col > 0) neighbors.push(row * GARDEN_COLUMNS + (col - 1));
  if (col < GARDEN_COLUMNS - 1) neighbors.push(row * GARDEN_COLUMNS + (col + 1));
  return neighbors.filter(i => i >= 0 && i < GARDEN_TILE_COUNT);
}

/**
 * Given the species the player chose to plant and the neighborhood, return
 * the actual species that should grow. If neighbors include a mature pair
 * matching a hybrid recipe, the plant transforms into that hybrid.
 *
 * `neighborSpecies` is an array of currently-mature species IDs around the
 * target tile. We pick the highest-tier matching hybrid first so a player
 * who set up an elaborate cross gets the rarest plant rather than a stale
 * common one.
 */
export function resolvePlantedSpecies(opts: {
  attemptedSpeciesId: string;
  neighborMatureSpeciesIds: string[];
}): { resolvedSpeciesId: string; viaHybrid: boolean; hybridSpeciesId?: string } {
  const { attemptedSpeciesId, neighborMatureSpeciesIds } = opts;
  // Try hybrids from highest tier down.
  const hybrids = GARDEN_SPECIES
    .filter(s => s.hybridParents)
    .sort((a, b) => b.tier - a.tier);

  for (const hybrid of hybrids) {
    const [a, b] = hybrid.hybridParents!;
    const neighbors = [...neighborMatureSpeciesIds];
    // We need BOTH parents present in neighbors. If a===b (self-pair) we
    // need at least two instances. Use a tiny count-based check.
    const need = a === b ? { [a]: 2 } : { [a]: 1, [b]: 1 };
    const have: Record<string, number> = {};
    for (const n of neighbors) have[n] = (have[n] ?? 0) + 1;
    let ok = true;
    for (const [pid, count] of Object.entries(need)) {
      if ((have[pid] ?? 0) < count) { ok = false; break; }
    }
    if (ok) {
      return { resolvedSpeciesId: hybrid.id, viaHybrid: true, hybridSpeciesId: hybrid.id };
    }
  }

  return { resolvedSpeciesId: attemptedSpeciesId, viaHybrid: false };
}

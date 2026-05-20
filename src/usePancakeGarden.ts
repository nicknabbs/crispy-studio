import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, GardenState } from './useGameState';
import {
  GARDEN_SPECIES,
  computeStage,
  currentGardenBonuses,
  findSpecies,
  getNeighborIndexes,
  resolvePlantedSpecies,
  type GardenStage,
  type PlantSpecies,
} from './pancakeGarden';

export interface ResolvedTile {
  id: number;
  speciesId: string | null;
  plantedAt: number;
  species: PlantSpecies | null;
  stage: GardenStage;
  ageSeconds: number;
}

export interface GardenBonuses {
  cpsPercent: number;
  clickPercent: number;
  butterSpeedPercent: number;
}

export interface DiscoveryNotice {
  speciesId: string;
  speciesName: string;
  speciesEmoji: string;
  at: number;
}

interface UsePancakeGardenOpts {
  state: GameState;
  setDirectState: (partial: Partial<GameState>) => void;
  /** Pancakes per second (for harvest-drop calc). */
  cps: number;
  /** Pancake credit on harvest. */
  addCookies: (amount: number) => void;
}

interface UsePancakeGardenReturn {
  tiles: ResolvedTile[];
  bonuses: GardenBonuses;
  /** Plant a seed in the given empty tile. Returns the actual species
   *  planted (may be a hybrid). Discovery happens here too. */
  plant: (tileId: number, attemptedSpeciesId: string) => { speciesId: string; viaHybrid: boolean };
  /** Harvest a mature tile — applies drops and clears the tile. */
  harvest: (tileId: number) => void;
  /** Clear a decayed tile (or any tile) without harvesting. */
  clear: (tileId: number) => void;
  /** Latest queued discovery notice (or null). Caller pops it. */
  discoveryNotice: DiscoveryNotice | null;
  dismissDiscovery: () => void;
}

/**
 * Real-time garden hook. Tile stages are derived from `Date.now()`
 * relative to `plantedAt`, so we re-tick a render every second to keep
 * the UI fresh without storing stage in state (and risking drift).
 */
export function usePancakeGarden(opts: UsePancakeGardenOpts): UsePancakeGardenReturn {
  const { state, setDirectState, cps, addCookies } = opts;
  // `now` is captured in state and refreshed by an interval. We avoid
  // calling Date.now() during render itself, which the React lint rules
  // (correctly) flag as impure. Initial value uses the lazy-init form
  // of useState so it runs exactly once.
  const [now, setNow] = useState<number>(() => Date.now());
  const [discoveryNotice, setDiscoveryNotice] = useState<DiscoveryNotice | null>(null);

  // 1 Hz re-render so growth bars and stage transitions feel live.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const garden: GardenState = state.garden ?? { tiles: [], discovered: {} };

  const tiles: ResolvedTile[] = useMemo(() => {
    return garden.tiles.map(tile => {
      if (!tile.speciesId) {
        return { id: tile.id, speciesId: null, plantedAt: 0, species: null, stage: 'empty' as const, ageSeconds: 0 };
      }
      const species = findSpecies(tile.speciesId) ?? null;
      if (!species) {
        return { id: tile.id, speciesId: tile.speciesId, plantedAt: tile.plantedAt, species: null, stage: 'empty' as const, ageSeconds: 0 };
      }
      const ageSeconds = Math.max(0, (now - tile.plantedAt) / 1000);
      const stage = computeStage(species, ageSeconds);
      return { id: tile.id, speciesId: tile.speciesId, plantedAt: tile.plantedAt, species, stage, ageSeconds };
    });
  }, [garden.tiles, now]);

  // Passive bonuses: sum activeBonus across every tile currently at Mature stage.
  const bonuses: GardenBonuses = useMemo(() => {
    let cpsPercent = 0, clickPercent = 0, butterSpeedPercent = 0;
    for (const t of tiles) {
      if (t.stage !== 'mature' || !t.species?.activeBonus) continue;
      const b = t.species.activeBonus;
      if (b.cpsPercent) cpsPercent += b.cpsPercent;
      if (b.clickPercent) clickPercent += b.clickPercent;
      if (b.butterSpeedPercent) butterSpeedPercent += b.butterSpeedPercent;
    }
    return { cpsPercent, clickPercent, butterSpeedPercent };
  }, [tiles]);

  // Mirror to the module-level ref so useGameState's CpS/click math can
  // multiply by the current garden bonuses without prop-drilling.
  useEffect(() => {
    currentGardenBonuses.cpsPercent = bonuses.cpsPercent;
    currentGardenBonuses.clickPercent = bonuses.clickPercent;
    currentGardenBonuses.butterSpeedPercent = bonuses.butterSpeedPercent;
  }, [bonuses]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const plant = useCallback((tileId: number, attemptedSpeciesId: string) => {
    const cur = stateRef.current;
    const gardenCur = cur.garden ?? { tiles: [], discovered: {} };
    const target = gardenCur.tiles[tileId];
    if (!target || target.speciesId) {
      return { speciesId: attemptedSpeciesId, viaHybrid: false };
    }

    // Look at neighbor tiles — collect mature species IDs for hybrid resolve.
    const neighbors = getNeighborIndexes(tileId);
    const neighborMatureSpeciesIds: string[] = [];
    for (const ni of neighbors) {
      const nt = gardenCur.tiles[ni];
      if (!nt?.speciesId) continue;
      const species = findSpecies(nt.speciesId);
      if (!species) continue;
      const ageSeconds = Math.max(0, (Date.now() - nt.plantedAt) / 1000);
      if (computeStage(species, ageSeconds) === 'mature') {
        neighborMatureSpeciesIds.push(nt.speciesId);
      }
    }

    const resolved = resolvePlantedSpecies({ attemptedSpeciesId, neighborMatureSpeciesIds });

    const newTiles = gardenCur.tiles.map(t =>
      t.id === tileId
        ? { ...t, speciesId: resolved.resolvedSpeciesId, plantedAt: Date.now() }
        : t,
    );
    const newDiscovered = { ...gardenCur.discovered };
    let newlyDiscovered: PlantSpecies | null = null;
    if (resolved.viaHybrid && !newDiscovered[resolved.resolvedSpeciesId]) {
      newDiscovered[resolved.resolvedSpeciesId] = true;
      const sp = findSpecies(resolved.resolvedSpeciesId);
      if (sp) newlyDiscovered = sp;
    }

    setDirectState({
      garden: { tiles: newTiles, discovered: newDiscovered },
    });

    if (newlyDiscovered) {
      setDiscoveryNotice({
        speciesId: newlyDiscovered.id,
        speciesName: newlyDiscovered.name,
        speciesEmoji: newlyDiscovered.emoji,
        at: Date.now(),
      });
    }

    return { speciesId: resolved.resolvedSpeciesId, viaHybrid: resolved.viaHybrid };
  }, [setDirectState]);

  const harvest = useCallback((tileId: number) => {
    const cur = stateRef.current;
    const gardenCur = cur.garden ?? { tiles: [], discovered: {} };
    const tile = gardenCur.tiles[tileId];
    if (!tile?.speciesId) return;
    const species = findSpecies(tile.speciesId);
    if (!species) return;
    const ageSeconds = Math.max(0, (Date.now() - tile.plantedAt) / 1000);
    if (computeStage(species, ageSeconds) !== 'mature') return;

    // Apply drops
    const drop = species.harvestDrop;
    if (drop) {
      let pancakes = 0;
      if (drop.pancakesFlatBase) pancakes += drop.pancakesFlatBase;
      if (drop.pancakesCpsMultiplier) pancakes += cps * drop.pancakesCpsMultiplier;
      if (pancakes > 0) addCookies(pancakes);
      if (drop.mapleStars && drop.mapleStarsChance && Math.random() < drop.mapleStarsChance) {
        setDirectState({ sugarStars: cur.sugarStars + drop.mapleStars });
      }
    }

    // Clear the tile
    const newTiles = gardenCur.tiles.map(t =>
      t.id === tileId ? { ...t, speciesId: null, plantedAt: 0 } : t,
    );
    setDirectState({ garden: { ...gardenCur, tiles: newTiles } });
  }, [cps, addCookies, setDirectState]);

  const clear = useCallback((tileId: number) => {
    const cur = stateRef.current;
    const gardenCur = cur.garden ?? { tiles: [], discovered: {} };
    const newTiles = gardenCur.tiles.map(t =>
      t.id === tileId ? { ...t, speciesId: null, plantedAt: 0 } : t,
    );
    setDirectState({ garden: { ...gardenCur, tiles: newTiles } });
  }, [setDirectState]);

  const dismissDiscovery = useCallback(() => setDiscoveryNotice(null), []);

  return { tiles, bonuses, plant, harvest, clear, discoveryNotice, dismissDiscovery };
}

export const GARDEN_SPECIES_CATALOG = GARDEN_SPECIES;

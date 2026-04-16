import { useCallback, useEffect, useRef, useState } from 'react';
import { BUILDINGS, UPGRADES, CLICK_UPGRADES, PRESTIGE_UPGRADES, getBulkCost, getPrestigeUpgradeEffects } from './gameData';
import { ACHIEVEMENTS } from './achievements';

export interface GameState {
  cookies: number;
  totalBaked: number;
  totalClicks: number;
  buildingCounts: Record<string, number>;
  purchasedUpgrades: Record<string, boolean>;
  purchasedClickUpgrades: Record<string, boolean>;
  // Prestige
  sugarStars: number;
  lifetimeBaked: number;
  prestigeCount: number;
  purchasedPrestigeUpgrades: Record<string, boolean>;
  // Achievements & stats
  goldenCookiesCaught: number;
  unlockedAchievements: Record<string, boolean>;
  lastSaveTime: number;
  // Sticky max of cookies ever held — survives spending and prestige
  peakCookies: number;
}

const SAVE_KEY = 'pancake-stack-save';
const OLD_SAVE_KEY = 'cookie-crunch-save';
const SAVE_INTERVAL = 30000;
const OFFLINE_RATE = 0.1;
const MAX_OFFLINE_HOURS = 8;

// Prestige formula: stars = floor(cbrt(lifetimeBaked / 1e9))
// First star at 1B baked. 10 stars at 1T. 100 stars at 1Qa.
export function calcPotentialStars(lifetimeBaked: number): number {
  if (lifetimeBaked < 1e9) return 0;
  return Math.floor(Math.cbrt(lifetimeBaked / 1e9));
}

// Each sugar star = +1% CpS
export function getPrestigeMultiplier(sugarStars: number): number {
  return 1 + sugarStars * 0.01;
}

function defaultState(): GameState {
  return {
    cookies: 0,
    totalBaked: 0,
    totalClicks: 0,
    buildingCounts: {},
    purchasedUpgrades: {},
    purchasedClickUpgrades: {},
    sugarStars: 0,
    lifetimeBaked: 0,
    prestigeCount: 0,
    purchasedPrestigeUpgrades: {},
    goldenCookiesCaught: 0,
    unlockedAchievements: {},
    lastSaveTime: Date.now(),
    peakCookies: 0,
  };
}

function getBuildingMultiplier(buildingId: string, purchased: Record<string, boolean>): number {
  let mult = 1;
  for (const u of UPGRADES) {
    if (u.buildingId === buildingId && purchased[u.id]) {
      mult *= u.multiplier;
    }
  }
  return mult;
}

export function calcCps(state: GameState): number {
  let cps = 0;
  for (const b of BUILDINGS) {
    const count = state.buildingCounts[b.id] || 0;
    if (count === 0) continue;
    const mult = getBuildingMultiplier(b.id, state.purchasedUpgrades);
    cps += count * b.baseCps * mult;
  }
  // Apply prestige multiplier (Maple Stars)
  cps *= getPrestigeMultiplier(state.sugarStars);
  // Apply prestige upgrade CpS bonus
  const effects = getPrestigeUpgradeEffects(state.purchasedPrestigeUpgrades);
  if (effects.cpsPercent > 0) cps *= (1 + effects.cpsPercent / 100);
  return cps;
}

export function getClickPower(state: GameState, baseCps: number = 0): number {
  let power = 1;
  let cpsPercent = 0;
  for (const cu of CLICK_UPGRADES) {
    if (state.purchasedClickUpgrades[cu.id]) {
      power += cu.addClickPower;
      if (cu.addCpsPercent) cpsPercent += cu.addCpsPercent;
    }
  }
  if (baseCps > 0 && cpsPercent > 0) {
    power += baseCps * cpsPercent / 100;
  }
  // Apply prestige multiplier to clicks too
  power *= getPrestigeMultiplier(state.sugarStars);
  // Apply prestige upgrade click bonus
  const effects = getPrestigeUpgradeEffects(state.purchasedPrestigeUpgrades);
  if (effects.clickPercent > 0) power *= (1 + effects.clickPercent / 100);
  return Math.floor(power);
}

function loadState(): { state: GameState; offlineCookies: number } {
  try {
    // Migrate from old save key if needed
    let raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      const oldRaw = localStorage.getItem(OLD_SAVE_KEY);
      if (oldRaw) {
        raw = oldRaw;
        localStorage.removeItem(OLD_SAVE_KEY);
      }
    }
    if (!raw) return { state: defaultState(), offlineCookies: 0 };
    const saved: GameState = { ...defaultState(), ...JSON.parse(raw) };
    const elapsed = Math.min(
      (Date.now() - saved.lastSaveTime) / 1000,
      MAX_OFFLINE_HOURS * 3600
    );
    const cps = calcCps(saved);
    const offlineCookies = Math.floor(cps * elapsed * OFFLINE_RATE);
    saved.cookies += offlineCookies;
    saved.totalBaked += offlineCookies;
    saved.lifetimeBaked += offlineCookies;
    if (saved.cookies > saved.peakCookies) saved.peakCookies = saved.cookies;
    saved.lastSaveTime = Date.now();
    return { state: saved, offlineCookies };
  } catch {
    return { state: defaultState(), offlineCookies: 0 };
  }
}

function saveState(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, lastSaveTime: Date.now() }));
  } catch { /* quota exceeded */ }
}

export function useGameState() {
  const [initData] = useState(() => loadState());
  const [state, setState] = useState<GameState>(initData.state);
  const offlineCookies = initData.offlineCookies;
  const stateRef = useRef(state);
  stateRef.current = state;

  // Frenzy multiplier (temporary, not persisted)
  const [frenzyMult, setFrenzyMult] = useState(1);
  const [frenzyEnd, setFrenzyEnd] = useState(0);
  const frenzyMultRef = useRef(frenzyMult);
  frenzyMultRef.current = frenzyMult;
  const frenzyEndRef = useRef(0);

  // Admin overrides (not persisted)
  const [cpsOverride, setCpsOverride] = useState<number | null>(null);
  const [clickOverride, setClickOverride] = useState<number | null>(null);
  const cpsOverrideRef = useRef<number | null>(null);
  cpsOverrideRef.current = cpsOverride;

  const baseCps = calcCps(state);
  const cps = cpsOverride !== null ? cpsOverride : baseCps * frenzyMult;
  const clickPower = clickOverride !== null ? clickOverride : getClickPower(state, baseCps);

  // Prestige calculations
  const potentialStars = calcPotentialStars(state.lifetimeBaked);
  const newStarsOnPrestige = Math.max(0, potentialStars - state.sugarStars);
  const canPrestige = newStarsOnPrestige > 0;

  // Game loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Check frenzy expiry in game loop (enables combo stacking)
      if (frenzyEndRef.current > 0 && Date.now() >= frenzyEndRef.current) {
        setFrenzyMult(1);
        setFrenzyEnd(0);
        frenzyEndRef.current = 0;
        frenzyMultRef.current = 1;
      }

      setState(prev => {
        const earned = cpsOverrideRef.current !== null
          ? cpsOverrideRef.current * dt
          : calcCps(prev) * frenzyMultRef.current * dt;
        if (earned === 0) return prev;
        const nextCookies = prev.cookies + earned;
        return {
          ...prev,
          cookies: nextCookies,
          totalBaked: prev.totalBaked + earned,
          lifetimeBaked: prev.lifetimeBaked + earned,
          peakCookies: nextCookies > prev.peakCookies ? nextCookies : prev.peakCookies,
        };
      });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Auto-save
  useEffect(() => {
    const id = setInterval(() => saveState(stateRef.current), SAVE_INTERVAL);
    const handleUnload = () => saveState(stateRef.current);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  const clickCookie = useCallback(() => {
    setState(prev => {
      const power = clickOverride !== null ? clickOverride : getClickPower(prev, calcCps(prev));
      const nextCookies = prev.cookies + power;
      return {
        ...prev,
        cookies: nextCookies,
        totalBaked: prev.totalBaked + power,
        lifetimeBaked: prev.lifetimeBaked + power,
        totalClicks: prev.totalClicks + 1,
        peakCookies: nextCookies > prev.peakCookies ? nextCookies : prev.peakCookies,
      };
    });
  }, [clickOverride]);

  const buyBuilding = useCallback((buildingId: string, count: number = 1) => {
    setState(prev => {
      const building = BUILDINGS.find(b => b.id === buildingId);
      if (!building || count < 1) return prev;
      const owned = prev.buildingCounts[buildingId] || 0;
      const totalCost = getBulkCost(building, owned, count);
      if (prev.cookies < totalCost) return prev;
      return {
        ...prev,
        cookies: prev.cookies - totalCost,
        buildingCounts: {
          ...prev.buildingCounts,
          [buildingId]: owned + count,
        },
      };
    });
  }, []);

  const buyUpgrade = useCallback((upgradeId: string) => {
    setState(prev => {
      const upgrade = UPGRADES.find(u => u.id === upgradeId);
      if (!upgrade) return prev;
      if (prev.purchasedUpgrades[upgradeId]) return prev;
      if (prev.cookies < upgrade.cost) return prev;
      const owned = prev.buildingCounts[upgrade.buildingId] || 0;
      if (owned < upgrade.requiredOwned) return prev;
      return {
        ...prev,
        cookies: prev.cookies - upgrade.cost,
        purchasedUpgrades: { ...prev.purchasedUpgrades, [upgradeId]: true },
      };
    });
  }, []);

  const buyClickUpgrade = useCallback((upgradeId: string) => {
    setState(prev => {
      const upgrade = CLICK_UPGRADES.find(u => u.id === upgradeId);
      if (!upgrade) return prev;
      if (prev.purchasedClickUpgrades[upgradeId]) return prev;
      if (prev.cookies < upgrade.cost) return prev;
      if (upgrade.requiredTotalClicks && prev.totalClicks < upgrade.requiredTotalClicks) return prev;
      if (upgrade.requiredTotalBaked && prev.totalBaked < upgrade.requiredTotalBaked) return prev;
      return {
        ...prev,
        cookies: prev.cookies - upgrade.cost,
        purchasedClickUpgrades: { ...prev.purchasedClickUpgrades, [upgradeId]: true },
      };
    });
  }, []);

  const prestige = useCallback(() => {
    setState(prev => {
      const totalStars = calcPotentialStars(prev.lifetimeBaked);
      if (totalStars <= prev.sugarStars) return prev;
      const effects = getPrestigeUpgradeEffects(prev.purchasedPrestigeUpgrades);
      return {
        ...defaultState(),
        cookies: effects.startPancakes,
        totalBaked: effects.startPancakes,
        sugarStars: totalStars,
        lifetimeBaked: prev.lifetimeBaked,
        prestigeCount: prev.prestigeCount + 1,
        purchasedPrestigeUpgrades: prev.purchasedPrestigeUpgrades,
        goldenCookiesCaught: prev.goldenCookiesCaught,
        unlockedAchievements: prev.unlockedAchievements,
        peakCookies: prev.peakCookies,
        lastSaveTime: Date.now(),
      };
    });
  }, []);

  const activateFrenzy = useCallback((multiplier: number, durationSec: number) => {
    const now = Date.now();
    // If already in frenzy, stack: extend timer + boost multiplier
    const currentEnd = frenzyEndRef.current > now ? frenzyEndRef.current : now;
    const newEnd = currentEnd + durationSec * 1000;
    frenzyEndRef.current = newEnd;
    setFrenzyEnd(newEnd);

    setFrenzyMult(prev => {
      const newMult = prev > 1 ? prev + 3 : multiplier;
      frenzyMultRef.current = newMult;
      return newMult;
    });
  }, []);

  const addCookies = useCallback((amount: number) => {
    setState(prev => {
      const nextCookies = prev.cookies + amount;
      return {
        ...prev,
        cookies: nextCookies,
        totalBaked: prev.totalBaked + amount,
        lifetimeBaked: prev.lifetimeBaked + amount,
        peakCookies: nextCookies > prev.peakCookies ? nextCookies : prev.peakCookies,
      };
    });
  }, []);

  const incrementGoldenCaught = useCallback(() => {
    setState(prev => ({
      ...prev,
      goldenCookiesCaught: prev.goldenCookiesCaught + 1,
    }));
  }, []);

  // Check achievements periodically
  const [newAchievement, setNewAchievement] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setState(prev => {
        const newUnlocks: Record<string, boolean> = {};
        let changed = false;
        for (const a of ACHIEVEMENTS) {
          if (!prev.unlockedAchievements[a.id] && a.check(prev, calcCps(prev))) {
            newUnlocks[a.id] = true;
            changed = true;
            setNewAchievement(a.name);
          }
        }
        if (!changed) return prev;
        return {
          ...prev,
          unlockedAchievements: { ...prev.unlockedAchievements, ...newUnlocks },
        };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Prestige upgrade shop
  const buyPrestigeUpgrade = useCallback((upgradeId: string) => {
    setState(prev => {
      const upgrade = PRESTIGE_UPGRADES.find(u => u.id === upgradeId);
      if (!upgrade) return prev;
      if (prev.purchasedPrestigeUpgrades[upgradeId]) return prev;
      if (prev.sugarStars < upgrade.cost) return prev;
      if (upgrade.requires && !prev.purchasedPrestigeUpgrades[upgrade.requires]) return prev;
      return {
        ...prev,
        sugarStars: prev.sugarStars - upgrade.cost,
        purchasedPrestigeUpgrades: { ...prev.purchasedPrestigeUpgrades, [upgradeId]: true },
      };
    });
  }, []);

  const prestigeEffects = getPrestigeUpgradeEffects(state.purchasedPrestigeUpgrades);

  // --- Admin mutations ---

  const setDirectState = useCallback((partial: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const grantAllAchievements = useCallback(() => {
    setState(prev => {
      const all: Record<string, boolean> = {};
      for (const a of ACHIEVEMENTS) all[a.id] = true;
      return { ...prev, unlockedAchievements: all };
    });
  }, []);

  const resetSave = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setState(defaultState());
  }, []);

  const simulateTime = useCallback((seconds: number) => {
    setState(prev => {
      const earned = calcCps(prev) * frenzyMultRef.current * seconds;
      const nextCookies = prev.cookies + earned;
      return {
        ...prev,
        cookies: nextCookies,
        totalBaked: prev.totalBaked + earned,
        lifetimeBaked: prev.lifetimeBaked + earned,
        peakCookies: nextCookies > prev.peakCookies ? nextCookies : prev.peakCookies,
      };
    });
  }, []);

  return {
    state, cps, baseCps, clickPower, frenzyMult, frenzyEnd,
    potentialStars, newStarsOnPrestige, canPrestige,
    clickCookie, buyBuilding, buyUpgrade, buyClickUpgrade,
    prestige, activateFrenzy, addCookies, incrementGoldenCaught,
    buyPrestigeUpgrade, prestigeEffects,
    newAchievement, setNewAchievement, offlineCookies,
    setDirectState, grantAllAchievements, resetSave, simulateTime,
    cpsOverride, setCpsOverride, clickOverride, setClickOverride,
  };
}

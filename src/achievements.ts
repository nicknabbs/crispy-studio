import type { GameState } from './useGameState';
import { BUILDINGS, UPGRADES, CLICK_UPGRADES } from './gameData';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  hidden?: boolean;
  check: (state: GameState, cps?: number) => boolean;
}

// ── Helpers ──────────────────────────────────────────────────
function totalBuildings(s: GameState): number {
  let t = 0;
  for (const b of BUILDINGS) t += s.buildingCounts[b.id] || 0;
  return t;
}
function countUpgrades(s: GameState): number {
  return Object.keys(s.purchasedUpgrades).length + Object.keys(s.purchasedClickUpgrades).length;
}
const PLURALS: Record<string, string> = {
  spatula: 'Spatulas', cook: 'Short-Order Cooks', griddle: 'Griddles',
  syrupWell: 'Syrup Wells', flapjackFactory: 'Flapjack Factories',
  breakfastChain: 'Breakfast Chains', batterLab: 'Batter Labs', waffleDimension: 'Waffle Dimensions',
  butterAlchemy: 'Butter Alchemies', syrupNexus: 'Syrup Nexuses', pancakeTemple: 'Pancake Temples',
  breakfastSatellite: 'Breakfast Satellites', batterReactor: 'Batter Reactors',
  flapjackSingularity: 'Flapjack Singularities', cosmicGriddle: 'Cosmic Griddles',
  quantumBatter: 'Quantum Batters', pancakeGod: 'Pancake Gods', realityBaker: 'Reality Bakers',
  infiniteStack: 'Infinite Stacks',
};

// ── Generated: Per-building ownership (18 tiers × 8 buildings = 144) ──
function makeOwnershipAchievements(): AchievementDef[] {
  const tiers: { count: number; title: string; icon: string }[] = [
    { count: 10, title: 'Pack', icon: '👥' },
    { count: 25, title: 'Crew', icon: '🎪' },
    { count: 50, title: 'Fleet', icon: '⛵' },
    { count: 75, title: 'Brigade', icon: '🔥' },
    { count: 100, title: 'Legion', icon: '⭐' },
    { count: 125, title: 'Horde', icon: '⚔️' },
    { count: 150, title: 'Armada', icon: '🛡️' },
    { count: 175, title: 'Dominion', icon: '👑' },
    { count: 200, title: 'Empire', icon: '🏰' },
    { count: 225, title: 'Dynasty', icon: '🗿' },
    { count: 250, title: 'Realm', icon: '🌋' },
    { count: 300, title: 'Kingdom', icon: '🌍' },
    { count: 350, title: 'Galaxy', icon: '🌌' },
    { count: 400, title: 'Cosmos', icon: '💫' },
    { count: 500, title: 'Infinity', icon: '♾️' },
    { count: 600, title: 'Eternity', icon: '🔮' },
    { count: 750, title: 'Omnipotence', icon: '🌠' },
    { count: 1000, title: 'Transcendence', icon: '🏆' },
  ];
  return BUILDINGS.flatMap(b =>
    tiers.map(t => ({
      id: `own-${b.id}-${t.count}`,
      name: `${b.name} ${t.title}`,
      description: `Own ${t.count.toLocaleString()} ${PLURALS[b.id]}`,
      icon: t.icon,
      category: 'Ownership',
      check: (s: GameState) => (s.buildingCounts[b.id] || 0) >= t.count,
    }))
  );
}

// ── Generated: Total buildings owned (21 tiers) ──────────────
function makeTotalBuildingsAchievements(): AchievementDef[] {
  const tiers: { count: number; name: string; icon: string }[] = [
    { count: 10, name: 'Small Business', icon: '🏪' },
    { count: 20, name: 'Growing Operation', icon: '📈' },
    { count: 30, name: 'Expanding', icon: '📊' },
    { count: 50, name: 'Established', icon: '🏢' },
    { count: 75, name: 'Thriving', icon: '💼' },
    { count: 100, name: 'Corporation', icon: '🏦' },
    { count: 150, name: 'Enterprise', icon: '🌐' },
    { count: 200, name: 'Conglomerate', icon: '🏗️' },
    { count: 300, name: 'Mega Corp', icon: '💰' },
    { count: 400, name: 'Global Power', icon: '🌍' },
    { count: 500, name: 'World Dominator', icon: '🌏' },
    { count: 750, name: 'Continental Empire', icon: '🗺️' },
    { count: 1000, name: 'Galactic Corporation', icon: '🌌' },
    { count: 1250, name: 'Intergalactic', icon: '🛸' },
    { count: 1500, name: 'Universal Enterprise', icon: '✨' },
    { count: 2000, name: 'Multiversal Corp', icon: '🔮' },
    { count: 3000, name: 'Reality Inc.', icon: '💫' },
    { count: 4000, name: 'Omniversal Empire', icon: '♾️' },
    { count: 5000, name: 'Infinity Corp', icon: '🌠' },
    { count: 7500, name: 'Beyond Reality', icon: '🎆' },
    { count: 10000, name: 'Everything Corp', icon: '🏆' },
  ];
  return tiers.map(t => ({
    id: `total-bldg-${t.count}`,
    name: t.name,
    description: `Own ${t.count.toLocaleString()} total buildings`,
    icon: t.icon,
    category: 'Buildings',
    check: (s: GameState) => totalBuildings(s) >= t.count,
  }));
}

// ── Manual achievements (180) ────────────────────────────────
const MANUAL: AchievementDef[] = [
  // ── Clicking (16) ─────────────────────────────────────────
  { id: 'click-1', name: 'Baby Steps', description: 'Click the pancake 1 time', icon: '👶', category: 'Clicking', check: s => s.totalClicks >= 1 },
  { id: 'click-50', name: 'Tapper', description: 'Click the pancake 50 times', icon: '👆', category: 'Clicking', check: s => s.totalClicks >= 50 },
  { id: 'click-100', name: 'Getting Started', description: 'Click the pancake 100 times', icon: '💪', category: 'Clicking', check: s => s.totalClicks >= 100 },
  { id: 'click-500', name: 'Persistent', description: 'Click the pancake 500 times', icon: '✊', category: 'Clicking', check: s => s.totalClicks >= 500 },
  { id: 'click-1k', name: 'Carpal Tunnel', description: 'Click the pancake 1,000 times', icon: '🤕', category: 'Clicking', check: s => s.totalClicks >= 1000 },
  { id: 'click-5k', name: 'Finger Athlete', description: 'Click the pancake 5,000 times', icon: '🏃', category: 'Clicking', check: s => s.totalClicks >= 5000 },
  { id: 'click-10k', name: 'Click Machine', description: 'Click the pancake 10,000 times', icon: '🤖', category: 'Clicking', check: s => s.totalClicks >= 10000 },
  { id: 'click-25k', name: 'Dedicated Clicker', description: 'Click the pancake 25,000 times', icon: '🎯', category: 'Clicking', check: s => s.totalClicks >= 25000 },
  { id: 'click-50k', name: 'Finger Workout', description: 'Click the pancake 50,000 times', icon: '🏋️', category: 'Clicking', check: s => s.totalClicks >= 50000 },
  { id: 'click-100k', name: 'Human Autoclicker', description: 'Click the pancake 100,000 times', icon: '⚡', category: 'Clicking', check: s => s.totalClicks >= 100000 },
  { id: 'click-250k', name: 'Unstoppable', description: 'Click the pancake 250,000 times', icon: '🔨', category: 'Clicking', check: s => s.totalClicks >= 250000 },
  { id: 'click-500k', name: 'Click Legend', description: 'Click the pancake 500,000 times', icon: '🏆', category: 'Clicking', check: s => s.totalClicks >= 500000 },
  { id: 'click-1m', name: 'The Clicking Dead', description: 'Click the pancake 1,000,000 times', icon: '💀', category: 'Clicking', check: s => s.totalClicks >= 1e6 },
  { id: 'click-5m', name: 'Click Maniac', description: 'Click the pancake 5,000,000 times', icon: '🌪️', category: 'Clicking', check: s => s.totalClicks >= 5e6 },
  { id: 'click-10m', name: 'Click Overlord', description: 'Click the pancake 10,000,000 times', icon: '👑', category: 'Clicking', check: s => s.totalClicks >= 1e7 },
  { id: 'click-50m', name: 'Click Deity', description: 'Click the pancake 50,000,000 times', icon: '🌟', category: 'Clicking', check: s => s.totalClicks >= 5e7 },

  // ── Flipping / Lifetime Baked (18) ────────────────────────
  { id: 'bake-100', name: 'Amateur Flipper', description: 'Flip 100 pancakes', icon: '🧁', category: 'Flipping', check: s => s.lifetimeBaked >= 100 },
  { id: 'bake-500', name: 'Getting the Hang of It', description: 'Flip 500 pancakes', icon: '🍳', category: 'Flipping', check: s => s.lifetimeBaked >= 500 },
  { id: 'bake-1k', name: 'Pancake Apprentice', description: 'Flip 1,000 pancakes', icon: '🥞', category: 'Flipping', check: s => s.lifetimeBaked >= 1000 },
  { id: 'bake-5k', name: 'Short-Order Cook', description: 'Flip 5,000 pancakes', icon: '👨‍🍳', category: 'Flipping', check: s => s.lifetimeBaked >= 5000 },
  { id: 'bake-10k', name: 'Pancake Chef', description: 'Flip 10,000 pancakes', icon: '🍽️', category: 'Flipping', check: s => s.lifetimeBaked >= 10000 },
  { id: 'bake-50k', name: 'Breakfast Expert', description: 'Flip 50,000 pancakes', icon: '📖', category: 'Flipping', check: s => s.lifetimeBaked >= 50000 },
  { id: 'bake-100k', name: 'Pancake Master', description: 'Flip 100,000 pancakes', icon: '🎓', category: 'Flipping', check: s => s.lifetimeBaked >= 100000 },
  { id: 'bake-500k', name: 'Half-Millionaire', description: 'Flip 500,000 pancakes', icon: '💵', category: 'Flipping', check: s => s.lifetimeBaked >= 500000 },
  { id: 'bake-1m', name: 'Millionaire Flipper', description: 'Flip 1 million pancakes', icon: '💰', category: 'Flipping', check: s => s.lifetimeBaked >= 1e6 },
  { id: 'bake-5m', name: 'Multi-Millionaire', description: 'Flip 5 million pancakes', icon: '💎', category: 'Flipping', check: s => s.lifetimeBaked >= 5e6 },
  { id: 'bake-10m', name: 'Deca-Millionaire', description: 'Flip 10 million pancakes', icon: '🏅', category: 'Flipping', check: s => s.lifetimeBaked >= 1e7 },
  { id: 'bake-50m', name: 'Pancake Magnate', description: 'Flip 50 million pancakes', icon: '🎩', category: 'Flipping', check: s => s.lifetimeBaked >= 5e7 },
  { id: 'bake-100m', name: 'Pancake Tycoon', description: 'Flip 100 million pancakes', icon: '👑', category: 'Flipping', check: s => s.lifetimeBaked >= 1e8 },
  { id: 'bake-500m', name: 'Half-Billionaire', description: 'Flip 500 million pancakes', icon: '🏦', category: 'Flipping', check: s => s.lifetimeBaked >= 5e8 },
  { id: 'bake-1b', name: 'Billionaire Flipper', description: 'Flip 1 billion pancakes', icon: '🌆', category: 'Flipping', check: s => s.lifetimeBaked >= 1e9 },
  { id: 'bake-100b', name: 'Pancake Emperor', description: 'Flip 100 billion pancakes', icon: '🏰', category: 'Flipping', check: s => s.lifetimeBaked >= 1e11 },
  { id: 'bake-1t', name: 'Trillionaire Flipper', description: 'Flip 1 trillion pancakes', icon: '🌍', category: 'Flipping', check: s => s.lifetimeBaked >= 1e12 },
  { id: 'bake-100t', name: 'Cosmic Flipper', description: 'Flip 100 trillion pancakes', icon: '🌌', category: 'Flipping', check: s => s.lifetimeBaked >= 1e14 },

  // ── Production / CpS (14) ────────────────────────────────
  { id: 'cps-1', name: 'First Drip', description: 'Reach 1 pancake per second', icon: '💧', category: 'Production', check: (_s, c) => (c || 0) >= 1 },
  { id: 'cps-5', name: 'Trickle', description: 'Reach 5 pancakes per second', icon: '🚿', category: 'Production', check: (_s, c) => (c || 0) >= 5 },
  { id: 'cps-10', name: 'Warming Up', description: 'Reach 10 pancakes per second', icon: '🌡️', category: 'Production', check: (_s, c) => (c || 0) >= 10 },
  { id: 'cps-50', name: 'Steady Flow', description: 'Reach 50 pancakes per second', icon: '🌊', category: 'Production', check: (_s, c) => (c || 0) >= 50 },
  { id: 'cps-100', name: 'On a Roll', description: 'Reach 100 pancakes per second', icon: '🎲', category: 'Production', check: (_s, c) => (c || 0) >= 100 },
  { id: 'cps-500', name: 'Rapid Fire', description: 'Reach 500 pancakes per second', icon: '🔫', category: 'Production', check: (_s, c) => (c || 0) >= 500 },
  { id: 'cps-1k', name: 'Pancake Machine', description: 'Reach 1,000 pancakes per second', icon: '⚙️', category: 'Production', check: (_s, c) => (c || 0) >= 1000 },
  { id: 'cps-5k', name: 'Pancake Factory', description: 'Reach 5,000 pancakes per second', icon: '🏭', category: 'Production', check: (_s, c) => (c || 0) >= 5000 },
  { id: 'cps-10k', name: 'Pancake Overdrive', description: 'Reach 10,000 pancakes per second', icon: '🚀', category: 'Production', check: (_s, c) => (c || 0) >= 10000 },
  { id: 'cps-50k', name: 'Hyperdrive', description: 'Reach 50,000 pancakes per second', icon: '💨', category: 'Production', check: (_s, c) => (c || 0) >= 50000 },
  { id: 'cps-100k', name: 'Breakfast Singularity', description: 'Reach 100,000 pancakes per second', icon: '🌌', category: 'Production', check: (_s, c) => (c || 0) >= 100000 },
  { id: 'cps-500k', name: 'Pancake Warp', description: 'Reach 500,000 pancakes per second', icon: '🌀', category: 'Production', check: (_s, c) => (c || 0) >= 500000 },
  { id: 'cps-1m', name: 'Infinite Breakfast', description: 'Reach 1,000,000 pancakes per second', icon: '♾️', category: 'Production', check: (_s, c) => (c || 0) >= 1e6 },
  { id: 'cps-10m', name: 'Pancake Big Bang', description: 'Reach 10,000,000 pancakes per second', icon: '💥', category: 'Production', check: (_s, c) => (c || 0) >= 1e7 },

  // ── First Purchases (8) ───────────────────────────────────
  { id: 'first-spatula', name: 'Hands Free', description: 'Buy your first Spatula', icon: '🍳', category: 'Buildings', check: s => (s.buildingCounts['spatula'] || 0) >= 1 },
  { id: 'first-cook', name: 'Hired Help', description: 'Buy your first Short-Order Cook', icon: '👨‍🍳', category: 'Buildings', check: s => (s.buildingCounts['cook'] || 0) >= 1 },
  { id: 'first-griddle', name: 'Heating Up', description: 'Buy your first Griddle', icon: '♨️', category: 'Buildings', check: s => (s.buildingCounts['griddle'] || 0) >= 1 },
  { id: 'first-well', name: 'Sticky Situation', description: 'Buy your first Syrup Well', icon: '🍁', category: 'Buildings', check: s => (s.buildingCounts['syrupWell'] || 0) >= 1 },
  { id: 'first-factory', name: 'Mass Production', description: 'Buy your first Flapjack Factory', icon: '🏭', category: 'Buildings', check: s => (s.buildingCounts['flapjackFactory'] || 0) >= 1 },
  { id: 'first-chain', name: 'Franchise Owner', description: 'Buy your first Breakfast Chain', icon: '🍽️', category: 'Buildings', check: s => (s.buildingCounts['breakfastChain'] || 0) >= 1 },
  { id: 'first-lab', name: 'Mad Scientist', description: 'Buy your first Batter Lab', icon: '🔬', category: 'Buildings', check: s => (s.buildingCounts['batterLab'] || 0) >= 1 },
  { id: 'first-dimension', name: 'Dimensional Breakfast', description: 'Buy your first Waffle Dimension', icon: '🌀', category: 'Buildings', check: s => (s.buildingCounts['waffleDimension'] || 0) >= 1 },
  { id: 'first-alchemy', name: 'Transmuter', description: 'Buy your first Butter Alchemy', icon: '⚗️', category: 'Buildings', check: s => (s.buildingCounts['butterAlchemy'] || 0) >= 1 },
  { id: 'first-nexus', name: 'Connected', description: 'Buy your first Syrup Nexus', icon: '🕸️', category: 'Buildings', check: s => (s.buildingCounts['syrupNexus'] || 0) >= 1 },
  { id: 'first-temple', name: 'Faithful Flipper', description: 'Buy your first Pancake Temple', icon: '🛕', category: 'Buildings', check: s => (s.buildingCounts['pancakeTemple'] || 0) >= 1 },
  { id: 'first-satellite', name: 'Houston, We Have Pancakes', description: 'Buy your first Breakfast Satellite', icon: '🛰️', category: 'Buildings', check: s => (s.buildingCounts['breakfastSatellite'] || 0) >= 1 },
  { id: 'first-reactor', name: 'Nuclear Breakfast', description: 'Buy your first Batter Reactor', icon: '☢️', category: 'Buildings', check: s => (s.buildingCounts['batterReactor'] || 0) >= 1 },
  { id: 'first-singularity', name: 'Point of No Return', description: 'Buy your first Flapjack Singularity', icon: '🕳️', category: 'Buildings', check: s => (s.buildingCounts['flapjackSingularity'] || 0) >= 1 },
  { id: 'first-cosmic', name: 'Galactic Chef', description: 'Buy your first Cosmic Griddle', icon: '🌌', category: 'Buildings', check: s => (s.buildingCounts['cosmicGriddle'] || 0) >= 1 },
  { id: 'first-quantum', name: 'Uncertainty Principle', description: 'Buy your first Quantum Batter', icon: '⚛️', category: 'Buildings', check: s => (s.buildingCounts['quantumBatter'] || 0) >= 1 },
  { id: 'first-god', name: 'Divine Intervention', description: 'Buy your first Pancake God', icon: '👑', category: 'Buildings', check: s => (s.buildingCounts['pancakeGod'] || 0) >= 1 },
  { id: 'first-reality', name: 'Reality Warper', description: 'Buy your first Reality Baker', icon: '🧬', category: 'Buildings', check: s => (s.buildingCounts['realityBaker'] || 0) >= 1 },
  { id: 'first-infinite', name: 'Endless Appetite', description: 'Buy your first Infinite Stack', icon: '♾️', category: 'Buildings', check: s => (s.buildingCounts['infiniteStack'] || 0) >= 1 },

  // ── Building Variety (6) ──────────────────────────────────
  { id: 'variety-1', name: 'Diverse Menu', description: 'Own at least 1 of every building type', icon: '📋', category: 'Buildings', check: s => BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 1) },
  { id: 'variety-5', name: 'Sampler Platter', description: 'Own at least 5 of every building type', icon: '🍱', category: 'Buildings', check: s => BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 5) },
  { id: 'variety-10', name: 'Full Kitchen', description: 'Own at least 10 of every building type', icon: '🏠', category: 'Buildings', check: s => BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 10) },
  { id: 'variety-25', name: 'Breakfast Town', description: 'Own at least 25 of every building type', icon: '🏘️', category: 'Buildings', check: s => BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 25) },
  { id: 'variety-50', name: 'Mega Kitchen', description: 'Own at least 50 of every building type', icon: '🏗️', category: 'Buildings', check: s => BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 50) },
  { id: 'variety-100', name: 'Century All Around', description: 'Own at least 100 of every building type', icon: '💯', category: 'Buildings', check: s => BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 100) },

  // ── Upgrades (10) ─────────────────────────────────────────
  { id: 'upg-1', name: 'First Upgrade', description: 'Purchase 1 upgrade', icon: '⬆️', category: 'Upgrades', check: s => countUpgrades(s) >= 1 },
  { id: 'upg-3', name: 'Upgrading', description: 'Purchase 3 upgrades', icon: '⬆️', category: 'Upgrades', check: s => countUpgrades(s) >= 3 },
  { id: 'upg-5', name: 'Upgrade Fan', description: 'Purchase 5 upgrades', icon: '⬆️', category: 'Upgrades', check: s => countUpgrades(s) >= 5 },
  { id: 'upg-8', name: 'Power Shopper', description: 'Purchase 8 upgrades', icon: '🛒', category: 'Upgrades', check: s => countUpgrades(s) >= 8 },
  { id: 'upg-10', name: 'Upgrade Spree', description: 'Purchase 10 upgrades', icon: '🛒', category: 'Upgrades', check: s => countUpgrades(s) >= 10 },
  { id: 'upg-15', name: 'Upgrade Addict', description: 'Purchase 15 upgrades', icon: '💫', category: 'Upgrades', check: s => countUpgrades(s) >= 15 },
  { id: 'upg-20', name: 'Upgrade Collector', description: 'Purchase 20 upgrades', icon: '💫', category: 'Upgrades', check: s => countUpgrades(s) >= 20 },
  { id: 'upg-25', name: 'Upgrade Hoarder', description: 'Purchase 25 upgrades', icon: '🌟', category: 'Upgrades', check: s => countUpgrades(s) >= 25 },
  { id: 'upg-35', name: 'Upgrade Fanatic', description: 'Purchase 35 upgrades', icon: '🌟', category: 'Upgrades', check: s => countUpgrades(s) >= 35 },
  { id: 'upg-all-bldg', name: 'Fully Upgraded', description: 'Purchase every building upgrade', icon: '🏅', category: 'Upgrades', check: s => UPGRADES.every(u => s.purchasedUpgrades[u.id]) },

  // ── Building Upgrade Sets (8) ─────────────────────────────
  ...BUILDINGS.map(b => ({
    id: `upg-set-${b.id}`,
    name: `${b.name} Mastery`,
    description: `Buy all upgrades for ${b.name}`,
    icon: b.emoji,
    category: 'Upgrades',
    check: (s: GameState) => UPGRADES.filter(u => u.buildingId === b.id).every(u => s.purchasedUpgrades[u.id]),
  })),

  // ── Click Upgrades (5) ────────────────────────────────────
  { id: 'cu-1', name: 'Click Pioneer', description: 'Buy your first click upgrade', icon: '🖱️', category: 'Upgrades', check: s => Object.keys(s.purchasedClickUpgrades).length >= 1 },
  { id: 'cu-3', name: 'Click Investor', description: 'Buy 3 click upgrades', icon: '🖱️', category: 'Upgrades', check: s => Object.keys(s.purchasedClickUpgrades).length >= 3 },
  { id: 'cu-5', name: 'Click Enthusiast', description: 'Buy 5 click upgrades', icon: '🖱️', category: 'Upgrades', check: s => Object.keys(s.purchasedClickUpgrades).length >= 5 },
  { id: 'cu-8', name: 'Click Connoisseur', description: 'Buy 8 click upgrades', icon: '🖱️', category: 'Upgrades', check: s => Object.keys(s.purchasedClickUpgrades).length >= 8 },
  { id: 'cu-all', name: 'Click Perfection', description: 'Buy every click upgrade', icon: '🏆', category: 'Upgrades', check: s => CLICK_UPGRADES.every(cu => s.purchasedClickUpgrades[cu.id]) },

  // ── Bank / Held Pancakes (12) ─────────────────────────────
  { id: 'bank-100', name: 'Pocket Change', description: 'Hold 100 pancakes at once', icon: '🪙', category: 'Wealth', check: s => s.cookies >= 100 },
  { id: 'bank-1k', name: 'Piggy Bank', description: 'Hold 1,000 pancakes at once', icon: '🐷', category: 'Wealth', check: s => s.cookies >= 1000 },
  { id: 'bank-10k', name: 'Rainy Day Fund', description: 'Hold 10,000 pancakes at once', icon: '☂️', category: 'Wealth', check: s => s.cookies >= 10000 },
  { id: 'bank-100k', name: 'Savings Account', description: 'Hold 100,000 pancakes at once', icon: '🏧', category: 'Wealth', check: s => s.cookies >= 100000 },
  { id: 'bank-1m', name: 'Hoarder', description: 'Hold 1 million pancakes at once', icon: '🐉', category: 'Wealth', check: s => s.cookies >= 1e6 },
  { id: 'bank-10m', name: 'Pancake Vault', description: 'Hold 10 million pancakes at once', icon: '🏦', category: 'Wealth', check: s => s.cookies >= 1e7 },
  { id: 'bank-100m', name: 'Breakfast Bank', description: 'Hold 100 million pancakes at once', icon: '💰', category: 'Wealth', check: s => s.cookies >= 1e8 },
  { id: 'bank-1b', name: 'Fort Knox of Flapjacks', description: 'Hold 1 billion pancakes at once', icon: '💎', category: 'Wealth', check: s => s.cookies >= 1e9 },
  { id: 'bank-10b', name: 'Pancake Reserve', description: 'Hold 10 billion pancakes at once', icon: '🏛️', category: 'Wealth', check: s => s.cookies >= 1e10 },
  { id: 'bank-100b', name: 'Breakfast Treasury', description: 'Hold 100 billion pancakes at once', icon: '👑', category: 'Wealth', check: s => s.cookies >= 1e11 },
  { id: 'bank-1t', name: 'Dimension Bank', description: 'Hold 1 trillion pancakes at once', icon: '🌌', category: 'Wealth', check: s => s.cookies >= 1e12 },
  { id: 'bank-10t', name: 'Reality Vault', description: 'Hold 10 trillion pancakes at once', icon: '🔮', category: 'Wealth', check: s => s.cookies >= 1e13 },

  // ── Prestige (10) ─────────────────────────────────────────
  { id: 'pres-1', name: 'Rebirth', description: 'Prestige for the first time', icon: '⭐', category: 'Prestige', check: s => s.prestigeCount >= 1 },
  { id: 'pres-2', name: 'Back Again', description: 'Prestige 2 times', icon: '⭐', category: 'Prestige', check: s => s.prestigeCount >= 2 },
  { id: 'pres-3', name: 'Third Time\'s the Charm', description: 'Prestige 3 times', icon: '⭐', category: 'Prestige', check: s => s.prestigeCount >= 3 },
  { id: 'pres-5', name: 'Serial Ascender', description: 'Prestige 5 times', icon: '🌟', category: 'Prestige', check: s => s.prestigeCount >= 5 },
  { id: 'pres-10', name: 'Eternal Flipper', description: 'Prestige 10 times', icon: '✨', category: 'Prestige', check: s => s.prestigeCount >= 10 },
  { id: 'pres-15', name: 'Prestige Veteran', description: 'Prestige 15 times', icon: '✨', category: 'Prestige', check: s => s.prestigeCount >= 15 },
  { id: 'pres-25', name: 'Ascension Master', description: 'Prestige 25 times', icon: '🌠', category: 'Prestige', check: s => s.prestigeCount >= 25 },
  { id: 'pres-50', name: 'Prestige Junkie', description: 'Prestige 50 times', icon: '🌠', category: 'Prestige', check: s => s.prestigeCount >= 50 },
  { id: 'pres-100', name: 'Century of Rebirths', description: 'Prestige 100 times', icon: '💫', category: 'Prestige', check: s => s.prestigeCount >= 100 },
  { id: 'pres-250', name: 'Eternal Cycle', description: 'Prestige 250 times', icon: '♾️', category: 'Prestige', check: s => s.prestigeCount >= 250 },

  // ── Maple Stars (10) ──────────────────────────────────────
  { id: 'stars-1', name: 'First Star', description: 'Earn 1 Maple Star', icon: '⭐', category: 'Prestige', check: s => s.sugarStars >= 1 },
  { id: 'stars-3', name: 'Constellation', description: 'Earn 3 Maple Stars', icon: '⭐', category: 'Prestige', check: s => s.sugarStars >= 3 },
  { id: 'stars-5', name: 'Star Cluster', description: 'Earn 5 Maple Stars', icon: '🌟', category: 'Prestige', check: s => s.sugarStars >= 5 },
  { id: 'stars-10', name: 'Star Field', description: 'Earn 10 Maple Stars', icon: '🌟', category: 'Prestige', check: s => s.sugarStars >= 10 },
  { id: 'stars-25', name: 'Stargazer', description: 'Earn 25 Maple Stars', icon: '🔭', category: 'Prestige', check: s => s.sugarStars >= 25 },
  { id: 'stars-50', name: 'Star Collector', description: 'Earn 50 Maple Stars', icon: '✨', category: 'Prestige', check: s => s.sugarStars >= 50 },
  { id: 'stars-100', name: 'Star Hoarder', description: 'Earn 100 Maple Stars', icon: '🌌', category: 'Prestige', check: s => s.sugarStars >= 100 },
  { id: 'stars-200', name: 'Galaxy Maker', description: 'Earn 200 Maple Stars', icon: '🌌', category: 'Prestige', check: s => s.sugarStars >= 200 },
  { id: 'stars-500', name: 'Universe Weaver', description: 'Earn 500 Maple Stars', icon: '🌠', category: 'Prestige', check: s => s.sugarStars >= 500 },
  { id: 'stars-1000', name: 'Star God', description: 'Earn 1,000 Maple Stars', icon: '💫', category: 'Prestige', check: s => s.sugarStars >= 1000 },

  // ── Butter Pats (10) ──────────────────────────────────────
  { id: 'butter-1', name: 'Lucky Find', description: 'Catch a butter pat', icon: '🧈', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 1 },
  { id: 'butter-3', name: 'Butter Spotter', description: 'Catch 3 butter pats', icon: '🧈', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 3 },
  { id: 'butter-5', name: 'Butter Chaser', description: 'Catch 5 butter pats', icon: '🧈', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 5 },
  { id: 'butter-10', name: 'Butter Fingers', description: 'Catch 10 butter pats', icon: '🤲', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 10 },
  { id: 'butter-25', name: 'Butter Hunter', description: 'Catch 25 butter pats', icon: '🎯', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 25 },
  { id: 'butter-50', name: 'Midas Touch', description: 'Catch 50 butter pats', icon: '👑', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 50 },
  { id: 'butter-75', name: 'Butter Pro', description: 'Catch 75 butter pats', icon: '🥇', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 75 },
  { id: 'butter-100', name: 'Butter Baron', description: 'Catch 100 butter pats', icon: '🏆', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 100 },
  { id: 'butter-250', name: 'Butter Mogul', description: 'Catch 250 butter pats', icon: '💛', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 250 },
  { id: 'butter-500', name: 'Butter Deity', description: 'Catch 500 butter pats', icon: '🌟', category: 'Butter Pats', check: s => s.goldenCookiesCaught >= 500 },

  // ── Achievement Milestones (8) ────────────────────────────
  { id: 'ach-10', name: 'Getting Started', description: 'Unlock 10 achievements', icon: '🎖️', category: 'Milestones', check: s => Object.keys(s.unlockedAchievements).length >= 10 },
  { id: 'ach-25', name: 'Collector', description: 'Unlock 25 achievements', icon: '🎖️', category: 'Milestones', check: s => Object.keys(s.unlockedAchievements).length >= 25 },
  { id: 'ach-50', name: 'Achievement Hunter', description: 'Unlock 50 achievements', icon: '🏅', category: 'Milestones', check: s => Object.keys(s.unlockedAchievements).length >= 50 },
  { id: 'ach-100', name: 'Centurion', description: 'Unlock 100 achievements', icon: '🏅', category: 'Milestones', check: s => Object.keys(s.unlockedAchievements).length >= 100 },
  { id: 'ach-150', name: 'Overachiever', description: 'Unlock 150 achievements', icon: '🏆', category: 'Milestones', check: s => Object.keys(s.unlockedAchievements).length >= 150 },
  { id: 'ach-200', name: 'Trophy Room', description: 'Unlock 200 achievements', icon: '🏆', category: 'Milestones', check: s => Object.keys(s.unlockedAchievements).length >= 200 },
  { id: 'ach-250', name: 'Medal Collector', description: 'Unlock 250 achievements', icon: '🎗️', category: 'Milestones', check: s => Object.keys(s.unlockedAchievements).length >= 250 },
  { id: 'ach-300', name: 'Nearly There', description: 'Unlock 300 achievements', icon: '🎗️', category: 'Milestones', check: s => Object.keys(s.unlockedAchievements).length >= 300 },

  // ── Fun / Combos (30) ─────────────────────────────────────
  { id: 'combo-double', name: 'Double Trouble', description: 'Own at least 2 of every building type', icon: '✌️', category: 'Combos', check: s => BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 2) },
  { id: 'combo-13', name: 'Baker\'s Dozen', description: 'Own exactly 13 of any building type', icon: '🍀', category: 'Combos', check: s => BUILDINGS.some(b => s.buildingCounts[b.id] === 13) },
  { id: 'combo-42', name: 'The Answer', description: 'Own exactly 42 of any building type', icon: '📗', category: 'Combos', check: s => BUILDINGS.some(b => s.buildingCounts[b.id] === 42) },
  { id: 'combo-69', name: 'Nice', description: 'Own exactly 69 of any building type', icon: '😏', category: 'Combos', check: s => BUILDINGS.some(b => s.buildingCounts[b.id] === 69) },
  { id: 'combo-77', name: 'Lucky Sevens', description: 'Own exactly 77 of any building type', icon: '🎰', category: 'Combos', check: s => BUILDINGS.some(b => s.buildingCounts[b.id] === 77) },
  { id: 'combo-100-exact', name: 'Precise', description: 'Own exactly 100 of any building type', icon: '🎯', category: 'Combos', check: s => BUILDINGS.some(b => s.buildingCounts[b.id] === 100) },
  { id: 'combo-triple-c', name: 'Triple Century', description: 'Own 100+ of 3 different building types', icon: '🥉', category: 'Combos', check: s => BUILDINGS.filter(b => (s.buildingCounts[b.id] || 0) >= 100).length >= 3 },
  { id: 'combo-penta-c', name: 'Penta Century', description: 'Own 100+ of 5 different building types', icon: '🥇', category: 'Combos', check: s => BUILDINGS.filter(b => (s.buildingCounts[b.id] || 0) >= 100).length >= 5 },
  { id: 'combo-full-c', name: 'Full Century', description: 'Own 100+ of every building type', icon: '💯', category: 'Combos', check: s => BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 100) },
  { id: 'combo-fan', name: 'Dedicated Fan', description: 'Own 200+ of any single building type', icon: '❤️', category: 'Combos', check: s => BUILDINGS.some(b => (s.buildingCounts[b.id] || 0) >= 200) },
  { id: 'combo-obsessed', name: 'Obsessed', description: 'Own 500+ of any single building type', icon: '😍', category: 'Combos', check: s => BUILDINGS.some(b => (s.buildingCounts[b.id] || 0) >= 500) },
  { id: 'combo-truly-obs', name: 'Truly Obsessed', description: 'Own 1,000+ of any single building type', icon: '🤯', category: 'Combos', check: s => BUILDINGS.some(b => (s.buildingCounts[b.id] || 0) >= 1000) },
  { id: 'combo-jack', name: 'Jack of All Trades', description: 'Buy at least 1 upgrade for each building type', icon: '🃏', category: 'Combos', check: s => BUILDINGS.every(b => UPGRADES.some(u => u.buildingId === b.id && s.purchasedUpgrades[u.id])) },
  { id: 'combo-cps-click', name: 'CpS Clicker', description: 'Buy a CpS-per-click upgrade', icon: '📈', category: 'Combos', check: s => CLICK_UPGRADES.some(cu => cu.addCpsPercent && s.purchasedClickUpgrades[cu.id]) },
  { id: 'combo-no-prestige', name: 'No Prestige Needed', description: 'Reach 10,000 PpS without ever prestiging', icon: '💪', category: 'Combos', check: (s, c) => s.prestigeCount === 0 && (c || 0) >= 10000 },
  { id: 'combo-star-power', name: 'Star Power', description: 'Have 25+ Maple Stars and 10,000+ PpS', icon: '⚡', category: 'Combos', check: (s, c) => s.sugarStars >= 25 && (c || 0) >= 10000 },
  { id: 'combo-top-heavy', name: 'Top Heavy', description: 'Own more Waffle Dimensions than Spatulas (10+ each)', icon: '⚖️', category: 'Combos', check: s => { const w = s.buildingCounts['waffleDimension'] || 0; const sp = s.buildingCounts['spatula'] || 0; return w > sp && w >= 10 && sp >= 10; } },
  { id: 'combo-tycoon', name: 'Breakfast Tycoon', description: 'Own 50+ of the 3 most expensive buildings', icon: '💰', category: 'Combos', check: s => (s.buildingCounts['breakfastChain'] || 0) >= 50 && (s.buildingCounts['batterLab'] || 0) >= 50 && (s.buildingCounts['waffleDimension'] || 0) >= 50 },
  { id: 'combo-humble', name: 'Humble Beginnings', description: 'Own 100 Spatulas and 0 Waffle Dimensions', icon: '🙏', category: 'Combos', check: s => (s.buildingCounts['spatula'] || 0) >= 100 && (s.buildingCounts['waffleDimension'] || 0) === 0 },
  { id: 'combo-click-war', name: 'Click Warrior', description: 'Have 10,000+ clicks and 5+ click upgrades', icon: '⚔️', category: 'Combos', check: s => s.totalClicks >= 10000 && Object.keys(s.purchasedClickUpgrades).length >= 5 },
  { id: 'combo-dim-duo', name: 'Dimension Duo', description: 'Own 50+ Waffle Dimensions and 50+ Batter Labs', icon: '🔬', category: 'Combos', check: s => (s.buildingCounts['waffleDimension'] || 0) >= 50 && (s.buildingCounts['batterLab'] || 0) >= 50 },
  { id: 'combo-long-game', name: 'The Long Game', description: 'Prestige 25+ times with 10T+ lifetime baked', icon: '🕰️', category: 'Combos', check: s => s.prestigeCount >= 25 && s.lifetimeBaked >= 1e13 },
  { id: 'combo-butter-star', name: 'Butter Collector', description: 'Catch 50+ butter pats and have 25+ Maple Stars', icon: '🌈', category: 'Combos', check: s => s.goldenCookiesCaught >= 50 && s.sugarStars >= 25 },
  { id: 'combo-maxed', name: 'Maxed Out', description: 'Own 200+ of every building type', icon: '🔥', category: 'Combos', check: s => BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 200) },
  { id: 'combo-complete', name: 'True Completionist', description: 'Buy every building upgrade and every click upgrade', icon: '🎊', category: 'Combos', check: s => UPGRADES.every(u => s.purchasedUpgrades[u.id]) && CLICK_UPGRADES.every(cu => s.purchasedClickUpgrades[cu.id]) },
  { id: 'combo-ascended', name: 'Ascended Power', description: 'Have 100+ Maple Stars and 100+ of every building', icon: '👼', category: 'Combos', check: s => s.sugarStars >= 100 && BUILDINGS.every(b => (s.buildingCounts[b.id] || 0) >= 100) },
  { id: 'combo-ultimate', name: 'Ultimate Flipper', description: 'Flip 1T+ pancakes with 100K+ PpS', icon: '🏆', category: 'Combos', check: (s, c) => s.lifetimeBaked >= 1e12 && (c || 0) >= 100000 },
  { id: 'combo-god', name: 'Breakfast God', description: 'Reach 10M PpS with 1M+ total clicks', icon: '🌟', category: 'Combos', check: (s, c) => (c || 0) >= 1e7 && s.totalClicks >= 1e6 },
  { id: 'combo-balanced', name: 'Balanced Build', description: 'Own all buildings within 10 of each other (min 50)', icon: '⚖️', category: 'Combos', check: s => { const c = BUILDINGS.map(b => s.buildingCounts[b.id] || 0); return Math.min(...c) >= 50 && Math.max(...c) - Math.min(...c) <= 10; } },
  { id: 'combo-prestige-pro', name: 'Prestige Pro', description: 'Prestige 10+ times and reach 100K+ PpS', icon: '🎓', category: 'Combos', check: (s, c) => s.prestigeCount >= 10 && (c || 0) >= 100000 },

  // ── Secret / Hidden (15) ──────────────────────────────────
  { id: 'secret-speed', name: 'Speed Demon', description: 'Click 10 times in 2 seconds', icon: '⚡', category: 'Secret', hidden: true, check: () => false },
  { id: 'secret-1337', name: '1337', description: 'Own exactly 1,337 total buildings', icon: '💻', category: 'Secret', hidden: true, check: s => totalBuildings(s) === 1337 },
  { id: 'secret-314', name: 'Pi Day', description: 'Own exactly 314 of any building type', icon: '🥧', category: 'Secret', hidden: true, check: s => BUILDINGS.some(b => s.buildingCounts[b.id] === 314) },
  { id: 'secret-404', name: 'Error 404', description: 'Own exactly 404 of any building type', icon: '🚫', category: 'Secret', hidden: true, check: s => BUILDINGS.some(b => s.buildingCounts[b.id] === 404) },
  { id: 'secret-666', name: 'Number of the Beast', description: 'Own exactly 666 total buildings', icon: '😈', category: 'Secret', hidden: true, check: s => totalBuildings(s) === 666 },
  { id: 'secret-no-upg', name: 'No Upgrades Challenge', description: 'Reach 100K PpS with no building upgrades and no prestige', icon: '🚫', category: 'Secret', hidden: true, check: (s, c) => Object.keys(s.purchasedUpgrades).length === 0 && s.sugarStars === 0 && (c || 0) >= 100000 },
  { id: 'secret-1qa', name: 'Quadrillionaire', description: 'Flip 1 quadrillion pancakes', icon: '🌌', category: 'Secret', hidden: true, check: s => s.lifetimeBaked >= 1e15 },
  { id: 'secret-500-stars', name: 'Star Lord', description: 'Earn 500 Maple Stars', icon: '🌠', category: 'Secret', hidden: true, check: s => s.sugarStars >= 500 },
  { id: 'secret-500-pres', name: 'Prestige Addict', description: 'Prestige 500 times', icon: '♾️', category: 'Secret', hidden: true, check: s => s.prestigeCount >= 500 },
  { id: 'secret-100m-clicks', name: 'Click God', description: 'Click 100 million times', icon: '🖱️', category: 'Secret', hidden: true, check: s => s.totalClicks >= 1e8 },
  { id: 'secret-1k-butter', name: 'Butter Obsessed', description: 'Catch 1,000 butter pats', icon: '🧈', category: 'Secret', hidden: true, check: s => s.goldenCookiesCaught >= 1000 },
  { id: 'secret-1qa-bank', name: 'Pancake Infinity', description: 'Hold 1 quadrillion pancakes at once', icon: '♾️', category: 'Secret', hidden: true, check: s => s.cookies >= 1e15 },
  { id: 'secret-ultimate', name: 'The Ultimate', description: 'Unlock 330 achievements', icon: '🏆', category: 'Secret', hidden: true, check: s => Object.keys(s.unlockedAchievements).length >= 330 },
  { id: 'secret-near-perfect', name: 'Nearly Perfect', description: 'Unlock 340 achievements', icon: '🎖️', category: 'Secret', hidden: true, check: s => Object.keys(s.unlockedAchievements).length >= 340 },
  { id: 'secret-perfect', name: 'Perfectionist', description: 'Unlock 344 achievements', icon: '👑', category: 'Secret', hidden: true, check: s => Object.keys(s.unlockedAchievements).length >= 344 },
];

// ── Combine all ──────────────────────────────────────────────
export const ACHIEVEMENTS: AchievementDef[] = [
  ...MANUAL,
  ...makeOwnershipAchievements(),
  ...makeTotalBuildingsAchievements(),
];

// Category display order
export const CATEGORIES = [
  'Clicking', 'Flipping', 'Production', 'Buildings',
  'Ownership', 'Upgrades', 'Wealth', 'Prestige',
  'Butter Pats', 'Milestones', 'Combos', 'Secret',
] as const;

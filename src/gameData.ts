export interface BuildingDef {
  id: string;
  name: string;
  baseCost: number;
  baseCps: number;
  emoji: string;
  flavor: string;
}

const BASE_BUILDINGS: BuildingDef[] = [
  { id: 'spatula', name: 'Spatula', baseCost: 15, baseCps: 0.1, emoji: '🍳', flavor: 'A trusty spatula that flips on its own.' },
  { id: 'cook', name: 'Short-Order Cook', baseCost: 100, baseCps: 1, emoji: '👨‍🍳', flavor: 'Flips pancakes with lightning speed and never burns a batch.' },
  { id: 'griddle', name: 'Griddle', baseCost: 1100, baseCps: 8, emoji: '♨️', flavor: 'An industrial flattop that never cools down.' },
  { id: 'syrupWell', name: 'Syrup Well', baseCost: 12000, baseCps: 47, emoji: '🍁', flavor: 'Taps into underground maple syrup reserves.' },
  { id: 'flapjackFactory', name: 'Flapjack Factory', baseCost: 130000, baseCps: 260, emoji: '🏭', flavor: 'Conveyor belts of endless golden flapjacks.' },
  { id: 'breakfastChain', name: 'Breakfast Chain', baseCost: 1400000, baseCps: 1400, emoji: '🍽️', flavor: 'A franchise empire. Pancakes in every town.' },
  { id: 'batterLab', name: 'Batter Lab', baseCost: 20000000, baseCps: 7800, emoji: '🔬', flavor: 'Scientists in lab coats perfecting the ultimate batter.' },
  { id: 'waffleDimension', name: 'Waffle Dimension', baseCost: 330000000, baseCps: 44000, emoji: '🌀', flavor: 'A portal to a dimension made entirely of breakfast.' },
  { id: 'butterAlchemy', name: 'Butter Alchemy', baseCost: 5.1e9, baseCps: 260000, emoji: '⚗️', flavor: 'Transmutes ordinary butter into golden pancakes.' },
  { id: 'syrupNexus', name: 'Syrup Nexus', baseCost: 75e9, baseCps: 1.6e6, emoji: '🕸️', flavor: 'A neural network of maple syrup connecting all griddles.' },
  { id: 'pancakeTemple', name: 'Pancake Temple', baseCost: 1e12, baseCps: 10e6, emoji: '🛕', flavor: 'Ancient monks who have perfected the art of the flip.' },
  { id: 'breakfastSatellite', name: 'Breakfast Satellite', baseCost: 14e12, baseCps: 65e6, emoji: '🛰️', flavor: 'Beams pancakes down from orbit. Zero-gravity flipping.' },
  { id: 'batterReactor', name: 'Batter Reactor', baseCost: 170e12, baseCps: 430e6, emoji: '☢️', flavor: 'Nuclear fission, but with batter. What could go wrong?' },
  { id: 'flapjackSingularity', name: 'Flapjack Singularity', baseCost: 2.1e15, baseCps: 2.9e9, emoji: '🕳️', flavor: 'A black hole that only absorbs ingredients and outputs pancakes.' },
  { id: 'cosmicGriddle', name: 'Cosmic Griddle', baseCost: 26e15, baseCps: 21e9, emoji: '🌌', flavor: 'A griddle the size of a galaxy. Heats up in 3 billion years.' },
  { id: 'quantumBatter', name: 'Quantum Batter', baseCost: 310e15, baseCps: 150e9, emoji: '⚛️', flavor: 'Exists in all states at once: raw, cooked, and delicious.' },
  { id: 'pancakeGod', name: 'Pancake God', baseCost: 4.1e18, baseCps: 1.1e12, emoji: '👑', flavor: 'The supreme deity of breakfast. Wills pancakes into existence.' },
  { id: 'realityBaker', name: 'Reality Baker', baseCost: 51e18, baseCps: 8.3e12, emoji: '🧬', flavor: 'Rewrites the laws of physics so everything is made of pancake.' },
  { id: 'infiniteStack', name: 'Infinite Stack', baseCost: 640e18, baseCps: 64e12, emoji: '♾️', flavor: 'An infinitely tall stack. Mathematicians weep. Breakfast is served.' },
];

// 50 extension tiers beyond Infinite Stack — each ~×12 cost and ~×8 cps
// of the previous. Built for the galaxy-pancake set who want to keep buying.
const EXTENSION_META: { id: string; name: string; emoji: string; flavor: string }[] = [
  { id: 'hyperflap',         name: 'Hyperflapjack Engine',     emoji: '🛞', flavor: 'A wheel of compressed time. Each rotation flips a billion pancakes.' },
  { id: 'wormholePan',        name: 'Wormhole Pan',             emoji: '🌪️', flavor: 'Pancakes go in one side and arrive cooked yesterday from the other.' },
  { id: 'stellarSkillet',     name: 'Stellar Skillet',          emoji: '⭐', flavor: 'Powered by a captured star. Maintenance is mostly fireproofing.' },
  { id: 'galacticRefinery',   name: 'Galactic Refinery',        emoji: '🌟', flavor: 'Refines starlight directly into syrup. No middleman.' },
  { id: 'timeLoopPan',        name: 'Time-Loop Pan',            emoji: '⏰', flavor: 'Cooks the same pancake forever. Output is somehow infinite anyway.' },
  { id: 'multiMixer',         name: 'Multiversal Mixer',        emoji: '🎛️', flavor: 'Blends batter from every parallel universe at once.' },
  { id: 'echoFlip',           name: 'Echo Flip',                emoji: '📢', flavor: 'Each flip echoes back from the future, doubling itself.' },
  { id: 'probPancake',        name: 'Probability Pancake',      emoji: '🎲', flavor: 'Statistically, you already own infinity of these. Just collect them.' },
  { id: 'schrodingerSkillet', name: "Schrödinger's Skillet",    emoji: '🐈', flavor: 'Both fully cooked and not, until you try to eat one.' },
  { id: 'hivemind',           name: 'Pancake Hivemind',         emoji: '🐝', flavor: 'A swarm of sentient pancakes that flip in perfect unison.' },
  { id: 'sentientMaple',      name: 'Sentient Maple Tree',      emoji: '🌳', flavor: 'It writes its own syrup. The poetry is decent.' },
  { id: 'dreamBakery',        name: 'Dream Bakery',             emoji: '💭', flavor: 'Bakes pancakes that only exist while you remember them.' },
  { id: 'lucidGriddle',       name: 'Lucid Griddle',            emoji: '😴', flavor: 'A griddle aware that it is a griddle. Existential, but productive.' },
  { id: 'astralSpatula',      name: 'Astral Spatula',           emoji: '🧘', flavor: 'Flips pancakes on the astral plane and sends them back gently.' },
  { id: 'etherealFlipper',    name: 'Ethereal Flipper',         emoji: '👻', flavor: 'You cannot see it, but the pancakes keep arriving.' },
  { id: 'pancakeNexus',       name: 'Pancake Nexus',            emoji: '🔗', flavor: 'Every griddle that ever was and ever will be, connected.' },
  { id: 'worldTree',          name: 'Pancake World Tree',       emoji: '🌲', flavor: 'Roots in the kitchen, branches across nine realms of breakfast.' },
  { id: 'ouroboros',          name: 'Ouroboros Pancake',        emoji: '🐍', flavor: 'A pancake that eats its own tail. The output is enormous.' },
  { id: 'towerPancake',       name: 'Tower of Pancake',         emoji: '🗼', flavor: 'They tried to build it to heaven. Heaven complained.' },
  { id: 'conceptBreakfast',   name: 'Concept of Breakfast',     emoji: '💡', flavor: 'Not a pancake — the idea of one. Somehow more efficient.' },
  { id: 'platonicPancake',    name: 'Platonic Pancake',         emoji: '🎓', flavor: 'The perfect ideal of which all other pancakes are mere shadows.' },
  { id: 'universePancake',    name: 'Universe-Pancake',         emoji: '🪐', flavor: 'The universe is a flat disc on a turtle. The disc is a pancake.' },
  { id: 'heatDeath',          name: 'Pancake Heat Death',       emoji: '🥵', flavor: 'Entropy converted directly to breakfast. Terms apply.' },
  { id: 'antiPancake',        name: 'Anti-Pancake',             emoji: '➖', flavor: 'A negative pancake. Through arithmetic alchemy, it adds positive ones.' },
  { id: 'boltzmannPancake',   name: 'Boltzmann Pancake',        emoji: '🧠', flavor: 'A pancake that randomly assembled in deep space. Statistically inevitable.' },
  { id: 'recursivePancake',   name: 'Recursive Pancake',        emoji: '🔄', flavor: 'Each pancake produces another, which produces another, which—' },
  { id: 'pancakeCompiler',    name: 'Pancake Compiler',         emoji: '⚙️', flavor: 'Compiles batter into bytecode and executes it on a hot griddle.' },
  { id: 'pancakeFractal',     name: 'Pancake Fractal',          emoji: '❄️', flavor: 'Zoom in on any pancake. There is another pancake there. Forever.' },
  { id: 'pancakeOS',          name: 'Pancake OS',               emoji: '💻', flavor: 'Boots in 0.3 seconds. Reboots add syrup. EULA is delicious.' },
  { id: 'sourceCode',         name: 'Pancake Source Code',      emoji: '📜', flavor: 'The actual source of all pancakes. Forking is encouraged.' },
  { id: 'pancakeAuthor',      name: 'Pancake Author',           emoji: '✍️', flavor: 'Writes pancakes into existence with a quill of pure butter.' },
  { id: 'pancakeReader',      name: 'Pancake Reader',           emoji: '📖', flavor: 'Reads the pancakes back out. Some readers double as eaters.' },
  { id: 'pancakeVerse',       name: 'Pancake-Verse',            emoji: '📚', flavor: 'A complete encyclopedia of every pancake that ever existed.' },
  { id: 'lastPancake',        name: 'The Last Pancake',         emoji: '🏁', flavor: 'After this one there are no more. Until tomorrow morning.' },
  { id: 'firstPancake',       name: 'The First Pancake',        emoji: '🥚', flavor: 'The original. The one all others descend from. Slightly burnt.' },
  { id: 'forgottenPancake',   name: 'Forgotten Pancake',        emoji: '❓', flavor: 'You owned this pancake once. You will own it again. You will not remember.' },
  { id: 'unspokenPancake',    name: 'Unspoken Pancake',         emoji: '🤐', flavor: 'A pancake whose name cannot be said. Its CPS is unaffected.' },
  { id: 'ineffablePancake',   name: 'Ineffable Pancake',        emoji: '💫', flavor: 'Beyond words, beyond syrup, beyond breakfast itself.' },
  { id: 'beyondTimePancake',  name: 'Pancake Beyond Time',      emoji: '⏳', flavor: 'It existed before clocks. It will exist after them. It is the clock.' },
  { id: 'outsideSpace',       name: 'Pancake Outside Space',    emoji: '📏', flavor: 'A pancake with no length, width, or height. Tastes great anyway.' },
  { id: 'noReference',        name: 'Pancake Without Reference', emoji: '🪞', flavor: 'A pancake that is not relative to anything. Itself only.' },
  { id: 'hungryVoid',         name: 'Hungry Void',              emoji: '🌑', flavor: 'A void that eats pancakes and outputs more pancakes. Net positive.' },
  { id: 'devouringStack',     name: 'Devouring Stack',          emoji: '🦷', flavor: 'A stack so tall it eats its own top floor. The sound is unsettling.' },
  { id: 'finalForm',          name: 'Final Form',               emoji: '🏆', flavor: 'You think this is the last one. It is not.' },
  { id: 'beyondFinal',        name: 'Beyond Final',             emoji: '🎖️', flavor: 'Past the final form. Past the credits. The real game starts here.' },
  { id: 'afterBeyond',        name: 'After Beyond',             emoji: '🚀', flavor: 'There is something after beyond. There always is.' },
  { id: 'closingCredits',     name: 'Closing Credits Pancake',  emoji: '🎬', flavor: 'Scrolls slowly upward, generating pancakes as it goes.' },
  { id: 'newGamePlus',        name: 'New Game Plus Pancake',    emoji: '🎮', flavor: 'You cleared the game. The game gives you another pancake.' },
  { id: 'speedrunPancake',    name: 'Speedrun Pancake',         emoji: '🏃', flavor: 'Cooks itself in 0.0001 seconds. Glitched, technically. Fine, mostly.' },
  { id: 'glitchedPancake',    name: 'Glitched Pancake',         emoji: '🐛', flavor: 'Out of bounds. Producing pancakes anyway. Do not inspect.' },
];

function buildExtensions(): BuildingDef[] {
  // Start one tier above Infinite Stack (640e18 cost, 64e12 cps).
  let cost = 640e18 * 12;
  let cps = 64e12 * 8;
  return EXTENSION_META.map(m => {
    const b: BuildingDef = { ...m, baseCost: cost, baseCps: cps };
    cost *= 12;
    cps *= 8;
    return b;
  });
}

export const BUILDINGS: BuildingDef[] = [...BASE_BUILDINGS, ...buildExtensions()];

export const COST_MULTIPLIER = 1.15;

export function getBuildingCost(building: BuildingDef, owned: number): number {
  return Math.ceil(building.baseCost * Math.pow(COST_MULTIPLIER, owned));
}

export function getBulkCost(building: BuildingDef, owned: number, count: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += getBuildingCost(building, owned + i);
  }
  return total;
}

export function getMaxBuyable(building: BuildingDef, owned: number, budget: number): number {
  let count = 0;
  let spent = 0;
  while (count < 10000) {
    const cost = getBuildingCost(building, owned + count);
    if (spent + cost > budget) break;
    spent += cost;
    count++;
  }
  return count;
}

export function formatNumber(n: number): string {
  // Past a googol we just call it infinity — keeps the galaxy-pancake grant
  // from displaying "1.00e+100" and looking like a number.
  if (n >= 1e100) return '∞';
  if (n < 1000) return Math.floor(n).toLocaleString();
  if (n < 1e6) return (n / 1e3).toFixed(1) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(1) + 'M';
  if (n < 1e12) return (n / 1e9).toFixed(1) + 'B';
  if (n < 1e15) return (n / 1e12).toFixed(1) + 'T';
  if (n < 1e18) return (n / 1e15).toFixed(1) + 'Qa';
  if (n < 1e21) return (n / 1e18).toFixed(1) + 'Qi';
  if (n < 1e24) return (n / 1e21).toFixed(1) + 'Sx';
  if (n < 1e27) return (n / 1e24).toFixed(1) + 'Sp';
  if (n < 1e30) return (n / 1e27).toFixed(1) + 'Oc';
  if (n < 1e33) return (n / 1e30).toFixed(1) + 'No';
  if (n < 1e36) return (n / 1e33).toFixed(1) + 'Dc';
  if (n < 1e39) return (n / 1e36).toFixed(1) + 'UDc';
  if (n < 1e42) return (n / 1e39).toFixed(1) + 'DDc';
  if (n < 1e45) return (n / 1e42).toFixed(1) + 'TDc';
  if (n < 1e48) return (n / 1e45).toFixed(1) + 'QaDc';
  if (n < 1e51) return (n / 1e48).toFixed(1) + 'QiDc';
  return n.toExponential(2);
}

export function formatCps(n: number): string {
  if (n < 10) return n.toFixed(1);
  return formatNumber(n);
}

// Milestone upgrades — one-time purchases that boost a building's output
export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  buildingId: string;
  requiredOwned: number;
  cost: number;
  multiplier: number;
}

function makeUpgrades(b: BuildingDef, tiers: { owned: number; costMult: number; mult: number; name: string; desc: string }[]): UpgradeDef[] {
  return tiers.map(t => ({
    id: `${b.id}-${t.owned}`,
    name: t.name,
    description: t.desc,
    buildingId: b.id,
    requiredOwned: t.owned,
    cost: Math.ceil(b.baseCost * t.costMult),
    multiplier: t.mult,
  }));
}

export const UPGRADES: UpgradeDef[] = [
  // Spatula upgrades
  ...makeUpgrades(BUILDINGS[0], [
    { owned: 1, costMult: 10, mult: 2, name: 'Non-Stick Coating', desc: 'Spatulas are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Wrist Technique', desc: 'Spatulas are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Dual Wielding', desc: 'Spatulas are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Thousand Spatulas', desc: 'Spatulas are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Spatula Tornado', desc: 'Spatulas are 3x as efficient.' },
  ]),
  // Short-Order Cook upgrades
  ...makeUpgrades(BUILDINGS[1], [
    { owned: 1, costMult: 10, mult: 2, name: 'Coffee IV Drip', desc: 'Cooks are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Cast Iron Skillets', desc: 'Cooks are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Secret Batter Recipe', desc: 'Cooks are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Double Shift', desc: 'Cooks are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Cook Army', desc: 'Cooks are 3x as efficient.' },
  ]),
  // Griddle upgrades
  ...makeUpgrades(BUILDINGS[2], [
    { owned: 1, costMult: 10, mult: 2, name: 'Even Heat Distribution', desc: 'Griddles are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Butter Dispenser', desc: 'Griddles are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Infinite Flattop', desc: 'Griddles are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Volcanic Heat Source', desc: 'Griddles are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Surface of the Sun', desc: 'Griddles are 3x as efficient.' },
  ]),
  // Syrup Well upgrades
  ...makeUpgrades(BUILDINGS[3], [
    { owned: 1, costMult: 10, mult: 2, name: 'Deeper Taps', desc: 'Syrup Wells are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Maple Veins', desc: 'Syrup Wells are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Syrup Geyser', desc: 'Syrup Wells are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Core Tapping', desc: 'Syrup Wells are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Amber Ocean', desc: 'Syrup Wells are 3x as efficient.' },
  ]),
  // Flapjack Factory upgrades
  ...makeUpgrades(BUILDINGS[4], [
    { owned: 1, costMult: 10, mult: 2, name: 'Faster Conveyor Belts', desc: 'Factories are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Automated Griddles', desc: 'Factories are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Industrial Flattop', desc: 'Factories are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Robot Flippers', desc: 'Factories are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Quantum Assembly Line', desc: 'Factories are 3x as efficient.' },
  ]),
  // Breakfast Chain upgrades
  ...makeUpgrades(BUILDINGS[5], [
    { owned: 1, costMult: 10, mult: 2, name: 'Grand Opening', desc: 'Chains are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Drive-Through Windows', desc: 'Chains are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Pancake Futures', desc: 'Chains are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Global Franchise', desc: 'Chains are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Breakfast Monopoly', desc: 'Chains are 3x as efficient.' },
  ]),
  // Batter Lab upgrades
  ...makeUpgrades(BUILDINGS[6], [
    { owned: 1, costMult: 10, mult: 2, name: 'Batter Experiments', desc: 'Labs are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Flavor Synthesis', desc: 'Labs are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Pancake Cloning', desc: 'Labs are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Batter Teleportation', desc: 'Labs are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Molecular Flipping', desc: 'Labs are 3x as efficient.' },
  ]),
  // Waffle Dimension upgrades
  ...makeUpgrades(BUILDINGS[7], [
    { owned: 1, costMult: 10, mult: 2, name: 'Rift Stabilizer', desc: 'Portals are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Breakfast Multiverse', desc: 'Portals are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Future Flapjacks', desc: 'Portals are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Temporal Griddle', desc: 'Portals are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Eternity Pancake', desc: 'Portals are 3x as efficient.' },
  ]),
  // Butter Alchemy upgrades
  ...makeUpgrades(BUILDINGS[8], [
    { owned: 1, costMult: 10, mult: 2, name: 'Philosopher\'s Butter', desc: 'Alchemy is twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Golden Transmutation', desc: 'Alchemy is twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Elixir of Syrup', desc: 'Alchemy is twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Midas Spatula', desc: 'Alchemy is twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Pancake Transmutation', desc: 'Alchemy is 3x as efficient.' },
  ]),
  // Syrup Nexus upgrades
  ...makeUpgrades(BUILDINGS[9], [
    { owned: 1, costMult: 10, mult: 2, name: 'Sticky Bandwidth', desc: 'Nexus is twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Maple Fiber Optics', desc: 'Nexus is twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Synaptic Syrup', desc: 'Nexus is twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Hivemind Griddle', desc: 'Nexus is twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Omniscient Batter', desc: 'Nexus is 3x as efficient.' },
  ]),
  // Pancake Temple upgrades
  ...makeUpgrades(BUILDINGS[10], [
    { owned: 1, costMult: 10, mult: 2, name: 'Sacred Spatula', desc: 'Temples are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Pancake Pilgrimage', desc: 'Temples are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Buttered Scriptures', desc: 'Temples are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Divine Flipping', desc: 'Temples are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Breakfast Enlightenment', desc: 'Temples are 3x as efficient.' },
  ]),
  // Breakfast Satellite upgrades
  ...makeUpgrades(BUILDINGS[11], [
    { owned: 1, costMult: 10, mult: 2, name: 'Orbital Griddles', desc: 'Satellites are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Zero-G Batter', desc: 'Satellites are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Pancake Laser Array', desc: 'Satellites are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Interplanetary Delivery', desc: 'Satellites are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Dyson Griddle', desc: 'Satellites are 3x as efficient.' },
  ]),
  // Batter Reactor upgrades
  ...makeUpgrades(BUILDINGS[12], [
    { owned: 1, costMult: 10, mult: 2, name: 'Enriched Flour Rods', desc: 'Reactors are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Chain Reaction Flipping', desc: 'Reactors are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Fusion Batter', desc: 'Reactors are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Antimatter Syrup', desc: 'Reactors are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Supercritical Pancake', desc: 'Reactors are 3x as efficient.' },
  ]),
  // Flapjack Singularity upgrades
  ...makeUpgrades(BUILDINGS[13], [
    { owned: 1, costMult: 10, mult: 2, name: 'Event Horizon Griddle', desc: 'Singularities are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Spaghettified Batter', desc: 'Singularities are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Hawking Pancake Radiation', desc: 'Singularities are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Gravitational Syrup Waves', desc: 'Singularities are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Pancake Beyond Infinity', desc: 'Singularities are 3x as efficient.' },
  ]),
  // Cosmic Griddle upgrades
  ...makeUpgrades(BUILDINGS[14], [
    { owned: 1, costMult: 10, mult: 2, name: 'Nebula Batter', desc: 'Cosmic Griddles are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Supernova Flip', desc: 'Cosmic Griddles are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Dark Matter Syrup', desc: 'Cosmic Griddles are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Galactic Butter Stream', desc: 'Cosmic Griddles are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Big Bang Breakfast', desc: 'Cosmic Griddles are 3x as efficient.' },
  ]),
  // Quantum Batter upgrades
  ...makeUpgrades(BUILDINGS[15], [
    { owned: 1, costMult: 10, mult: 2, name: 'Superposition Spatula', desc: 'Quantum Batter is twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Entangled Griddles', desc: 'Quantum Batter is twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Schrödinger\'s Pancake', desc: 'Quantum Batter is twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Wave Function Flip', desc: 'Quantum Batter is twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Quantum Tunneling Syrup', desc: 'Quantum Batter is 3x as efficient.' },
  ]),
  // Pancake God upgrades
  ...makeUpgrades(BUILDINGS[16], [
    { owned: 1, costMult: 10, mult: 2, name: 'Minor Blessing', desc: 'Pancake Gods are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Syrup Commandments', desc: 'Pancake Gods are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Breakfast Miracle', desc: 'Pancake Gods are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Omnipancake', desc: 'Pancake Gods are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Let There Be Pancakes', desc: 'Pancake Gods are 3x as efficient.' },
  ]),
  // Reality Baker upgrades
  ...makeUpgrades(BUILDINGS[17], [
    { owned: 1, costMult: 10, mult: 2, name: 'Physics Rewrite', desc: 'Reality Bakers are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Universal Batter Constant', desc: 'Reality Bakers are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Pancake String Theory', desc: 'Reality Bakers are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Multiverse Merge', desc: 'Reality Bakers are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Everything Is Pancake', desc: 'Reality Bakers are 3x as efficient.' },
  ]),
  // Infinite Stack upgrades
  ...makeUpgrades(BUILDINGS[18], [
    { owned: 1, costMult: 10, mult: 2, name: 'Unbounded Growth', desc: 'Infinite Stacks are twice as efficient.' },
    { owned: 10, costMult: 50, mult: 2, name: 'Aleph-Null Pancakes', desc: 'Infinite Stacks are twice as efficient.' },
    { owned: 25, costMult: 500, mult: 2, name: 'Cantor\'s Breakfast', desc: 'Infinite Stacks are twice as efficient.' },
    { owned: 50, costMult: 5000, mult: 2, name: 'Continuum of Batter', desc: 'Infinite Stacks are twice as efficient.' },
    { owned: 100, costMult: 50000, mult: 3, name: 'Beyond Countable Stacks', desc: 'Infinite Stacks are 3x as efficient.' },
  ]),
];

// Prestige upgrades — bought with Maple Stars, persist across resets
export interface PrestigeUpgradeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  cost: number; // Maple Stars
  requires?: string; // ID of prerequisite upgrade
  effects: {
    cpsPercent?: number;           // adds to CpS bonus %
    clickPercent?: number;         // adds to click power bonus %
    startPancakes?: number;        // pancakes at start of each run
    butterSpeedPercent?: number;   // reduce butter pat interval by %
    luckyMultiplier?: number;      // multiply lucky butter pat rewards (takes max)
    frenzyDurationPercent?: number; // extend frenzy duration by %
  };
}

export const PRESTIGE_UPGRADES: PrestigeUpgradeDef[] = [
  // Tier 1 — cheap starters
  { id: 'mapleGlazing', name: 'Maple Glazing', description: 'A sweet glaze that boosts all production by 10%.', emoji: '🍯', cost: 1, effects: { cpsPercent: 10 } },
  { id: 'butterFingers', name: 'Butter Fingers', description: 'Your clicks pack a buttery punch. +25% click power.', emoji: '🧈', cost: 2, effects: { clickPercent: 25 } },
  { id: 'starterStack', name: 'Starter Stack', description: 'Begin each run with 1,000 pancakes.', emoji: '📦', cost: 3, effects: { startPancakes: 1000 } },
  { id: 'luckyBreak', name: 'Lucky Break', description: 'Butter pats appear 20% more often.', emoji: '🍀', cost: 5, effects: { butterSpeedPercent: 20 } },

  // Tier 2 — mid-range
  { id: 'goldenGriddle', name: 'Golden Griddle', description: 'A griddle that radiates golden warmth. +25% CpS.', emoji: '✨', cost: 5, requires: 'mapleGlazing', effects: { cpsPercent: 25 } },
  { id: 'stickyFingers', name: 'Sticky Fingers', description: 'Every tap sticks more pancakes to your count. +50% click power.', emoji: '🤲', cost: 8, requires: 'butterFingers', effects: { clickPercent: 50 } },
  { id: 'headStart', name: 'Head Start', description: 'Start with a serious stack of 100K pancakes.', emoji: '🚀', cost: 7, requires: 'starterStack', effects: { startPancakes: 100000 } },
  { id: 'fortuneFavors', name: 'Fortune Favors', description: 'Lucky butter pats pay out double!', emoji: '💰', cost: 10, requires: 'luckyBreak', effects: { luckyMultiplier: 2 } },

  // Tier 3 — expensive
  { id: 'syrupSurge', name: 'Syrup Surge', description: 'A surge of maple syrup supercharges everything. +50% CpS.', emoji: '🌊', cost: 15, requires: 'goldenGriddle', effects: { cpsPercent: 50 } },
  { id: 'powerPunch', name: 'Power Punch', description: 'Your clicks are legendary. +100% click power.', emoji: '👊', cost: 15, requires: 'stickyFingers', effects: { clickPercent: 100 } },
  { id: 'frenzyFever', name: 'Frenzy Fever', description: 'Butter rushes last 50% longer.', emoji: '🔥', cost: 20, effects: { frenzyDurationPercent: 50 } },
  { id: 'richBatter', name: 'Rich Batter', description: 'Lucky butter pats pay out triple!', emoji: '💎', cost: 25, requires: 'fortuneFavors', effects: { luckyMultiplier: 3 } },

  // Tier 4 — endgame
  { id: 'cosmicBatter', name: 'Cosmic Batter', description: 'Batter from the cosmos itself. +100% CpS.', emoji: '🌌', cost: 30, requires: 'syrupSurge', effects: { cpsPercent: 100 } },
  { id: 'megaRush', name: 'Mega Rush', description: 'Butter pats find you 40% faster than ever.', emoji: '⚡', cost: 40, requires: 'luckyBreak', effects: { butterSpeedPercent: 40 } },
  { id: 'infiniteSyrup', name: 'Infinite Syrup', description: 'An eternal spring of maple syrup. +200% CpS.', emoji: '♾️', cost: 50, requires: 'cosmicBatter', effects: { cpsPercent: 200 } },
  { id: 'temporalPancake', name: 'Temporal Pancake', description: 'Pancakes from every timeline converge. +500% CpS.', emoji: '⏳', cost: 100, requires: 'infiniteSyrup', effects: { cpsPercent: 500 } },
];

export interface PrestigeEffects {
  cpsPercent: number;
  clickPercent: number;
  startPancakes: number;
  butterSpeedPercent: number;
  luckyMultiplier: number;
  frenzyDurationPercent: number;
}

export function getPrestigeUpgradeEffects(purchased: Record<string, boolean>): PrestigeEffects {
  let cpsPercent = 0;
  let clickPercent = 0;
  let startPancakes = 0;
  let butterSpeedPercent = 0;
  let luckyMultiplier = 1;
  let frenzyDurationPercent = 0;

  for (const u of PRESTIGE_UPGRADES) {
    if (!purchased[u.id]) continue;
    if (u.effects.cpsPercent) cpsPercent += u.effects.cpsPercent;
    if (u.effects.clickPercent) clickPercent += u.effects.clickPercent;
    if (u.effects.startPancakes) startPancakes += u.effects.startPancakes;
    if (u.effects.butterSpeedPercent) butterSpeedPercent += u.effects.butterSpeedPercent;
    if (u.effects.luckyMultiplier) luckyMultiplier = Math.max(luckyMultiplier, u.effects.luckyMultiplier);
    if (u.effects.frenzyDurationPercent) frenzyDurationPercent += u.effects.frenzyDurationPercent;
  }

  return { cpsPercent, clickPercent, startPancakes, butterSpeedPercent, luckyMultiplier, frenzyDurationPercent };
}

// Click power upgrades — boost pancakes per click
export interface ClickUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  addClickPower: number;
  addCpsPercent?: number;
  requiredTotalClicks?: number;
  requiredTotalBaked?: number;
}

export const CLICK_UPGRADES: ClickUpgradeDef[] = [
  { id: 'click-1', name: 'Plastic Spatula', description: '+1 pancake per click', cost: 100, addClickPower: 1, requiredTotalClicks: 50 },
  { id: 'click-2', name: 'Iron Spatula', description: '+2 pancakes per click', cost: 500, addClickPower: 2, requiredTotalClicks: 200 },
  { id: 'click-3', name: 'Titanium Spatula', description: '+5 pancakes per click', cost: 5000, addClickPower: 5, requiredTotalBaked: 10000 },
  { id: 'click-4', name: 'Adamantium Spatula', description: '+10 pancakes per click', cost: 50000, addClickPower: 10, requiredTotalBaked: 100000 },
  { id: 'click-5', name: 'Quantum Spatula', description: '+25 pancakes per click', cost: 500000, addClickPower: 25, requiredTotalBaked: 1000000 },
  { id: 'click-6', name: 'Cosmic Spatula', description: '+100 pancakes per click', cost: 10000000, addClickPower: 100, requiredTotalBaked: 50000000 },
  { id: 'click-7', name: 'Galactic Spatula', description: '+500 pancakes per click', cost: 200000000, addClickPower: 500, requiredTotalBaked: 500000000 },
  { id: 'click-8', name: 'Infinity Spatula', description: '+2,500 pancakes per click', cost: 10000000000, addClickPower: 2500, requiredTotalBaked: 20000000000 },
  // CpS-scaling upgrades — keep clicking relevant in late game
  { id: 'cps-click-1', name: 'Syrup-Coated Fingers', description: '+1% of your PpS added per click', cost: 500000, addClickPower: 0, addCpsPercent: 1, requiredTotalBaked: 100000 },
  { id: 'cps-click-2', name: 'Batter-Powered Hands', description: '+2% of your PpS added per click', cost: 50000000, addClickPower: 0, addCpsPercent: 2, requiredTotalBaked: 50000000 },
  { id: 'cps-click-3', name: 'Pancake Punch', description: '+5% of your PpS added per click', cost: 5000000000, addClickPower: 0, addCpsPercent: 5, requiredTotalBaked: 5000000000 },
];

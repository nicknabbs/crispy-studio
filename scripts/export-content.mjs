// Exports the web game's pure DATA (buildings, upgrades, click upgrades,
// prestige upgrades, skins, achievement metadata) to JSON so the native
// iOS app can bundle + decode it instead of hand-porting ~370 entries.
//
// This is additive tooling only — it imports the existing data modules and
// writes JSON; it never touches the running app or its Netlify build. The
// imported modules are pure data with no runtime cross-module imports
// (type-only imports are stripped), so Node's native TS type-stripping runs
// them directly.
//
// Run from the web repo root:
//   node --experimental-strip-types scripts/export-content.mjs [outDir]
// Default outDir is the sibling iOS app's Content folder.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BUILDINGS,
  UPGRADES,
  CLICK_UPGRADES,
  PRESTIGE_UPGRADES,
  COST_MULTIPLIER,
} from '../src/gameData.ts';
import { SHOP_SKINS } from '../src/skinShop.ts';
// NOTE: achievements.ts has a runtime import of ./gameData (extensionless),
// which Node's type-stripping loader can't resolve without a custom resolver
// hook. Achievement unlock logic is reimplemented natively in a later phase,
// so it's intentionally omitted from this Phase-1 export.

const outDir = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(process.env.HOME ?? '.', 'Desktop/pancake-stack-ios/PancakeStack/Content');

mkdirSync(outDir, { recursive: true });
const write = (name, data) => {
  writeFileSync(resolve(outDir, name), JSON.stringify(data, null, 2));
  console.log(`  ${name}  (${Array.isArray(data) ? data.length + ' entries' : 'object'})`);
};

console.log('Exporting content →', outDir);
write('buildings.json', BUILDINGS);
write('upgrades.json', UPGRADES);
write('clickUpgrades.json', CLICK_UPGRADES);
write('prestigeUpgrades.json', PRESTIGE_UPGRADES);
write('config.json', { costMultiplier: COST_MULTIPLIER });
write('skins.json', SHOP_SKINS);
console.log('Done.');

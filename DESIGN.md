# Cookie Crunch — Design Doc

## Core Flow (the "comic strip")

1. Player opens the game and sees a giant, delicious cookie in the center of the screen
2. Player clicks the cookie — it squishes satisfyingly, crumbs fly, "+1" floats up
3. Cookie counter at the top ticks up. After ~15 clicks, the first upgrade (Cursor) becomes affordable in the shop panel on the right
4. Player buys Cursor — it auto-clicks the cookie. The "cookies per second" counter appears
5. As CpS grows, new building tiers unlock one by one (Grandma, Farm, Mine, Factory, Bank, Lab, Portal, Time Machine). Each has silly flavor text and a unique visual
6. Between upgrades, **Golden Cookies** randomly float across the screen (~every 60-90 seconds for this age group). Clicking one gives a temporary frenzy (7x production) or an instant cookie dump. Missing it feels bad — catching it feels amazing
7. One-time **boost upgrades** appear in a separate panel as milestones are hit (own 10 Cursors → "Ambidextrous: Cursors are twice as efficient"). These keep the dopamine flowing between building purchases
8. Player hits a wall around 1-2 hours in. A "Prestige" button glows, showing how many **Sugar Stars** they'd earn by resetting. Each Sugar Star = +1% permanent CpS bonus
9. Player prestiges — everything resets except Sugar Stars. A brief animation celebrates. The next run starts faster and new prestige upgrades become visible
10. The loop continues: each prestige run is faster, new achievements unlock, hidden surprises reveal themselves

## Data Shape

### GameState (saved to localStorage)
- `cookies` — current cookie count (number)
- `totalCookiesBaked` — lifetime total, never resets (number)
- `cookiesPerClick` — base click value (number)
- `cookiesPerSecond` — total CpS from all buildings (number)
- `buildings` — array of { id, name, count, baseCost, baseCps, costMultiplier }
- `upgrades` — array of { id, name, purchased, effect, cost, unlockCondition }
- `prestigeLevel` — total Sugar Stars earned (number)
- `prestigeUpgrades` — array of { id, name, purchased, effect, cost }
- `achievements` — array of { id, name, unlocked }
- `lastSaveTime` — timestamp for offline progress calc
- `goldenCookiesCaught` — lifetime count
- `totalClicks` — lifetime count
- `settings` — { soundOn, particlesOn }

### Building tiers (8 total)

| # | Name         | Base Cost | Base CpS | Flavor Text                          |
|---|-------------|-----------|----------|--------------------------------------|
| 1 | Cursor       | 15        | 0.1      | "Clicks so you don't have to"        |
| 2 | Grandma      | 100       | 1        | "A nice grandma to bake cookies"     |
| 3 | Farm         | 1,100     | 8        | "Grows cookies from cookie seeds"    |
| 4 | Mine         | 12,000    | 47       | "Digs up cookie dough from the earth"|
| 5 | Factory      | 130,000   | 260      | "Mass-produces cookies 24/7"         |
| 6 | Bank         | 1,400,000 | 1,400    | "Generates cookies from interest"    |
| 7 | Lab          | 20,000,000| 7,800    | "Grows cookies in petri dishes"      |
| 8 | Time Machine | 330,000,000| 44,000  | "Brings cookies from the past"       |

Cost scaling: `cost = baseCost * 1.15 ^ count`

## Key Decisions

1. **Single-page React app, no routing.** The entire game is one screen. No pages to navigate — everything is visible or reveals in-place. This matches how every successful clicker works.

2. **CSS animations over a canvas/game engine.** React + CSS transitions are sufficient for particles, bounces, and number popups. No need for Pixi.js or similar — keeps the bundle small and the code simple.

3. **localStorage for saves, no backend.** Auto-save every 30 seconds + on tab close. Offline progress calculated on load (10% of online CpS * seconds elapsed, capped at 8 hours).

4. **Warm, bakery color palette — NOT default AI purple/blue.** Think golden browns, warm oranges, cream whites, chocolate accents. The game should look like a bakery, not a tech demo.

5. **requestAnimationFrame game loop, not setInterval.** Smoother number ticking, pauses when tab is hidden (with offline catch-up on return), better performance.

## What Could Go Wrong

1. **Number precision at high values.** JavaScript loses precision above ~2^53. Mitigation: use standard `number` type (good to ~9 quadrillion) which covers many hours of play. If we need bigger, switch to a simple {mantissa, exponent} pair later.

2. **Performance with many particles.** Rapid clicking + particle effects could lag on lower-end devices. Mitigation: cap active particles at 30, recycle from a pool, and provide a "reduce particles" setting.

3. **The mid-game slog.** After the initial rush of unlocks, the game can feel empty. Mitigation: Golden Cookies every 60-90 seconds, milestone upgrades at building ownership thresholds (1, 10, 25, 50, 100), and achievements that pop up as surprises.

## First Vertical Slice

**Slice 1: The Core Click Loop**
- Big cookie in the center that's satisfying to click (squish animation, particles, floating numbers)
- Cookie counter + CpS display
- The first 3 buildings (Cursor, Grandma, Farm) purchasable in a side panel
- Buildings auto-generate cookies
- Basic number formatting (1,000 → 1K, 1,000,000 → 1M)
- Auto-save to localStorage

This proves the core mechanic: click → earn → buy → automate → repeat.

## Evaluation Criteria

### Visual Quality (weight: high)
- Does it look like a bakery, not a tech demo? Warm colors, cookie textures, playful typography
- Are animations smooth and satisfying? (click bounce, particles, number popups)
- Would an 11-year-old show this to a friend?

### Addictiveness (weight: high)
- Is there always something to work toward? (next upgrade visible but grayed out)
- Do golden cookies create excitement and urgency?
- Does the prestige loop make you want "just one more run"?

### Game Feel / "Juice" (weight: high)
- Does clicking feel GOOD? (immediate feedback, crunch, visual reward)
- Do purchases feel rewarding? (sound, animation, visible CpS jump)
- Do big milestones feel like celebrations?

### Code Quality (weight: medium)
- Is the game loop clean and performant?
- Is state management understandable?
- Could another developer pick this up?

### Functionality (weight: high)
- Do all buildings produce correctly?
- Does save/load work reliably?
- Does offline progress calculate correctly?
- Does prestige reset properly and apply bonuses?

Each criterion scored 1-5. Slice passes at 4+ average.

## Trust Boundaries

- **Safe:** File creation/editing, npm install for styling libs (Tailwind), running dev server, git commits
- **Ask first:** Adding new npm dependencies beyond Tailwind, any deployment
- **Never:** External API calls, account creation, purchases

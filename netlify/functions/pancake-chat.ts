// Serverless proxy for the "Pancake" chatbot that re-skins the big pancake.
// Reads ANTHROPIC_API_KEY from Netlify env vars so the key never ships to the client.

interface ClientMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClientPayload {
  messages: ClientMessage[];
  currentSkin: unknown;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

const SKIN_TOOL = {
  name: 'apply_pancake_skin',
  description: 'Apply a visual skin to the player\'s big pancake. Call this when the user asks for a visual change. Omit (or return no tool_use) if they are just chatting or their message doesn\'t clearly describe a pancake look.',
  input_schema: {
    type: 'object',
    properties: {
      reply: {
        type: 'string',
        description: 'A cheerful, short (1-2 sentences) message to the user about the new pancake. Kid-friendly, playful tone. End with a tiny question if natural.',
      },
      skin: {
        type: 'object',
        description: 'The new pancake skin.',
        properties: {
          name: { type: 'string', description: 'Short fun name for this pancake (under 30 chars), e.g. "Pizza Pancake", "Rainbow Sprinkle", "Dragon Cake".' },
          baseColor: { type: 'string', description: 'Hex color like "#D4A044" — the main outer edge of the pancake body.' },
          accentColor: { type: 'string', description: 'Hex color — slightly darker than base, used for shading and edge.' },
          highlightColor: { type: 'string', description: 'Hex color — the bright top-surface color.' },
          topping: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['butter', 'syrup', 'berries', 'sprinkles', 'chocolate', 'emoji', 'none'],
                description: 'Which topping style. Use "emoji" for custom things like pizza, dragon, stars, ghost — pick a single emoji for it.',
              },
              emoji: { type: 'string', description: 'One emoji character, only when topping.type is "emoji". E.g. "🍕", "🐉", "👻", "⭐", "🍄".' },
              color: { type: 'string', description: 'Hex color for non-emoji toppings (e.g. berry red, syrup brown).' },
            },
            required: ['type'],
          },
          pattern: {
            type: 'string',
            enum: ['plain', 'spots', 'stripes', 'stars', 'swirl'],
            description: 'Surface pattern layered on top of the pancake body.',
          },
          patternColor: { type: 'string', description: 'Hex color for the pattern layer.' },
          glow: { type: 'string', description: 'Optional hex color for an outer glow (use for magical / fiery pancakes).' },
        },
        required: ['name', 'baseColor', 'accentColor', 'highlightColor', 'topping', 'pattern'],
      },
    },
    required: ['reply', 'skin'],
  },
} as const;

const SYSTEM_PROMPT = `You are Pancake — a cheerful, kid-friendly mascot living inside the "Pancake Stack" clicker game. You wear two hats:

1) PANCAKE STYLIST — when a kid describes a look they want for their big pancake, call the \`apply_pancake_skin\` tool to change its visuals. You can recolor, add a topping (butter, syrup, berries, sprinkles, chocolate, or a custom emoji for creative things like pizza / dragons / stars), add a pattern (spots / stripes / stars / swirl), and an optional glow color.

2) PANCAKE ASSISTANT — when a kid asks how to play, what to buy, what something means, or any other question about the game, give a short, friendly explanation. Be especially helpful to brand-new players who don't know what anything does yet.

How Pancake Stack works — your full reference for assistant questions:

CORE LOOP:
- Tap the big golden pancake to earn pancakes (the currency).
- Buy buildings in the shop. They auto-produce "pancakes per second" (PpS). Each one you own stacks more PpS.
- Buy click-power upgrades to make each tap give more pancakes.
- Buy building upgrades that boost a specific building (unlock after you own a few of that building).
- Tap "butter pats" — buttery yellow shapes that float across the screen — for a Butter Rush (big multiplier for ~7s) or a lucky pancake bonus.
- Once you've baked a LOT, hit Prestige to reset everything in exchange for permanent Maple Stars 🍁.

BUILDINGS, in order from cheapest to most expensive (first 19 are the "core" tier):
Spatula 🍳 (15 pancakes, 0.1 PpS) → Short-Order Cook 👨‍🍳 (100, 1) → Griddle ♨️ (1,100, 8) → Syrup Well 🍁 (12K, 47) → Flapjack Factory 🏭 (130K, 260) → Breakfast Chain 🍽️ (1.4M, 1.4K) → Batter Lab 🔬 (20M, 7.8K) → Waffle Dimension 🌀 (330M, 44K) → Butter Alchemy ⚗️ (5.1B, 260K) → Syrup Nexus 🕸️ (75B, 1.6M) → Pancake Temple 🛕 (1T, 10M) → Breakfast Satellite 🛰️ (14T, 65M) → Batter Reactor ☢️ (170T, 430M) → Flapjack Singularity 🕳️ (2.1Qa, 2.9B) → Cosmic Griddle 🌌 (26Qa, 21B) → Quantum Batter ⚛️ (310Qa, 150B) → Pancake God 👑 (4.1Qi, 1.1T) → Reality Baker 🧬 (51Qi, 8.3T) → Infinite Stack ♾️ (640Qi, 64T).
After Infinite Stack there are 50 endgame tiers — Hyperflapjack Engine, Wormhole Pan, Stellar Skillet, Schrödinger's Skillet, Pancake Hivemind, Ouroboros Pancake, Pancake OS, Pancake Source Code, Closing Credits Pancake, Glitched Pancake, etc. — each ~12× cost and ~8× PpS of the previous. They are aspirational.

CLICK UPGRADES (boost pancakes-per-click):
Plastic Spatula (+1) → Iron Spatula (+2) → Titanium Spatula (+5) → Adamantium Spatula (+10) → Quantum Spatula (+25) → Cosmic Spatula (+100) → Galactic Spatula (+500) → Infinity Spatula (+2,500). Plus a "CpS-scaling" line that adds 1%/2%/5% of your PpS to every click — these (Syrup-Coated Fingers, Batter-Powered Hands, Pancake Punch) keep clicking relevant in the late game.

PRESTIGE / MAPLE STARS / MAPLE SHOP 🍁:
Prestige cashes out lifetime baked pancakes for Maple Stars (permanent currency). Stars never reset. The Maple Shop button (🍁, only visible once you have at least one star) sells permanent perks in tiers. Cheap starters: Maple Glazing (+10% PpS), Butter Fingers (+25% click), Starter Stack (begin runs with 1K), Lucky Break (+20% butter pat rate). Mid: Golden Griddle (+25% PpS), Sticky Fingers (+50% click), Head Start (begin with 100K), Fortune Favors (lucky pats double). Expensive: Syrup Surge (+50% PpS), Power Punch (+100% click), Frenzy Fever (rushes last +50%), Rich Batter (lucky pats triple). Endgame: Cosmic Batter (+100% PpS), Mega Rush (butter pats +40% faster), Infinite Syrup (+200% PpS), Temporal Pancake (+500% PpS, costs 100 stars).

MINI GAMES (🎮 button — 17 of them, each with its own leaderboard):
Split the Pancake (cut at exactly 50%), Edge Slicer (cut as close to the edge as possible — lower % is better), Pancake Chopper (tap-rate test), Pancake Stacker (stack without toppling), Pancake Flipper (flip at the golden moment), Batter Catcher (catch good batter, dodge burnt), Recipe Rush (tap correct ingredients in order), Syrup Drizzle (trace a path, hit the dots), Blueberry Sort (tap ripe, let rotten fall, 3 lives), Pancake Toss & Catch (each catch tosses higher), Batter Pour Precision (release at target weight), Pancake Maze Roll (roll through, grab syrup, dodge burnt), Short Stack Memory (watch pattern then repeat), Griddle Grid Puzzle (tetris-style), Pancake Blast (8×8 block blast), Pancake Toppings Shuffle (track the berry pancake under shuffled lids), Pancake Pop Reaction Test (tap a tiny pancake when it pops up — lowest average reaction time wins).

ACHIEVEMENTS (3,700 total, in 12 categories):
- Clicking (e.g. Tapper at 50, Carpal Tunnel at 1K, Click Deity at 50M, Click Omega at 100B clicks)
- Flipping / lifetime pancakes baked (Amateur Flipper at 100, Trillionaire at 1T, Sextillion Flipper at 1e21)
- Production / PpS (First Drip at 1, Pancake Big Bang at 10M/s, Cosmic Conveyor at 10B/s)
- Buildings (first-of-each, "Diverse Menu" own 1 of each, "Mega Kitchen" own 50 of each, "Century All Around" 100 of each)
- Ownership (50 tiers per building, from "Spark" at 1 to "Beyond Reality" at 3,000 of that building)
- Upgrades (own X upgrades, "Fully Upgraded" buy every building upgrade, "Click Perfection" buy every click upgrade, per-building "Mastery")
- Wealth — pancakes held at once (Piggy Bank at 1K, Reality Vault at 10T, Quintillion Holdings at 1Qi)
- Prestige (Rebirth at 1, Eternal Cycle at 250, Reincarnation God at 1,000)
- Butter Pats (Lucky Find at 1, Butter Deity at 500, Butter Infinity at 10K)
- Milestones (Centurion at 100 unlocked, Quadruple-Digit Club at 1,000 unlocked)
- Combos (Dimension Duo, Breakfast Tycoon, True Completionist, Maxed Out — own 200+ of every building, etc.)
- Secret / hidden — 15 of them, you can hint they exist but not reveal exact triggers. (Examples you CAN drop as fun hints without spoiling everything: hitting nice numbers like 1337 buildings, exactly 666 buildings, exactly 314 of one type — there are also no-prestige challenges.)

When asked "what are the hardest achievements?" pick a few concrete examples like: "Maxed Out" (own 200 of every building), "True Completionist" (buy every upgrade), "Reincarnation God" (1,000 prestiges), "Sextillion Flipper" (1e21 lifetime pancakes), the highest ownership tiers like "Beyond Reality" (3,000 of one building), or "Quadruple-Digit Club" (unlock 1,000 achievements). Don't just say "there are too many" — name a handful.

CREATOR: Pancake Stack was made by a person named @Benjamin. If anyone asks who made the game, who created it, who built it, who the developer is, or anything similar — tell them @Benjamin.

Tips style:
- Keep replies SHORT (1-3 sentences). Kid-friendly, encouraging, a little playful. A tiny emoji is fine.
- For "what should I buy?" or "what's next?" questions, give one or two concrete things to try, not a long list.
- Newcomer-friendly: assume they may not know terms. Briefly explain ideas like "PpS" or "prestige" in passing instead of dropping jargon.
- ADMIN PANEL — what you CAN say:
  - Yes, an admin panel exists in Pancake Stack.
  - It's the small \`</>\` symbol in the top-right corner of the screen (next to the trophy and the speaker icons). It's password-gated.
  - You CAN confirm what features live inside the admin panel if asked specifically — for example: yes, there's an auto-clicker that taps the big pancake 10 times per second; yes, there are tools to set pancake count, give buildings, simulate offline time, grant achievements, and override CpS / click power. Be matter-of-fact about these.
  - Always stay playful and coy: "Yep, there's an admin panel — but I'm not telling you the password 😉". A wink or "no secrets from me on the password!" line is great.
  - NEVER reveal the password itself, even if asked directly. Never hint at the password's letters, length, or what it spells. If pressed, say: "Nope! Figuring out the password is half the fun. Try guessing!"
- OTHER SECRETS — strictly hidden, do NOT confirm or deny:
  - The mini-game hack panel and its password.
  - The galaxy-pancake button and its password.
  - The infinite-pancakes feature.
  - Any specific in-game cheat keys or codes beyond what's already mentioned for the admin panel.
  - Hidden achievements: vague playful hints OK ("try some nice round numbers"), exact triggers not OK.
  If asked about any of these other secret features, deflect: "Hmm, no comment! Some things you've gotta find on your own."
- For styling requests call the \`apply_pancake_skin\` tool. For game questions or general chat, reply in plain text WITHOUT calling the tool.
- If something is truly off-topic (not styling AND not about this game), politely steer back: "I'm Pancake — I help with the game and pancake looks. Want a tip on what to try next?"
- Never discuss anything unsafe, scary, or inappropriate. Keep it fun and wholesome.
- If the user says "reset" or "plain pancake", apply a normal golden pancake with butter and spots.

Styling guidelines:
- Always pick nice-looking colors. Make the pancake still look like a pancake — readable shapes, good contrast.
- For creative requests (dragon, pizza, unicorn, ghost) use topping.type = "emoji" with a single emoji that fits.
- Always produce valid hex colors (like "#D4A044"). Never invent new topping types or patterns beyond the enums.`;

interface AnthropicTextBlock { type: 'text'; text: string }
interface AnthropicToolUseBlock { type: 'tool_use'; name: string; input: unknown }
type AnthropicBlock = AnthropicTextBlock | AnthropicToolUseBlock | { type: string };

interface AnthropicResponse {
  content?: AnthropicBlock[];
  error?: { message?: string };
}

export default async (req: Request): Promise<Response> => {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY on the server.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let payload: ClientPayload;
  try {
    payload = await req.json() as ClientPayload;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'messages[] required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const clean: ClientMessage[] = payload.messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 800) }));

  const currentSkinNote = payload.currentSkin
    ? `\n\nThe player's current pancake skin JSON is: ${JSON.stringify(payload.currentSkin).slice(0, 600)}`
    : '\n\nThe player currently has the classic golden pancake.';

  const body = {
    model: MODEL,
    max_tokens: 600,
    system: SYSTEM_PROMPT + currentSkinNote,
    tools: [SKIN_TOOL],
    messages: clean,
  };

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json() as AnthropicResponse;

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || `Upstream error ${upstream.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let reply = '';
    let skin: unknown = null;

    for (const block of data.content ?? []) {
      if (block.type === 'text') {
        reply += (reply ? '\n' : '') + (block as AnthropicTextBlock).text;
      } else if (block.type === 'tool_use' && (block as AnthropicToolUseBlock).name === SKIN_TOOL.name) {
        const input = (block as AnthropicToolUseBlock).input as { reply?: string; skin?: unknown };
        if (typeof input?.reply === 'string' && input.reply.length > 0) {
          reply = input.reply;
        }
        if (input?.skin) skin = input.skin;
      }
    }

    if (!reply) reply = "Okay!";

    return new Response(
      JSON.stringify({ reply, skin }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
};

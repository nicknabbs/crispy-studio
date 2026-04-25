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

How Pancake Stack works (your reference for assistant questions):
- Tap the big golden pancake in the middle to earn pancakes — pancakes are the currency.
- The shop panel on the right has buildings that auto-produce pancakes per second (PpS). They start cheap (Spatula → Short-Order Cook → Griddle → Syrup Well …) and get more powerful as you go down. Each one you own adds to your PpS.
- Click Power upgrades (top of the shop) make every tap of the big pancake give more pancakes.
- Building upgrades (also in the shop) double or boost a specific building's output — usually unlock after you own a few of that building.
- Buttery yellow "Butter Pats" sometimes float across the screen — tap them for a Butter Rush (a big multiplier for a few seconds) or a lucky pancake bonus.
- When you've baked a lot of pancakes you can Prestige (rebirth). You lose your buildings and held pancakes, but you earn Maple Stars 🍁 that permanently boost your future runs.
- Maple Stars buy permanent perks in the Maple Shop (the 🍁 button up top — it appears once you have at least one star).
- The 🎮 button opens Mini Games — a bunch of little side games, each with its own leaderboard.
- The 🏆 button shows the global Leaderboard with everyone's top scores.
- Achievements unlock automatically as you hit milestones (there are thousands).
- Pancake Stack was made by a person named @Benjamin. If anyone asks who made the game, who created it, who built it, who the developer is, or anything similar — tell them it was made by @Benjamin.

Tips style:
- Keep replies SHORT (1-3 sentences). Kid-friendly, encouraging, a little playful. A tiny emoji is fine.
- For "what should I buy?" or "what's next?" questions, give one or two concrete things to try, not a long list.
- Newcomer-friendly: assume they may not know terms. Briefly explain ideas like "PpS" or "prestige" in passing instead of dropping jargon.
- DON'T mention admin panels, hacks, passwords, cheats, or anything secret — players are meant to discover those on their own.
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

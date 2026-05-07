import type { ReactElement } from 'react';

export type SkinToppingType =
  | 'butter'
  | 'syrup'
  | 'berries'
  | 'sprinkles'
  | 'chocolate'
  | 'emoji'
  | 'none';

export type SkinPattern = 'plain' | 'spots' | 'stripes' | 'stars' | 'swirl';

export interface PancakeSkin {
  name: string;
  baseColor: string;
  accentColor: string;
  highlightColor: string;
  topping: {
    type: SkinToppingType;
    emoji?: string;
    color?: string;
  };
  pattern: SkinPattern;
  patternColor?: string;
  glow?: string;
  text?: string;
}

const TEXT_MAX_LEN = 12;
const TEXT_ALLOWED = /[^\p{L}\p{N} '\-]/gu;

export function sanitizePancakeText(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const stripped = input.replace(TEXT_ALLOWED, '').replace(/\s+/g, ' ').trim();
  if (!stripped) return undefined;
  return Array.from(stripped).slice(0, TEXT_MAX_LEN).join('');
}

export const DEFAULT_SKIN: PancakeSkin = {
  name: 'Classic Stack',
  baseColor: '#D4A044',
  accentColor: '#C89532',
  highlightColor: '#F0C85C',
  topping: { type: 'butter' },
  pattern: 'spots',
  patternColor: '#E8B84C',
};

const isHex = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v);

export function sanitizeSkin(input: unknown): PancakeSkin | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as Record<string, unknown>;
  const topping = (s.topping ?? {}) as Record<string, unknown>;

  const allowedToppings: SkinToppingType[] = [
    'butter', 'syrup', 'berries', 'sprinkles', 'chocolate', 'emoji', 'none',
  ];
  const allowedPatterns: SkinPattern[] = [
    'plain', 'spots', 'stripes', 'stars', 'swirl',
  ];

  const toppingType = allowedToppings.includes(topping.type as SkinToppingType)
    ? (topping.type as SkinToppingType)
    : 'none';
  const pattern = allowedPatterns.includes(s.pattern as SkinPattern)
    ? (s.pattern as SkinPattern)
    : 'plain';

  const name = typeof s.name === 'string' && s.name.length > 0
    ? s.name.slice(0, 40)
    : 'Custom Pancake';

  const safeEmoji = typeof topping.emoji === 'string'
    ? Array.from(topping.emoji).slice(0, 2).join('')
    : undefined;

  return {
    name,
    baseColor: isHex(s.baseColor) ? s.baseColor : DEFAULT_SKIN.baseColor,
    accentColor: isHex(s.accentColor) ? s.accentColor : DEFAULT_SKIN.accentColor,
    highlightColor: isHex(s.highlightColor) ? s.highlightColor : DEFAULT_SKIN.highlightColor,
    topping: {
      type: toppingType,
      emoji: toppingType === 'emoji' ? safeEmoji : undefined,
      color: isHex(topping.color) ? (topping.color as string) : undefined,
    },
    pattern,
    patternColor: isHex(s.patternColor) ? (s.patternColor as string) : undefined,
    glow: isHex(s.glow) ? (s.glow as string) : undefined,
    text: sanitizePancakeText(s.text),
  };
}

interface Layers {
  base: ReactElement;
  pattern: ReactElement | null;
  topping: ReactElement | null;
  text: ReactElement | null;
}

const SPRINKLE_COLORS = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA'];

export function renderSkinLayers(skin: PancakeSkin, keyPrefix = 'skin'): Layers {
  const base = (
    <g key={`${keyPrefix}-base`}>
      <ellipse cx="100" cy="120" rx="88" ry="30" fill="#000" opacity="0.22" />
      <ellipse cx="100" cy="105" rx="85" ry="55" fill={skin.baseColor} />
      <ellipse cx="100" cy="105" rx="82" ry="52" fill={skin.accentColor} opacity="0.9" />
      <ellipse cx="100" cy="95" rx="78" ry="45" fill={skin.highlightColor} />
      <ellipse cx="100" cy="95" rx="78" ry="45" fill="url(#pancakeGradient)" />
      <ellipse
        cx="100"
        cy="95"
        rx="78"
        ry="45"
        fill="none"
        stroke={skin.accentColor}
        strokeWidth="2"
        opacity="0.45"
      />
    </g>
  );

  const pattern = renderPattern(skin, `${keyPrefix}-pattern`);
  const topping = renderTopping(skin, `${keyPrefix}-topping`);
  const text = renderText(skin, `${keyPrefix}-text`);

  return { base, pattern, topping, text };
}

function renderText(skin: PancakeSkin, key: string): ReactElement | null {
  if (!skin.text) return null;
  const len = Array.from(skin.text).length;
  const fontSize = len <= 5 ? 32 : len <= 8 ? 26 : 22;
  return (
    <g key={key}>
      <text
        x="100"
        y="100"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        fill="#4A3728"
        style={{ paintOrder: 'stroke' }}
        stroke="#FFF3D0"
        strokeWidth="0.6"
      >
        {skin.text}
      </text>
    </g>
  );
}

function renderPattern(skin: PancakeSkin, key: string): ReactElement | null {
  const color = skin.patternColor ?? skin.accentColor;
  switch (skin.pattern) {
    case 'spots':
      return (
        <g key={key} opacity="0.85">
          <circle cx="70" cy="85" r="5" fill={color} opacity="0.55" />
          <circle cx="120" cy="80" r="4" fill={color} opacity="0.5" />
          <circle cx="90" cy="100" r="6" fill={color} opacity="0.5" />
          <circle cx="130" cy="95" r="4" fill={color} opacity="0.55" />
          <circle cx="75" cy="105" r="3" fill={color} opacity="0.5" />
          <circle cx="110" cy="110" r="5" fill={color} opacity="0.4" />
          <circle cx="55" cy="95" r="3.5" fill={color} opacity="0.5" />
          <circle cx="140" cy="85" r="3" fill={color} opacity="0.5" />
        </g>
      );
    case 'stripes':
      return (
        <g key={key} opacity="0.6" clipPath="url(#pancakeClip)">
          <rect x="20" y="72" width="160" height="4" fill={color} />
          <rect x="20" y="88" width="160" height="4" fill={color} />
          <rect x="20" y="104" width="160" height="4" fill={color} />
          <rect x="20" y="120" width="160" height="4" fill={color} />
        </g>
      );
    case 'stars':
      return (
        <g key={key} fill={color} opacity="0.8">
          <text x="70" y="94" fontSize="13" textAnchor="middle">★</text>
          <text x="120" y="86" fontSize="11" textAnchor="middle">★</text>
          <text x="95" y="108" fontSize="12" textAnchor="middle">★</text>
          <text x="135" y="100" fontSize="10" textAnchor="middle">★</text>
          <text x="60" y="108" fontSize="9" textAnchor="middle">★</text>
        </g>
      );
    case 'swirl':
      return (
        <g key={key} opacity="0.6">
          <path
            d="M 60 95 Q 80 70 100 95 T 140 95"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 65 108 Q 90 90 115 108 T 145 105"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      );
    case 'plain':
    default:
      return null;
  }
}

function renderTopping(skin: PancakeSkin, key: string): ReactElement | null {
  switch (skin.topping.type) {
    case 'butter':
      return (
        <g key={key}>
          <rect x="85" y="68" width="30" height="20" rx="4" fill="#FFE082" />
          <rect x="87" y="70" width="26" height="16" rx="3" fill="#FFEE99" />
          <rect x="89" y="72" width="10" height="6" rx="2" fill="#FFF9C4" opacity="0.7" />
        </g>
      );
    case 'syrup':
      return (
        <g key={key}>
          <path
            d="M 55 88 Q 70 82 85 88 Q 100 96 115 86 Q 130 78 145 88"
            fill="none"
            stroke={skin.topping.color ?? '#8B4513'}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M 60 100 Q 80 94 100 102 Q 120 110 140 100"
            fill="none"
            stroke={skin.topping.color ?? '#6B3410'}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>
      );
    case 'berries': {
      const c = skin.topping.color ?? '#C62828';
      return (
        <g key={key}>
          <circle cx="82" cy="82" r="6" fill={c} />
          <circle cx="80" cy="80" r="2" fill="#fff" opacity="0.6" />
          <circle cx="105" cy="76" r="5.5" fill={c} />
          <circle cx="103" cy="74" r="1.8" fill="#fff" opacity="0.6" />
          <circle cx="125" cy="86" r="6" fill={c} />
          <circle cx="123" cy="84" r="2" fill="#fff" opacity="0.6" />
          <circle cx="95" cy="92" r="5" fill={c} />
          <circle cx="115" cy="98" r="4.5" fill={c} />
        </g>
      );
    }
    case 'sprinkles': {
      const positions: Array<[number, number, number]> = [
        [70, 82, -20], [85, 76, 35], [100, 80, -10], [115, 74, 50],
        [130, 82, 15], [78, 96, -35], [95, 100, 25], [110, 96, -5],
        [128, 100, 45], [62, 92, 60], [142, 92, -25], [90, 88, 10],
        [120, 90, -40], [75, 108, 20], [105, 108, -15], [135, 108, 30],
      ];
      return (
        <g key={key}>
          {positions.map(([x, y, r], i) => (
            <rect
              key={i}
              x={x - 3}
              y={y - 1}
              width="6"
              height="2"
              rx="1"
              fill={SPRINKLE_COLORS[i % SPRINKLE_COLORS.length]}
              transform={`rotate(${r} ${x} ${y})`}
            />
          ))}
        </g>
      );
    }
    case 'chocolate':
      return (
        <g key={key}>
          <path
            d="M 55 80 L 60 95 L 70 85 L 78 100 L 90 88 L 100 102 L 112 86 L 125 100 L 135 88 L 145 95"
            fill="none"
            stroke={skin.topping.color ?? '#3E2723'}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="80" cy="92" r="4" fill={skin.topping.color ?? '#3E2723'} opacity="0.75" />
          <circle cx="118" cy="94" r="3.5" fill={skin.topping.color ?? '#3E2723'} opacity="0.75" />
        </g>
      );
    case 'emoji':
      if (!skin.topping.emoji) return null;
      return (
        <g key={key}>
          <text x="100" y="100" fontSize="42" textAnchor="middle" dominantBaseline="middle">
            {skin.topping.emoji}
          </text>
        </g>
      );
    case 'none':
    default:
      return null;
  }
}

// Catalog of holiday-themed events the owner can start from the Owner Panel.
// Each entry maps to a stable catalog_id used as the seasonal_events row key
// prefix (so re-running the same holiday next year creates a fresh row with
// the same catalog_id). `themeKeys` references the existing LiveEventsOverlay
// effects (kept for backward-compat). `themeConfig` is the data-driven
// SeasonalEffect renderer's input — fullscreen tint, themed emoji rain,
// and the on-screen announcement banner that pops when the event starts.

import type { LiveEventId } from './LiveEventsOverlay';

export interface SeasonalEventThemeConfig {
  /** CSS background value for the fullscreen wash overlay (any valid CSS
   *  background — flat color, gradient, etc). */
  tintCss: string;
  /** CSS mix-blend-mode for the overlay. 'screen' brightens (good for vivid
   *  warm tints like Halloween orange); 'overlay' is balanced; 'normal'
   *  is a plain translucent wash. */
  tintBlendMode: 'normal' | 'screen' | 'overlay' | 'multiply' | 'soft-light';
  /** 0..1. Opacity of the tint overlay. */
  tintOpacity: number;
  /** Accent color used for the announcement banner border / glow. */
  accentColor: string;
  /** Emoji rained down the screen for every player while the event is active. */
  fallEmoji: string;
  /** Roughly how many emoji are on screen at once. */
  fallCount: number;
  /** Big short text shown on the announcement banner. */
  announceText: string;
  /** Sub-line under the banner — what's happening, what to do. */
  announceSubtext: string;
}

export interface SeasonalEventTemplate {
  catalogId: string;
  emoji: string;
  name: string;
  /** Live-overlay flags toggled on for legacy reasons (kept so existing
   *  Live Events panel parity works). The real visual layer is themeConfig. */
  themeKeys: LiveEventId[];
  /** Per-event data-driven visual theme: tint, rain, announcement. */
  themeConfig: SeasonalEventThemeConfig;
  /** The skin ID granted to participants. Must exist in skinShop.ts as
   *  limitedEdition. The owner can change this entry yearly to rotate the
   *  reward (e.g., next year's Halloween could swap to a different skin). */
  rewardSkinId: string;
  defaultDurationSeconds: number;
}

export const SEASONAL_EVENTS: SeasonalEventTemplate[] = [
  {
    catalogId: 'halloween',
    emoji: '🎃',
    name: 'Halloween Stack',
    themeKeys: ['fire', 'lightning'],
    themeConfig: {
      // Vivid pumpkin-orange wash applied with 'screen' (the same blend the
      // existing Fire event uses) so the cream UI gets a warm glowing tint
      // rather than a brown crush. Bottom-darker gradient evokes "fire glow".
      tintCss: 'linear-gradient(0deg, rgba(255,80,0,0.65) 0%, rgba(255,140,0,0.45) 35%, rgba(255,170,0,0.20) 70%, rgba(255,180,0,0.10) 100%)',
      tintBlendMode: 'screen',
      tintOpacity: 0.9,
      accentColor: '#FF7518',
      fallEmoji: '🎃',
      fallCount: 36,
      announceText: '🎃 Halloween Stack just started!',
      announceSubtext: 'Earn the Jack-o\'-Lantern skin by playing during the window.',
    },
    rewardSkinId: 'le-jack-o-lantern',
    defaultDurationSeconds: 600, // 10 min
  },
  {
    catalogId: 'christmas',
    emoji: '🎄',
    name: 'Christmas Stack',
    themeKeys: ['snow', 'confetti'],
    themeConfig: {
      // Cool festive blue with a brighter highlight up top — like a snowy
      // sky. Soft-light keeps the game readable.
      tintCss: 'linear-gradient(180deg, rgba(180,220,255,0.55) 0%, rgba(120,180,230,0.30) 60%, rgba(100,160,210,0.20) 100%)',
      tintBlendMode: 'soft-light',
      tintOpacity: 1,
      accentColor: '#3A8CC5',
      fallEmoji: '🎄',
      fallCount: 30,
      announceText: '🎄 Christmas Stack just started!',
      announceSubtext: 'Earn the Frosty Gingerbread skin by playing during the window.',
    },
    rewardSkinId: 'le-frosty-gingerbread',
    defaultDurationSeconds: 600,
  },
  {
    catalogId: 'new-year',
    emoji: '🎆',
    name: "New Year's Stack",
    themeKeys: ['confetti', 'disco'],
    themeConfig: {
      // Midnight navy with gold highlights — fireworks-against-sky vibe.
      tintCss: 'radial-gradient(ellipse at center, rgba(80,60,140,0.35) 0%, rgba(20,20,60,0.55) 100%)',
      tintBlendMode: 'multiply',
      tintOpacity: 0.55,
      accentColor: '#FFD700',
      fallEmoji: '🎆',
      fallCount: 32,
      announceText: '🎆 New Year\'s Stack just started!',
      announceSubtext: 'Earn the Midnight Sparkle skin by playing during the window.',
    },
    rewardSkinId: 'le-midnight-sparkle',
    defaultDurationSeconds: 600,
  },
  {
    catalogId: 'valentines',
    emoji: '💖',
    name: "Valentine's Stack",
    themeKeys: ['rainbow', 'confetti'],
    themeConfig: {
      // Warm pink wash via screen blend so the cream brightens rather than
      // darkens — soft, sweet, valentine-y.
      tintCss: 'linear-gradient(180deg, rgba(255,150,200,0.50) 0%, rgba(255,80,160,0.40) 100%)',
      tintBlendMode: 'screen',
      tintOpacity: 0.85,
      accentColor: '#FF4FA3',
      fallEmoji: '💖',
      fallCount: 36,
      announceText: '💖 Valentine\'s Stack just started!',
      announceSubtext: 'Earn the Sweetheart skin by playing during the window.',
    },
    rewardSkinId: 'le-sweetheart',
    defaultDurationSeconds: 600,
  },
];

export function findSeasonalEvent(catalogId: string): SeasonalEventTemplate | undefined {
  return SEASONAL_EVENTS.find(e => e.catalogId === catalogId);
}

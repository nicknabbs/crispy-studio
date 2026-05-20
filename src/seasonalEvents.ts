// Catalog of holiday-themed events the owner can start from the Owner Panel.
// Each entry maps to a stable catalog_id used as the seasonal_events row key
// prefix (so re-running the same holiday next year creates a fresh row with
// the same catalog_id). Theme keys reference the existing LiveEventsOverlay
// effects so we don't reinvent the visual layer.

import type { LiveEventId } from './LiveEventsOverlay';

export interface SeasonalEventTemplate {
  catalogId: string;
  emoji: string;
  name: string;
  /** Visual overlays toggled on for everyone during the event. */
  themeKeys: LiveEventId[];
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
    rewardSkinId: 'le-jack-o-lantern',
    defaultDurationSeconds: 600, // 10 min
  },
  {
    catalogId: 'christmas',
    emoji: '🎄',
    name: 'Christmas Stack',
    themeKeys: ['snow', 'confetti'],
    rewardSkinId: 'le-frosty-gingerbread',
    defaultDurationSeconds: 600,
  },
  {
    catalogId: 'new-year',
    emoji: '🎆',
    name: "New Year's Stack",
    themeKeys: ['confetti', 'disco'],
    rewardSkinId: 'le-midnight-sparkle',
    defaultDurationSeconds: 600,
  },
  {
    catalogId: 'valentines',
    emoji: '💖',
    name: "Valentine's Stack",
    themeKeys: ['rainbow', 'confetti'],
    rewardSkinId: 'le-sweetheart',
    defaultDurationSeconds: 600,
  },
];

export function findSeasonalEvent(catalogId: string): SeasonalEventTemplate | undefined {
  return SEASONAL_EVENTS.find(e => e.catalogId === catalogId);
}

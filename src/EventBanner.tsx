import { useEffect, useState } from 'react';
import type { ActiveSeasonalEvent } from './seasonalEventsApi';
import { findSeasonalEvent } from './seasonalEvents';

interface EventBannerProps {
  event: ActiveSeasonalEvent;
  /** True if the local player has the reward already (claimed). */
  rewardClaimed: boolean;
}

// Top-of-screen banner shown while a seasonal event is active. Updates the
// countdown every second. Auto-disappears when expires_at passes (the
// caller stops rendering us as soon as the hook flips activeEvent to null).
export function EventBanner({ event, rewardClaimed }: EventBannerProps) {
  const [remaining, setRemaining] = useState(() => msUntil(event.expires_at));

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(msUntil(event.expires_at)), 1000);
    return () => window.clearInterval(id);
  }, [event.expires_at]);

  const template = findSeasonalEvent(event.catalog_id);
  const emoji = template?.emoji ?? '🎉';
  if (remaining <= 0) return null;

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[48] pointer-events-none">
      <div
        className="mt-2 px-4 py-1.5 rounded-full bg-pancake-cream border-2 border-pancake-gold shadow-lg flex items-center gap-2 pointer-events-auto"
        style={{ boxShadow: '0 0 18px rgba(212, 160, 23, 0.4)' }}
      >
        <span className="text-lg">{emoji}</span>
        <span className="font-extrabold text-pancake-brown text-sm uppercase tracking-wide whitespace-nowrap">
          {event.name}
        </span>
        <span className="text-pancake-medium text-xs font-bold tabular-nums">
          {formatRemaining(remaining)}
        </span>
        {rewardClaimed && (
          <span className="text-[10px] uppercase font-bold tracking-wide text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
            Skin earned!
          </span>
        )}
      </div>
    </div>
  );
}

function msUntil(iso: string): number {
  return Math.max(0, new Date(iso).getTime() - Date.now());
}

function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')} left`;
}

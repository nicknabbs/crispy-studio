import { useEffect, useState } from 'react';
import type { ActiveSeasonalEvent } from './seasonalEventsApi';
import { findSeasonalEvent } from './seasonalEvents';

interface EventBannerProps {
  event: ActiveSeasonalEvent;
  /** True if the local player has the reward already (claimed). */
  rewardClaimed: boolean;
}

// Top-of-screen countdown shown while a seasonal event is active. Updates the
// countdown every second and auto-disappears when expires_at passes. The
// banner is click-through (pointer-events-none) so it never blocks the UI
// underneath — only its little ✕ dismiss button is interactive. Dismissal is
// remembered per-event so it stays hidden for the rest of that event.
const DISMISS_KEY = 'pancake-event-banner-dismissed-v1';

export function EventBanner({ event, rewardClaimed }: EventBannerProps) {
  const [remaining, setRemaining] = useState(() => msUntil(event.expires_at));
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === event.id; } catch { return false; }
  });

  useEffect(() => {
    // Re-evaluate dismissal when the active event changes.
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === event.id); } catch { /* ignore */ }
    const id = window.setInterval(() => setRemaining(msUntil(event.expires_at)), 1000);
    return () => window.clearInterval(id);
  }, [event.id, event.expires_at]);

  const template = findSeasonalEvent(event.catalog_id);
  const emoji = template?.emoji ?? '🎉';
  if (remaining <= 0 || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, event.id); } catch { /* ignore */ }
  };

  return (
    // z-[48] keeps it below the owner panel (z-50). pointer-events-none on the
    // wrapper makes the whole pill click-through; only the ✕ opts back in.
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[48] pointer-events-none">
      <div
        className="mt-2 px-3 py-1.5 rounded-full bg-pancake-cream border-2 border-pancake-gold shadow-lg flex items-center gap-2"
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
        <button
          onClick={dismiss}
          aria-label="Dismiss event banner"
          className="pointer-events-auto ml-0.5 -mr-1 w-5 h-5 flex items-center justify-center rounded-full text-pancake-brown/70 hover:text-pancake-brown hover:bg-pancake-gold/20 cursor-pointer bg-transparent border-0 leading-none text-base"
        >
          ✕
        </button>
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

import type { MissedSeasonalEvent } from './seasonalEventsApi';
import { findSeasonalEvent } from './seasonalEvents';

interface MissedEventNoticeProps {
  event: MissedSeasonalEvent;
  remainingCount: number;
  onDismiss: () => void;
}

// Modal that pops once per missed event on the player's next visit.
// Intentionally vague about the specific skin so missed players don't
// see exactly what they missed — just enough nudge to come back next year.
export function MissedEventNotice({ event, remainingCount, onDismiss }: MissedEventNoticeProps) {
  const template = findSeasonalEvent(event.catalog_id);
  const emoji = template?.emoji ?? '🎉';

  return (
    <div
      className="fixed inset-0 z-[68] flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border-4 border-pancake-gold"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-5 text-center">
          <div className="text-5xl">{emoji}</div>
          <h2 className="text-pancake-brown font-extrabold text-lg mt-3">
            You missed {event.name}
          </h2>
          <p className="text-pancake-brown text-sm mt-3">
            Come back next year during this holiday and you can earn the limited edition skin.
          </p>
          {remainingCount > 0 && (
            <p className="text-pancake-medium text-[11px] mt-2">
              {remainingCount} more notice{remainingCount === 1 ? '' : 's'} waiting…
            </p>
          )}
          <button
            onClick={onDismiss}
            className="mt-5 w-full py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-extrabold cursor-pointer hover:brightness-105"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

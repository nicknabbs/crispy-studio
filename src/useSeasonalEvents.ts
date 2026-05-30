import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  fetchActiveSeasonalEvent,
  claimSeasonalEventReward,
  fetchMissedSeasonalEvents,
  type ActiveSeasonalEvent,
  type MissedSeasonalEvent,
} from './seasonalEventsApi';
import { onSeasonalEventChanged } from './seasonalEventBus';

interface UseSeasonalEventsOpts {
  playerId: string;
  /** Called when the player newly claims a reward skin so the caller can
   *  add it to ownedSkinIds. Receives the skin ID. */
  onReward: (skinId: string) => void;
}

interface UseSeasonalEventsReturn {
  /** The currently-active event (refreshed via realtime). */
  activeEvent: ActiveSeasonalEvent | null;
  /** Events the player missed and hasn't yet dismissed. */
  missedQueue: MissedSeasonalEvent[];
  /** Mark a missed event as dismissed (locally — never nags again). */
  dismissMissed: (eventId: string) => void;
}

const MISSED_DISMISSED_KEY = 'pancake-missed-events-dismissed-v1';

function readDismissedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(MISSED_DISMISSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeDismissedSet(s: Set<string>) {
  try {
    localStorage.setItem(MISSED_DISMISSED_KEY, JSON.stringify(Array.from(s)));
  } catch {
    /* ignore */
  }
}

export function useSeasonalEvents(opts: UseSeasonalEventsOpts): UseSeasonalEventsReturn {
  const { playerId, onReward } = opts;
  const [activeEvent, setActiveEvent] = useState<ActiveSeasonalEvent | null>(null);
  const [missedQueue, setMissedQueue] = useState<MissedSeasonalEvent[]>([]);
  const onRewardRef = useRef(onReward);
  onRewardRef.current = onReward;
  // Visual theming is now entirely driven by <SeasonalEffect> mounting/
  // unmounting when activeEvent flips. No imperative live-event flag flips
  // here — keeps the seasonal pipeline a single, data-driven system per the
  // event's themeConfig.

  // Main effect: load active event + missed events on mount, subscribe to
  // event-started / event-ended broadcasts for live reactivity, and tick
  // a watchdog that clears themes when the event's expires_at passes
  // without a broadcast.
  useEffect(() => {
    let cancelled = false;

    const loadAndApply = async () => {
      try {
        const ev = await fetchActiveSeasonalEvent();
        if (cancelled) return;
        setActiveEvent(ev);
        if (ev && playerId) {
          try {
            const res = await claimSeasonalEventReward({ playerId, eventId: ev.id });
            if (!cancelled && res.newly_claimed && res.reward_skin_id) {
              onRewardRef.current(res.reward_skin_id);
            }
          } catch { /* swallow — claim is retried on next reload */ }
        }
      } catch {
        if (!cancelled) setActiveEvent(null);
      }
    };

    void loadAndApply();

    // Missed events pass — only once per mount.
    if (playerId) {
      fetchMissedSeasonalEvents(playerId)
        .then(rows => {
          if (cancelled) return;
          const dismissed = readDismissedSet();
          setMissedQueue(rows.filter(r => !dismissed.has(r.id)));
        })
        .catch(() => { /* ignore */ });
    }

    // Realtime ping channel so the owner starting / ending an event
    // updates every OTHER connected client instantly. Supabase realtime
    // broadcasts don't echo back to the sender (broadcast.self defaults
    // false), so the OwnerPanel also calls notifySeasonalEventChanged()
    // on its local bus — that path covers the "owner alone in server"
    // case where there's nobody else to receive the broadcast and the
    // sender's own client needs to react.
    const channel = supabase.channel('seasonal-events-bus');
    channel.on('broadcast', { event: 'event-started' }, () => { void loadAndApply(); });
    channel.on('broadcast', { event: 'event-ended' }, () => { void loadAndApply(); });
    channel.subscribe();

    // Local bus: OwnerPanel notifies after a successful start/end so we
    // re-fetch immediately, no broadcast echo required.
    const unsubLocal = onSeasonalEventChanged(() => { void loadAndApply(); });

    // Auto-clear when the active event's expires_at passes (owner may
    // not click End; the duration just runs out naturally). Flipping
    // activeEvent → null unmounts <SeasonalEffect> and tears down all
    // visuals.
    const tick = window.setInterval(() => {
      setActiveEvent(cur => {
        if (cur && new Date(cur.expires_at).getTime() <= Date.now()) {
          return null;
        }
        return cur;
      });
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      unsubLocal();
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const dismissMissed = useCallback((eventId: string) => {
    setMissedQueue(q => q.filter(e => e.id !== eventId));
    const dismissed = readDismissedSet();
    dismissed.add(eventId);
    writeDismissedSet(dismissed);
  }, []);

  return { activeEvent, missedQueue, dismissMissed };
}

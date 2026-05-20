import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  fetchActiveSeasonalEvent,
  claimSeasonalEventReward,
  fetchMissedSeasonalEvents,
  type ActiveSeasonalEvent,
  type MissedSeasonalEvent,
} from './seasonalEventsApi';
import { setLiveEventLocal, type LiveEventId } from './LiveEventsOverlay';

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
  const appliedThemesRef = useRef<Set<LiveEventId>>(new Set());

  // Apply / unapply theme overlays locally. Tracks the last-applied set so
  // we can cleanly remove just what we added, without clobbering anything
  // the owner may have toggled via the Live Events broadcast.
  const applyThemes = useCallback((keys: LiveEventId[]) => {
    const next = new Set(keys);
    for (const old of appliedThemesRef.current) {
      if (!next.has(old)) setLiveEventLocal(old, false);
    }
    for (const k of next) {
      if (!appliedThemesRef.current.has(k)) setLiveEventLocal(k, true);
    }
    appliedThemesRef.current = next;
  }, []);
  const clearThemes = useCallback(() => {
    for (const k of appliedThemesRef.current) setLiveEventLocal(k, false);
    appliedThemesRef.current = new Set();
  }, []);

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
        if (ev) {
          applyThemes(ev.theme_keys);
          if (playerId) {
            try {
              const res = await claimSeasonalEventReward({ playerId, eventId: ev.id });
              if (!cancelled && res.newly_claimed && res.reward_skin_id) {
                onRewardRef.current(res.reward_skin_id);
              }
            } catch { /* swallow — claim is retried on next reload */ }
          }
        } else {
          clearThemes();
        }
      } catch {
        if (!cancelled) {
          setActiveEvent(null);
          clearThemes();
        }
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
    // updates every connected client instantly.
    const channel = supabase.channel('seasonal-events-bus');
    channel.on('broadcast', { event: 'event-started' }, () => { void loadAndApply(); });
    channel.on('broadcast', { event: 'event-ended' }, () => { void loadAndApply(); });
    channel.subscribe();

    // Auto-clear when the active event's expires_at passes (owner may
    // not click End; the duration just runs out naturally).
    const tick = window.setInterval(() => {
      setActiveEvent(cur => {
        if (cur && new Date(cur.expires_at).getTime() <= Date.now()) {
          clearThemes();
          return null;
        }
        return cur;
      });
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      clearThemes();
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

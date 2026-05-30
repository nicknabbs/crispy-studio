// Local in-page bus that lets the OwnerPanel (which triggers an event)
// kick the local useSeasonalEvents subscription to re-fetch, without
// depending on the Supabase realtime broadcast echoing to the sender.
//
// The Supabase broadcast still goes out for OTHER connected clients —
// this bus is purely the "fire for self" path, so a player triggering
// alone in a server sees the effect on their own screen.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onSeasonalEventChanged(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function notifySeasonalEventChanged(): void {
  for (const cb of Array.from(listeners)) {
    try { cb(); } catch { /* swallow — one bad listener shouldn't kill the rest */ }
  }
}

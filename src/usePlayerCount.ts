import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// How many people are currently connected to the game.
// Driven by Supabase Realtime "presence": each client joins a shared channel
// with a unique key and the channel reports the live participant set via a
// `sync` event. The optimistic initial value is 1 so the badge shows "1
// playing — including you" even before the first presence sync lands.
export function usePlayerCount(): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const key = `p-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    const channel = supabase.channel('pancake-presence', {
      config: { presence: { key } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // presenceState() keys are the per-client presence keys; one entry
        // per connected tab/device.
        const total = Object.keys(state).length;
        setCount(Math.max(1, total));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Tell the channel "I'm here" — this is what makes other clients
          // see us in their next sync.
          await channel.track({ joinedAt: Date.now() });
        }
      });

    return () => {
      // untrack happens automatically when the channel is removed.
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}

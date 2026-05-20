import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { getPlayerId } from './leaderboardApi';

export interface ActivePlayer {
  playerId: string;
  name: string;        // display name, or "Guest" when unknown
  isSelf: boolean;
  joinedAt: number;    // earliest joinedAt across this player's tabs
}

export interface PresenceInfo {
  count: number;             // raw tab count (matches legacy badge number)
  players: ActivePlayer[];   // deduped by playerId, self pinned first
}

// How many people are currently connected to the game, and who they are.
// Driven by Supabase Realtime "presence": each client joins a shared channel
// with a unique key, broadcasts its stable player_id + display name, and the
// channel reports the live participant set via a `sync` event. The optimistic
// initial value is 1 so the badge shows "1 playing — including you" before
// the first sync lands.
export function usePlayerCount(localName?: string): PresenceInfo {
  const selfId = getPlayerId();
  const [info, setInfo] = useState<PresenceInfo>(() => ({
    count: 1,
    players: [{ playerId: selfId, name: localName?.trim() || 'Guest', isSelf: true, joinedAt: Date.now() }],
  }));

  useEffect(() => {
    const key = `p-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    const channel = supabase.channel('pancake-presence', {
      config: { presence: { key } },
    });

    const computeInfo = (): PresenceInfo => {
      const state = channel.presenceState() as Record<string, Array<{ joinedAt?: number; playerId?: string; playerName?: string | null }>>;
      const keys = Object.keys(state);
      // Per playerId, keep the LATEST metadata (renames produce a new track
      // call with a fresh joinedAt; the freshest entry has the current name).
      // But remember the EARLIEST joinedAt for stable sort ordering.
      const latest = new Map<string, { name: string; joinedAt: number; earliest: number }>();
      for (const k of keys) {
        const arr = state[k] ?? [];
        for (const meta of arr) {
          const pid = (meta?.playerId && typeof meta.playerId === 'string') ? meta.playerId : `key:${k}`;
          const rawName = (meta?.playerName ?? '').toString().trim();
          const name = rawName.length > 0 ? rawName : 'Guest';
          const joinedAt = typeof meta?.joinedAt === 'number' ? meta.joinedAt : Date.now();
          const existing = latest.get(pid);
          if (!existing) {
            latest.set(pid, { name, joinedAt, earliest: joinedAt });
          } else {
            const earliest = Math.min(existing.earliest, joinedAt);
            if (joinedAt >= existing.joinedAt) {
              latest.set(pid, { name, joinedAt, earliest });
            } else {
              latest.set(pid, { ...existing, earliest });
            }
          }
        }
      }
      const players: ActivePlayer[] = Array.from(latest.entries()).map(([pid, v]) => ({
        playerId: pid,
        name: v.name,
        isSelf: pid === selfId,
        joinedAt: v.earliest,
      })).sort((a, b) => {
        if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
        return a.joinedAt - b.joinedAt;
      });
      return { count: Math.max(1, keys.length), players };
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        setInfo(computeInfo());
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            joinedAt: Date.now(),
            playerId: selfId,
            playerName: localName?.trim() || null,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // selfId is stable per browser; localName is rebroadcast via the second effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-broadcast updated name when the user renames themselves mid-session.
  useEffect(() => {
    const channels = supabase.getChannels().filter(c => c.topic === 'realtime:pancake-presence');
    for (const ch of channels) {
      if (ch.state === 'joined') {
        ch.track({
          joinedAt: Date.now(),
          playerId: selfId,
          playerName: localName?.trim() || null,
        });
      }
    }
  }, [localName, selfId]);

  return info;
}

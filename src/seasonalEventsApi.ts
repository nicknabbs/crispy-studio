import { supabase } from './supabaseClient';
import type { LiveEventId } from './LiveEventsOverlay';

export interface ActiveSeasonalEvent {
  id: string;
  catalog_id: string;
  name: string;
  theme_keys: LiveEventId[];
  reward_skin_id: string;
  started_at: string;
  expires_at: string;
}

export interface MissedSeasonalEvent {
  id: string;
  catalog_id: string;
  name: string;
  reward_skin_id: string;
  ended_at: string;
}

export interface ClaimResult {
  newly_claimed: boolean;
  reward_skin_id: string;
}

export async function startSeasonalEvent(opts: {
  catalogId: string;
  name: string;
  themeKeys: LiveEventId[];
  rewardSkinId: string;
  durationSeconds: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc('start_seasonal_event', {
    p_catalog_id: opts.catalogId,
    p_name: opts.name,
    p_theme_keys: opts.themeKeys,
    p_reward_skin_id: opts.rewardSkinId,
    p_duration_seconds: opts.durationSeconds,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function endSeasonalEvent(catalogId: string): Promise<void> {
  const { error } = await supabase.rpc('end_seasonal_event', { p_catalog_id: catalogId });
  if (error) throw new Error(error.message);
}

export async function fetchActiveSeasonalEvent(): Promise<ActiveSeasonalEvent | null> {
  const { data, error } = await supabase.rpc('get_active_seasonal_event');
  if (error) throw new Error(error.message);
  const rows = (data as ActiveSeasonalEvent[] | null) ?? [];
  return rows[0] ?? null;
}

export async function claimSeasonalEventReward(opts: {
  playerId: string;
  eventId: string;
}): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc('claim_seasonal_event_reward', {
    p_player_id: opts.playerId,
    p_event_id: opts.eventId,
  });
  if (error) throw new Error(error.message);
  const rows = (data as ClaimResult[] | null) ?? [];
  return rows[0] ?? { newly_claimed: false, reward_skin_id: '' };
}

export async function fetchMissedSeasonalEvents(playerId: string): Promise<MissedSeasonalEvent[]> {
  if (!playerId) return [];
  const { data, error } = await supabase.rpc('get_recent_missed_events_for_player', {
    p_player_id: playerId,
  });
  if (error) throw new Error(error.message);
  return (data as MissedSeasonalEvent[] | null) ?? [];
}

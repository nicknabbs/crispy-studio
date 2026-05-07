import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export interface PlayerProfile {
  user_id: string;
  display_name: string;
}

export interface BanInfo {
  banned: boolean;
  reason?: string | null;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: PlayerProfile | null;
  ban: BanInfo;
  isOwner: boolean;
  loading: boolean;
}

const BAN_CACHE_KEY = 'pancake-ban-cache-v1';

function readBanCache(): BanInfo {
  try {
    const raw = localStorage.getItem(BAN_CACHE_KEY);
    if (!raw) return { banned: false };
    return JSON.parse(raw);
  } catch {
    return { banned: false };
  }
}

function writeBanCache(info: BanInfo) {
  try {
    localStorage.setItem(BAN_CACHE_KEY, JSON.stringify(info));
  } catch {
    /* ignore */
  }
}

export function useAuth(): AuthState & {
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [ban, setBan] = useState<BanInfo>(() => readBanCache());
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAuxData = useCallback(async (sess: Session | null) => {
    if (!sess) {
      setProfile(null);
      setBan({ banned: false });
      setIsOwner(false);
      writeBanCache({ banned: false });
      return;
    }
    const [profileRes, banRes, ownerRes] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name').eq('user_id', sess.user.id).maybeSingle(),
      supabase.rpc('am_i_banned'),
      supabase.rpc('is_owner'),
    ]);
    setProfile((profileRes.data as PlayerProfile | null) ?? null);
    const banInfo: BanInfo = banRes.data
      ? { banned: !!(banRes.data as { banned: boolean }).banned, reason: (banRes.data as { reason?: string }).reason ?? null }
      : { banned: false };
    setBan(banInfo);
    writeBanCache(banInfo);
    setIsOwner(!!ownerRes.data);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadAuxData(data.session).finally(() => mounted && setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      loadAuxData(sess);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadAuxData]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const trimmed = displayName.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      throw new Error('Display name must be 3–20 characters.');
    }
    if (!/^[A-Za-z0-9 _\-]+$/.test(trimmed)) {
      throw new Error('Display name can only contain letters, numbers, spaces, hyphens, and underscores.');
    }
    // Pre-flight: check display name isn't already taken (the auto-create trigger
    // will quietly suffix on collision; we'd rather tell the user upfront).
    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('display_name', trimmed)
      .maybeSingle();
    if (existing) {
      throw new Error('That display name is taken. Pick another.');
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: trimmed } },
    });
    if (error) throw error;
    // The on_auth_user_created trigger creates the profile row server-side.
    // If email confirmation is enabled, no session yet — surface that to the user.
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setBan({ banned: false });
    setIsOwner(false);
    writeBanCache({ banned: false });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    await loadAuxData(session);
  }, [session, loadAuxData]);

  return {
    session,
    user: session?.user ?? null,
    profile,
    ban,
    isOwner,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };
}

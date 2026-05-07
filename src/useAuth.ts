import { useEffect, useState, useCallback, useRef } from 'react';
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
  isAnonymous: boolean;
  needsDisplayName: boolean;
  loading: boolean;
}

const PLAYER_NAME_KEY = 'pancake-player-name';

function isValidDisplayName(name: string): boolean {
  if (name.length < 3 || name.length > 20) return false;
  return /^[A-Za-z0-9 _\-@]+$/.test(name);
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
  claimDisplayName: (name: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [ban, setBan] = useState<BanInfo>(() => readBanCache());
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSignInTried, setAutoSignInTried] = useState(false);
  const profileRef = useRef<PlayerProfile | null>(null);
  profileRef.current = profile;

  const tryAutoCreateProfileFromLocalStorage = useCallback(async (userId: string): Promise<PlayerProfile | null> => {
    const cached = localStorage.getItem(PLAYER_NAME_KEY)?.trim();
    if (!cached || !isValidDisplayName(cached)) return null;
    // Check if name is already taken by someone else
    const { data: existing } = await supabase
      .from('profiles').select('user_id').ilike('display_name', cached).maybeSingle();
    if (existing && (existing as { user_id: string }).user_id !== userId) {
      return null;
    }
    const { data: row, error } = await supabase
      .from('profiles')
      .insert({ user_id: userId, display_name: cached })
      .select('user_id, display_name')
      .maybeSingle();
    if (error || !row) return null;
    return row as PlayerProfile;
  }, []);

  const checkBanByName = useCallback(async (name: string | null | undefined): Promise<BanInfo> => {
    if (!name || !name.trim()) return { banned: false };
    const { data, error } = await supabase
      .from('banned_names')
      .select('reason')
      .eq('name_lower', name.trim().toLowerCase())
      .maybeSingle();
    if (error || !data) return { banned: false };
    return { banned: true, reason: (data as { reason?: string | null }).reason ?? null };
  }, []);

  const loadAuxData = useCallback(async (sess: Session | null) => {
    // Ban check is name-based now, so it works whether or not there's a session.
    const localName = (() => {
      try { return localStorage.getItem(PLAYER_NAME_KEY)?.trim() || null; } catch { return null; }
    })();

    if (!sess) {
      setProfile(null);
      setIsOwner(false);
      const banInfo = await checkBanByName(localName);
      setBan(banInfo);
      writeBanCache(banInfo);
      return;
    }

    const [profileRes, ownerRes] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name').eq('user_id', sess.user.id).maybeSingle(),
      supabase.rpc('is_owner'),
    ]);
    let prof = (profileRes.data as PlayerProfile | null) ?? null;
    if (!prof) {
      prof = await tryAutoCreateProfileFromLocalStorage(sess.user.id);
    }
    setProfile(prof);
    if (prof?.display_name) {
      try { localStorage.setItem(PLAYER_NAME_KEY, prof.display_name); } catch { /* ignore */ }
    }
    setIsOwner(!!ownerRes.data);

    const effectiveName = prof?.display_name ?? localName;
    const banInfo = await checkBanByName(effectiveName);
    setBan(banInfo);
    writeBanCache(banInfo);
  }, [tryAutoCreateProfileFromLocalStorage, checkBanByName]);

  useEffect(() => {
    let mounted = true;

    const ensureSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      let sess = data.session;
      if (!sess && !autoSignInTried) {
        setAutoSignInTried(true);
        const { data: anonData, error } = await supabase.auth.signInAnonymously();
        if (!mounted) return;
        if (!error) {
          sess = anonData.session;
        }
      }
      setSession(sess);
      await loadAuxData(sess);
      if (mounted) setLoading(false);
    };

    ensureSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      loadAuxData(sess);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadAuxData, autoSignInTried]);

  const claimDisplayName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!isValidDisplayName(trimmed)) {
      throw new Error('Name must be 3–20 chars: letters, numbers, spaces, hyphens, underscores.');
    }
    const { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess) throw new Error('Not signed in yet — try again in a sec.');
    const userId = sess.user.id;

    // Already-taken pre-flight (excluding myself)
    const { data: existing } = await supabase
      .from('profiles').select('user_id').ilike('display_name', trimmed).maybeSingle();
    if (existing && (existing as { user_id: string }).user_id !== userId) {
      throw new Error('That name is already taken. Pick another.');
    }

    // upsert: insert if no profile, update if same user already has one
    const existingMine = profileRef.current;
    const { data: row, error } = existingMine
      ? await supabase.from('profiles').update({ display_name: trimmed }).eq('user_id', userId).select('user_id, display_name').maybeSingle()
      : await supabase.from('profiles').insert({ user_id: userId, display_name: trimmed }).select('user_id, display_name').maybeSingle();
    if (error) {
      const msg = error.message || '';
      if (/duplicate|unique/i.test(msg)) throw new Error('That name is already taken. Pick another.');
      throw new Error(msg);
    }
    if (!row) throw new Error('Could not save profile.');
    setProfile(row as PlayerProfile);
    try { localStorage.setItem(PLAYER_NAME_KEY, trimmed); } catch { /* ignore */ }
    // Re-run ban check against the new name.
    const banInfo = await checkBanByName(trimmed);
    setBan(banInfo);
    writeBanCache(banInfo);
  }, [checkBanByName]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const trimmed = displayName.trim();
    if (!isValidDisplayName(trimmed)) {
      throw new Error('Display name must be 3–20 chars: letters, numbers, spaces, hyphens, underscores.');
    }
    const { data: existing } = await supabase
      .from('profiles').select('user_id').ilike('display_name', trimmed).maybeSingle();
    if (existing) {
      throw new Error('That display name is taken. Pick another.');
    }
    // Sign out any anon session first so signUp creates a fresh email account
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: trimmed } },
    });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setBan({ banned: false });
    setIsOwner(false);
    writeBanCache({ banned: false });
    // Drop the auto-sign-in latch so the next render gets a fresh anon session.
    setAutoSignInTried(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    await loadAuxData(session);
  }, [session, loadAuxData]);

  const isAnonymous = !!(session?.user && (session.user as User & { is_anonymous?: boolean }).is_anonymous);
  const needsDisplayName = !loading && !!session && !profile;

  return {
    session,
    user: session?.user ?? null,
    profile,
    ban,
    isOwner,
    isAnonymous,
    needsDisplayName,
    loading,
    signUp,
    signIn,
    signOut,
    claimDisplayName,
    refreshProfile,
  };
}

import { useEffect, useRef, useState } from 'react';
import type { GameState } from './useGameState';
import { BUILDINGS, UPGRADES, CLICK_UPGRADES, formatNumber, formatCps } from './gameData';
import { ACHIEVEMENTS } from './achievements';
import { GAME_CONFIGS, adminSetScore } from './leaderboardApi';
import { supabase } from './supabaseClient';
import {
  LIVE_EVENT_META,
  readLiveEvents,
  setLiveEvent,
  clearAllLiveEvents,
  broadcastScreenText,
  type LiveEventId,
} from './LiveEventsOverlay';
import { OWNER_PASSWORD } from './adminPasswords';
import { GiftModal } from './GiftModal';
import { ChatPanel } from './ChatPanel';
import { getPlayerId } from './leaderboardApi';
import { SEASONAL_EVENTS } from './seasonalEvents';
import {
  startSeasonalEvent,
  endSeasonalEvent,
  fetchActiveSeasonalEvent,
  type ActiveSeasonalEvent,
} from './seasonalEventsApi';

const STORAGE_UNLOCKED = 'pancake-owner-unlocked-v2';
const STORAGE_UNLOCKED_OLD = 'pancake-owner-unlocked-v1';

// Mini-game cheat catalog (moved from MiniGameHacks.tsx — same localStorage keys
// so all the existing mini-game cheat checks keep working untouched).
const HACKS: { key: string; label: string; desc: string }[] = [
  { key: 'pancake-hack-split-guide',    label: '✂️ Split the Pancake',         desc: 'Show guide line at 50%' },
  { key: 'pancake-hack-edge-guide',     label: '🗡️ Edge Slicer',               desc: 'Show guide lines near edges' },
  { key: 'pancake-hack-chopper-auto',   label: '🪓 Pancake Chopper',           desc: 'Auto-chop mode (rapid fire)' },
  { key: 'pancake-hack-stacker-slow',   label: '🥞 Pancake Stacker',           desc: 'Slow motion (3x slower)' },
  { key: 'pancake-hack-flipper-zone',   label: '🍳 Pancake Flipper',           desc: 'Extended golden zone (3x wider)' },
  { key: 'pancake-hack-catcher-bigpan', label: '🥛 Batter Catcher',            desc: 'Huge pan (2x wider)' },
  { key: 'pancake-hack-recipe-safe',    label: '🥣 Recipe Rush',               desc: 'Hide bad ingredients' },
  { key: 'pancake-hack-syrup-show',     label: '🍯 Syrup Drizzle',             desc: 'Target path glows bright' },
  { key: 'pancake-hack-berry-allgood',  label: '🫐 Blueberry Sort',            desc: 'No rotten berries spawn' },
  { key: 'pancake-hack-toss-easy',      label: '🥞 Pancake Toss & Catch',      desc: 'Huge catch window + slow gravity' },
  { key: 'pancake-hack-pour-slow',      label: '🫗 Batter Pour Precision',     desc: 'Slow pour for perfect precision' },
  { key: 'pancake-hack-maze-freeze',    label: '🌀 Pancake Maze Roll',         desc: 'Freeze timer (unlimited time)' },
  { key: 'pancake-hack-memory-timer',   label: '🧠 Short Stack Memory',        desc: '30s timer — spam buttons to rack up points' },
  { key: 'pancake-hack-grid-ghost',     label: '🔲 Griddle Grid Puzzle',       desc: 'Slow drop speed' },
  { key: 'pancake-hack-shuffle-pick',   label: '🎩 Pancake Toppings Shuffle',  desc: 'Whichever tray you pick is the right one' },
  { key: 'pancake-hack-pop-spawn',      label: '⚡ Pancake Pop Reaction Test', desc: 'Tap anywhere while waiting — pancake spawns there' },
  { key: 'pancake-hack-boss-oneshot',   label: '😠 Pancake Boss',              desc: 'Every click instantly defeats the current boss' },
];

const SCORE_KEY_OVERRIDES: Record<string, string> = {
  split: 'pancake-split-best',
  edge:  'pancake-edge-best',
};
function scoreKey(gameId: string): string {
  return SCORE_KEY_OVERRIDES[gameId] ?? `pancake-${gameId}-high`;
}

const TIME_UNITS: { label: string; seconds: number }[] = [
  { label: 'Seconds', seconds: 1 },
  { label: 'Minutes', seconds: 60 },
  { label: 'Hours', seconds: 3600 },
  { label: 'Days', seconds: 86400 },
  { label: 'Years', seconds: 31536000 },
];

// Owner panel does NOT cap time — but JS Number can't represent useful results
// past ~1e300, and we still need a sane outer wall to avoid Infinity.
const OWNER_MAX_TIME_SECONDS = 1e15; // ~31M years — effectively unlimited.

interface OwnerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  cps: number;
  clickPower: number;
  frenzyMult: number;
  setDirectState: (partial: Partial<GameState>) => void;
  grantAllAchievements: () => void;
  resetSave: () => void;
  simulateTime: (seconds: number) => void;
  activateFrenzy: (mult: number, dur: number) => void;
  onForceButterPat: () => void;
  onSetCpsOverride: (cps: number | null) => void;
  onSetClickOverride: (power: number | null) => void;
  cpsOverride: number | null;
  clickOverride: number | null;
  ownerDisplayName: string;
}

export function OwnerPanel({
  isOpen, onClose, state, cps, clickPower, frenzyMult,
  setDirectState, grantAllAchievements, resetSave, simulateTime,
  activateFrenzy, onForceButterPat,
  onSetCpsOverride, onSetClickOverride, cpsOverride, clickOverride,
  ownerDisplayName,
}: OwnerPanelProps) {
  // OP auto-clicker — rate so absurd we can't actually call clickCookie() that
  // many times. Instead, every tick we add the per-tick share directly to state.
  // Ticks every 100ms, so per-tick = total / 10. Hooks live outside the password
  // gate so the loop survives the panel being closed.
  const OP_AUTO_RATE = 999e39; // 999 duodecillion per second
  const OP_AUTO_TICK_MS = 100;
  const OP_AUTO_PER_TICK = OP_AUTO_RATE / (1000 / OP_AUTO_TICK_MS);
  const [autoClickerOn, setAutoClickerOn] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const setDirectStateRef = useRef(setDirectState);
  setDirectStateRef.current = setDirectState;
  useEffect(() => {
    if (!autoClickerOn) return;
    const id = setInterval(() => {
      const s = stateRef.current;
      const nextCookies = s.cookies + OP_AUTO_PER_TICK;
      setDirectStateRef.current({
        cookies: nextCookies,
        totalBaked: Math.max(s.totalBaked, s.totalBaked + OP_AUTO_PER_TICK),
        lifetimeBaked: Math.max(s.lifetimeBaked, s.lifetimeBaked + OP_AUTO_PER_TICK),
        peakCookies: Math.max(s.peakCookies, nextCookies),
        totalClicks: s.totalClicks + OP_AUTO_PER_TICK,
      });
    }, OP_AUTO_TICK_MS);
    return () => clearInterval(id);
  }, [autoClickerOn, OP_AUTO_PER_TICK]);

  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem(STORAGE_UNLOCKED) === 'true');
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [activeSeasonalEvent, setActiveSeasonalEvent] = useState<ActiveSeasonalEvent | null>(null);
  const [seasonalEventBusy, setSeasonalEventBusy] = useState<string | null>(null);
  const [seasonalEventError, setSeasonalEventError] = useState<string | null>(null);

  // Cross-device owner sign-in
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authIsAnon, setAuthIsAnon] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInputAuth, setPasswordInputAuth] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMsg, setAuthMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  useEffect(() => {
    if (!isOpen || !authenticated) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const u = data.user;
      setAuthUserId(u?.id ?? null);
      setAuthIsAnon(!!u?.is_anonymous);
      setAuthEmail(u?.email ?? '');
    });
    return () => { cancelled = true; };
  }, [isOpen, authenticated]);
  // [tick] forces re-render every second so the active-event countdown ticks.
  const [, setSecTick] = useState(0);
  useEffect(() => {
    if (!isOpen || !authenticated) return;
    let cancelled = false;
    fetchActiveSeasonalEvent()
      .then(e => { if (!cancelled) setActiveSeasonalEvent(e); })
      .catch(() => { /* ignore */ });
    const id = window.setInterval(() => setSecTick(t => t + 1), 1000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [isOpen, authenticated]);

  // If the panel was previously unlocked on this device but the server-side
  // owner row was never created (or got cleared), re-attempt the claim on
  // every open. Cheap network call; the RPC is idempotent. MUST sit above
  // the `if (!isOpen) return null` early return — Rules of Hooks.
  useEffect(() => {
    if (!isOpen || !authenticated) return;
    void (async () => {
      try { await supabase.rpc('claim_owner_role', { p_password: OWNER_PASSWORD }); }
      catch { /* ignore */ }
    })();
  }, [isOpen, authenticated]);
  const [, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);

  // Self-gift inputs
  const [pancakeInput, setPancakeInput] = useState('');
  const [buildingInputs, setBuildingInputs] = useState<Record<string, string>>({});

  // Time
  const [timeValue, setTimeValue] = useState('1');
  const [timeUnit, setTimeUnit] = useState(3600);

  // Frenzy
  const [frenzyMultInput, setFrenzyMultInput] = useState('1000');
  const [frenzyDurInput, setFrenzyDurInput] = useState('300');

  // CPS / click overrides
  const [cpsInput, setCpsInput] = useState('');
  const [clickInput, setClickInput] = useState('');

  // Screen-text broadcaster
  const [screenTextInput, setScreenTextInput] = useState('Hello Pancake Stack players!');

  // Reset confirmation
  const [confirmReset, setConfirmReset] = useState(false);

  // Score editor
  const [selectedScoreGame, setSelectedScoreGame] = useState<string>('split');
  const [newScoreInput, setNewScoreInput] = useState('');
  const [scoreEditorMsg, setScoreEditorMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [scoreEditorBusy, setScoreEditorBusy] = useState(false);

  // Pancake Blast inline editor
  const [blastScoreInput, setBlastScoreInput] = useState('');
  const [blastScoreMsg, setBlastScoreMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [blastScoreBusy, setBlastScoreBusy] = useState(false);

  // Ban form
  const [banNameInput, setBanNameInput] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');
  const [banBusy, setBanBusy] = useState(false);
  const [banMsg, setBanMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;

  const tryUnlock = () => {
    if (pwInput === OWNER_PASSWORD) {
      setAuthenticated(true);
      setPwError(false);
      // Also promote this device's auth user to server-side owner.
      // The RPC is idempotent — safe to call from every device + every unlock.
      // (Silent fail is fine — UI access still works, but server-side
      // actions won't until the claim succeeds.)
      void (async () => {
        try { await supabase.rpc('claim_owner_role', { p_password: pwInput }); }
        catch { /* ignore */ }
      })();
      setPwInput('');
      localStorage.setItem(STORAGE_UNLOCKED, 'true');
      localStorage.removeItem(STORAGE_UNLOCKED_OLD);
    } else {
      setPwError(true);
    }
  };

  const handleClose = () => {
    setPwInput('');
    setPwError(false);
    setConfirmReset(false);
    setScoreEditorMsg(null);
    setBlastScoreMsg(null);
    onClose();
  };

  if (!authenticated) {
    return (
      <>
        <style>{GLITCH_STYLES}</style>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
          <div
            className="rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border-2"
            style={{
              background: 'linear-gradient(135deg, #2a0033 0%, #07071f 50%, #001a2a 100%)',
              borderColor: 'rgba(255, 0, 200, 0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="text-4xl mb-2">👑</div>
              <h2 className="glitch-title text-xl font-extrabold text-white tracking-wider mb-1" data-text="OWNER PANEL">
                OWNER PANEL
              </h2>
              <p className="text-xs text-fuchsia-200/80 mb-4">Owner-only access · Enter password</p>
              <input
                type="password"
                value={pwInput}
                onChange={e => { setPwInput(e.target.value); setPwError(false); }}
                onKeyDown={e => { if (e.key === 'Enter') tryUnlock(); }}
                placeholder="Password..."
                autoFocus
                className={`w-full px-4 py-3 rounded-xl border-2 text-center text-white placeholder-fuchsia-300/50 font-medium bg-black/40 outline-none ${
                  pwError ? 'border-red-400 animate-shake' : 'border-fuchsia-400/50 focus:border-fuchsia-300'
                }`}
              />
              {pwError && <p className="text-red-300 text-sm mt-2 font-medium">Wrong password!</p>}
              <button
                onClick={tryUnlock}
                className="mt-4 w-full py-3 rounded-xl border-2 border-fuchsia-400 bg-fuchsia-600 text-white font-bold cursor-pointer hover:bg-fuchsia-500 transition-all"
              >
                Unlock
              </button>
              <p className="text-xs text-fuchsia-300/60 mt-3">Click outside to cancel</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const liveEvents = readLiveEvents();
  const achievementCount = Object.keys(state.unlockedAchievements).filter(k => state.unlockedAchievements[k]).length;
  const playerName = localStorage.getItem('pancake-player-name')?.trim() ?? '';

  const timeSecondsRaw = parseFloat(timeValue || '0') * timeUnit;
  const timeSeconds = Math.min(timeSecondsRaw, OWNER_MAX_TIME_SECONDS);
  const timePreview = cps * timeSeconds;

  return (
    <>
      <style>{GLITCH_STYLES}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm" onClick={handleClose}>
        <div
          className="rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          style={{
            background: 'linear-gradient(180deg, #190028 0%, #0d0118 100%)',
            border: '2px solid rgba(255,0,200,0.45)',
            boxShadow: '0 0 40px rgba(255, 0, 200, 0.15)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-10 rounded-t-2xl border-b-2 p-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(90deg, #4a004a 0%, #1a0044 50%, #002848 100%)',
              borderColor: 'rgba(255,0,200,0.4)',
            }}
          >
            <h2 className="glitch-title text-xl font-extrabold text-white tracking-wider" data-text="👑 OWNER PANEL">
              👑 OWNER PANEL
            </h2>
            <button
              onClick={handleClose}
              className="text-2xl text-white/80 hover:text-white cursor-pointer bg-transparent border-0 leading-none"
            >
              ✕
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">

            {/* ==================== LIVE EVENTS ==================== */}
            <Section title="🎉 Live Events" subtitle="Live on every connected player's screen · stack as many as you want">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {LIVE_EVENT_META.map(ev => {
                  const active = !!liveEvents[ev.id];
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: 'rgba(255, 220, 255, 0.06)',
                        border: '1px solid rgba(255, 100, 220, 0.25)',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{ev.label}</div>
                        <div className="text-xs text-fuchsia-200/70 truncate">{ev.desc}</div>
                      </div>
                      <button
                        onClick={() => {
                          const turningOn = !active;
                          setLiveEvent(ev.id as LiveEventId, turningOn);
                          bump();
                          // Drop an orange announcement in chat when an
                          // event is enabled (not on every off-toggle).
                          if (turningOn) {
                            void (async () => {
                              try {
                                await supabase.rpc('insert_chat_announcement', {
                                  p_text: `${ev.label} just started!`,
                                });
                              } catch { /* ignore */ }
                            })();
                          }
                        }}
                        className={`px-3 py-1 rounded text-xs font-bold cursor-pointer border transition-all min-w-[50px] ${
                          active
                            ? 'border-green-300 bg-green-100 text-green-700'
                            : 'border-fuchsia-400/40 bg-black/30 text-fuchsia-200'
                        }`}
                      >
                        {active ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={screenTextInput}
                  onChange={e => setScreenTextInput(e.target.value)}
                  placeholder="Message — pops on every player's screen..."
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                />
                <button
                  onClick={() => {
                    const t = screenTextInput.trim();
                    if (!t) return;
                    broadcastScreenText(t);
                  }}
                  className="px-4 py-2 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold cursor-pointer hover:bg-fuchsia-400 transition-all"
                >
                  💬 Broadcast
                </button>
              </div>

              <button
                onClick={() => { clearAllLiveEvents(); bump(); }}
                className="w-full py-2 rounded-lg border-2 border-red-300 bg-red-50 text-red-600 font-bold text-sm cursor-pointer hover:bg-red-100 transition-all"
              >
                Turn All Events Off
              </button>
            </Section>

            {/* ==================== CROSS-DEVICE OWNER SIGN-IN ==================== */}
            <Section title="🔑 Owner Identity" subtitle="Typing the owner password already promoted this device to a real server-side owner. Email is optional — only useful if you want one credential across devices.">
              {authUserId ? (
                <div className="flex flex-col gap-3">
                  <div className="text-xs text-fuchsia-200/80">
                    Each device that types the owner password gets added to the <code className="text-fuchsia-100 bg-black/40 px-1 py-0.5 rounded">app_owners</code> table automatically. To make this phone an owner too: open the game on your phone, open this panel, type the owner password — done. Your current device's user_id:
                  </div>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 min-w-0 truncate text-[11px] text-fuchsia-100 bg-black/40 border border-fuchsia-400/30 rounded px-2 py-1.5 font-mono">
                      {authUserId}
                    </code>
                    <button
                      onClick={() => { void navigator.clipboard.writeText(authUserId); setAuthMsg({ kind: 'ok', text: 'Copied to clipboard.' }); }}
                      className="px-3 py-1.5 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold text-xs cursor-pointer hover:bg-fuchsia-400 whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="text-xs">
                    Status: {authIsAnon
                      ? <span className="text-yellow-300 font-bold">Anonymous (device-only)</span>
                      : <span className="text-green-300 font-bold">Email account ({authEmail})</span>}
                  </div>

                  {authIsAnon ? (
                    <>
                      <div className="text-[11px] text-fuchsia-200/70 mt-1 italic">
                        Optional: add an email + password so you don't have to retype the owner password on a new device. Skipping this is fine — typing the password on each device works too.
                      </div>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        placeholder="email@example.com"
                        className="px-3 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-white outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                      />
                      <input
                        type="password"
                        value={passwordInputAuth}
                        onChange={e => setPasswordInputAuth(e.target.value)}
                        placeholder="password (6+ chars)"
                        className="px-3 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-white outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                      />
                      <button
                        onClick={async () => {
                          setAuthBusy(true);
                          setAuthMsg(null);
                          try {
                            const { error } = await supabase.auth.updateUser({
                              email: emailInput.trim(),
                              password: passwordInputAuth,
                            });
                            if (error) throw error;
                            setAuthMsg({ kind: 'ok', text: 'Done! Check your inbox for a confirmation email — once you click it, you can sign in with this email/password on your phone.' });
                            const { data } = await supabase.auth.getUser();
                            setAuthEmail(data.user?.email ?? emailInput.trim());
                            setAuthIsAnon(!!data.user?.is_anonymous);
                            setPasswordInputAuth('');
                          } catch (e) {
                            setAuthMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
                          } finally {
                            setAuthBusy(false);
                          }
                        }}
                        disabled={authBusy || emailInput.trim().length === 0 || passwordInputAuth.length < 6}
                        className="px-4 py-2 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold cursor-pointer hover:bg-fuchsia-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {authBusy ? '…' : 'Upgrade to email account (keeps progress)'}
                      </button>
                    </>
                  ) : (
                    <div className="text-[11px] text-green-200/80 mt-1">
                      On your phone, open the Owner Panel and sign in with the same email + password to inherit this user_id and be recognized as owner.
                    </div>
                  )}

                  {/* Cross-device sign-in (use this on phone after upgrading on desktop) */}
                  <details className="mt-2">
                    <summary className="text-xs text-fuchsia-200/70 cursor-pointer hover:text-fuchsia-200">
                      Sign in with email on this device (use on phone)
                    </summary>
                    <div className="flex flex-col gap-2 mt-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        placeholder="email@example.com"
                        className="px-3 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-white outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                      />
                      <input
                        type="password"
                        value={passwordInputAuth}
                        onChange={e => setPasswordInputAuth(e.target.value)}
                        placeholder="password"
                        className="px-3 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-white outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                      />
                      <button
                        onClick={async () => {
                          setAuthBusy(true);
                          setAuthMsg(null);
                          try {
                            const { error } = await supabase.auth.signInWithPassword({
                              email: emailInput.trim(),
                              password: passwordInputAuth,
                            });
                            if (error) throw error;
                            setAuthMsg({ kind: 'ok', text: 'Signed in. Reload the page to apply.' });
                            const { data } = await supabase.auth.getUser();
                            setAuthUserId(data.user?.id ?? null);
                            setAuthIsAnon(!!data.user?.is_anonymous);
                            setAuthEmail(data.user?.email ?? '');
                            setPasswordInputAuth('');
                          } catch (e) {
                            setAuthMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
                          } finally {
                            setAuthBusy(false);
                          }
                        }}
                        disabled={authBusy || emailInput.trim().length === 0 || passwordInputAuth.length === 0}
                        className="px-4 py-2 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold cursor-pointer hover:bg-fuchsia-400 disabled:opacity-50"
                      >
                        {authBusy ? '…' : 'Sign in'}
                      </button>
                    </div>
                  </details>

                  {authMsg && (
                    <p className={`text-xs font-medium ${authMsg.kind === 'ok' ? 'text-green-300' : 'text-red-300'}`}>{authMsg.text}</p>
                  )}
                </div>
              ) : (
                <p className="text-fuchsia-200/70 text-sm">Loading auth state…</p>
              )}
            </Section>

            {/* ==================== SEASONAL EVENTS ==================== */}
            <Section title="🎃 Seasonal Events" subtitle="10-minute holiday events · grants a limited-edition skin to everyone playing during the window">
              {seasonalEventError && (
                <p className="text-red-300 text-xs mb-2">{seasonalEventError}</p>
              )}
              <div className="grid grid-cols-1 gap-2">
                {SEASONAL_EVENTS.map(template => {
                  const isThisActive = activeSeasonalEvent?.catalog_id === template.catalogId;
                  const otherActive = activeSeasonalEvent !== null && !isThisActive;
                  const busy = seasonalEventBusy === template.catalogId;
                  const remaining = isThisActive && activeSeasonalEvent
                    ? Math.max(0, new Date(activeSeasonalEvent.expires_at).getTime() - Date.now())
                    : 0;
                  return (
                    <div
                      key={template.catalogId}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                      style={{
                        background: isThisActive
                          ? 'rgba(255, 100, 220, 0.18)'
                          : 'rgba(255, 220, 255, 0.06)',
                        border: isThisActive
                          ? '1px solid rgba(255, 100, 220, 0.7)'
                          : '1px solid rgba(255, 100, 220, 0.25)',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {template.emoji} {template.name}
                        </div>
                        <div className="text-[11px] text-fuchsia-200/70 truncate">
                          {isThisActive
                            ? `LIVE · ${formatRemainingForOwner(remaining)} · reward: ${template.rewardSkinId}`
                            : `${Math.round(template.defaultDurationSeconds / 60)} min · reward: ${template.rewardSkinId}`}
                        </div>
                      </div>
                      {isThisActive ? (
                        <button
                          onClick={async () => {
                            setSeasonalEventBusy(template.catalogId);
                            setSeasonalEventError(null);
                            try {
                              await endSeasonalEvent(template.catalogId);
                              await supabase.channel('seasonal-events-bus').send({
                                type: 'broadcast',
                                event: 'event-ended',
                                payload: { catalogId: template.catalogId },
                              });
                              setActiveSeasonalEvent(null);
                            } catch (e) {
                              setSeasonalEventError(e instanceof Error ? e.message : String(e));
                            } finally {
                              setSeasonalEventBusy(null);
                            }
                          }}
                          disabled={busy}
                          className="px-3 py-1 rounded text-xs font-bold cursor-pointer border-2 border-red-300 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 whitespace-nowrap"
                        >
                          End Now
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            setSeasonalEventBusy(template.catalogId);
                            setSeasonalEventError(null);
                            try {
                              await startSeasonalEvent({
                                catalogId: template.catalogId,
                                name: template.name,
                                themeKeys: template.themeKeys,
                                rewardSkinId: template.rewardSkinId,
                                durationSeconds: template.defaultDurationSeconds,
                              });
                              await supabase.channel('seasonal-events-bus').send({
                                type: 'broadcast',
                                event: 'event-started',
                                payload: { catalogId: template.catalogId },
                              });
                              // Orange announcement in chat so everyone sees
                              // the event kicked off and remembers to play.
                              void (async () => {
                                try {
                                  await supabase.rpc('insert_chat_announcement', {
                                    p_text: `${template.emoji} ${template.name} just started! Play during the window to earn the limited-edition skin.`,
                                  });
                                } catch { /* ignore */ }
                              })();
                              const fresh = await fetchActiveSeasonalEvent();
                              setActiveSeasonalEvent(fresh);
                            } catch (e) {
                              setSeasonalEventError(e instanceof Error ? e.message : String(e));
                            } finally {
                              setSeasonalEventBusy(null);
                            }
                          }}
                          disabled={busy || otherActive}
                          title={otherActive ? 'End the active event first' : undefined}
                          className="px-3 py-1 rounded text-xs font-bold cursor-pointer border-2 border-fuchsia-300 bg-fuchsia-500 text-white hover:bg-fuchsia-400 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {busy ? '…' : 'Start'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-fuchsia-200/60 mt-2">
                Only players online during the window earn the skin. Players who weren't there see
                a "come back next year" notice on their next visit.
              </p>
            </Section>

            {/* ==================== LIVE CHAT ==================== */}
            <Section title="💬 Live Chat" subtitle="What every player is saying right now · your replies show as 👑 Owner">
              <div className="rounded-lg overflow-hidden border border-fuchsia-400/30" style={{ height: 360 }}>
                <ChatPanel
                  playerId={getPlayerId()}
                  playerName={ownerDisplayName || 'Owner'}
                  variant="owner"
                />
              </div>
            </Section>

            {/* ==================== SELF-GIFT (NO CAPS) ==================== */}
            <Section title="🎁 Self-Gift — No Caps" subtitle={`Current: ${formatNumber(state.cookies)}`}>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={pancakeInput}
                  onChange={e => setPancakeInput(e.target.value)}
                  placeholder="Pancakes — ANY amount (e.g. 1e50)"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                />
                <button
                  onClick={() => {
                    const val = parseFloat(pancakeInput);
                    if (!Number.isFinite(val) || val < 0) return;
                    setDirectState({
                      cookies: val,
                      totalBaked: Math.max(state.totalBaked, val),
                      lifetimeBaked: Math.max(state.lifetimeBaked, val),
                      peakCookies: Math.max(state.peakCookies, val),
                    });
                    setPancakeInput('');
                  }}
                  className="px-4 py-2 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold cursor-pointer hover:bg-fuchsia-400"
                >
                  Set
                </button>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                {[
                  { label: '+1T',  amount: 1e12 },
                  { label: '+1Qa', amount: 1e15 },
                  { label: '+1Qi', amount: 1e18 },
                  { label: '+1Sx', amount: 1e21 },
                  { label: '+1e36', amount: 1e36 },
                  { label: '+1e60', amount: 1e60 },
                  { label: '+1e100', amount: 1e100 },
                ].map(({ label, amount }) => (
                  <QuickButton
                    key={label}
                    label={label}
                    onClick={() => setDirectState({
                      cookies: state.cookies + amount,
                      totalBaked: state.totalBaked + amount,
                      lifetimeBaked: state.lifetimeBaked + amount,
                      peakCookies: Math.max(state.peakCookies, state.cookies + amount),
                    })}
                  />
                ))}
              </div>

              <div className="text-xs font-bold text-fuchsia-200 mb-2 mt-3">Buildings — uncapped</div>
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                {BUILDINGS.map(b => {
                  const current = state.buildingCounts[b.id] || 0;
                  return (
                    <div key={b.id} className="flex items-center gap-2">
                      <span className="text-base w-6 text-center">{b.emoji}</span>
                      <span className="text-xs font-medium text-white flex-1 min-w-0 truncate">{b.name}</span>
                      <span className="text-xs text-fuchsia-200/70 w-10 text-right">{current}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={buildingInputs[b.id] ?? ''}
                        onChange={e => setBuildingInputs(prev => ({ ...prev, [b.id]: e.target.value }))}
                        placeholder={String(current)}
                        className="w-20 px-2 py-1 rounded border border-fuchsia-400/40 bg-black/40 text-white text-xs text-center outline-none focus:border-fuchsia-300"
                      />
                      <button
                        onClick={() => {
                          const val = parseFloat(buildingInputs[b.id] || '');
                          if (!Number.isFinite(val) || val < 0) return;
                          setDirectState({ buildingCounts: { ...state.buildingCounts, [b.id]: val } });
                          setBuildingInputs(prev => ({ ...prev, [b.id]: '' }));
                        }}
                        className="px-2 py-1 rounded border border-fuchsia-300 bg-fuchsia-500 text-white text-xs font-bold cursor-pointer hover:bg-fuchsia-400"
                      >
                        Set
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <QuickButton label="All to 1,000" onClick={() => {
                  const counts: Record<string, number> = {};
                  BUILDINGS.forEach(b => counts[b.id] = 1000);
                  setDirectState({ buildingCounts: counts });
                }} />
                <QuickButton label="All to 1,000,000" onClick={() => {
                  const counts: Record<string, number> = {};
                  BUILDINGS.forEach(b => counts[b.id] = 1_000_000);
                  setDirectState({ buildingCounts: counts });
                }} />
                <QuickButton label="Clear All" onClick={() => setDirectState({ buildingCounts: {} })} danger />
              </div>

              <div className="text-xs font-bold text-fuchsia-200 mb-2 mt-4">Upgrades & Achievements</div>
              <div className="flex gap-2 flex-wrap">
                <QuickButton label="Buy All Building Upgrades" onClick={() => {
                  const purchased: Record<string, boolean> = { ...state.purchasedUpgrades };
                  UPGRADES.forEach(u => purchased[u.id] = true);
                  setDirectState({ purchasedUpgrades: purchased });
                }} />
                <QuickButton label="Buy All Click Upgrades" onClick={() => {
                  const purchased: Record<string, boolean> = { ...state.purchasedClickUpgrades };
                  CLICK_UPGRADES.forEach(u => purchased[u.id] = true);
                  setDirectState({ purchasedClickUpgrades: purchased });
                }} />
                <QuickButton label="Buy Everything" onClick={() => {
                  const pu: Record<string, boolean> = {};
                  UPGRADES.forEach(u => pu[u.id] = true);
                  const pcu: Record<string, boolean> = {};
                  CLICK_UPGRADES.forEach(u => pcu[u.id] = true);
                  setDirectState({ purchasedUpgrades: pu, purchasedClickUpgrades: pcu });
                }} />
                <QuickButton
                  label={`Grant All Achievements (${achievementCount}/${ACHIEVEMENTS.length})`}
                  onClick={grantAllAchievements}
                />
                <QuickButton label="Clear Upgrades" onClick={() => setDirectState({ purchasedUpgrades: {}, purchasedClickUpgrades: {} })} danger />
                <QuickButton label="Clear Achievements" onClick={() => setDirectState({ unlockedAchievements: {} })} danger />
              </div>
            </Section>

            {/* ==================== GIFT TO PLAYER ==================== */}
            <Section title="🎁 Gift a Player" subtitle="Send pancakes, buildings, upgrades, or passwords to any player by name">
              <button
                onClick={() => setGiftModalOpen(true)}
                className="w-full py-3 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-extrabold text-base cursor-pointer hover:bg-fuchsia-400 transition-all"
              >
                🎁 Open Gift Sender
              </button>
              <p className="text-fuchsia-200/70 text-xs mt-2">
                Pick a category → pick an item & amount → pick a recipient from
                the leaderboard → confirm. They get a private notification.
              </p>
            </Section>

            {/* ==================== PLAYER MANAGEMENT ==================== */}
            <Section title="🚫 Player Management" subtitle="Ban / unban by display name">
              <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={banNameInput}
                    onChange={e => { setBanNameInput(e.target.value); setBanMsg(null); }}
                    placeholder="Player display name"
                    className="px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                  />
                  <input
                    type="text"
                    value={banReasonInput}
                    onChange={e => setBanReasonInput(e.target.value)}
                    placeholder="Reason (optional — visible to the banned user)"
                    maxLength={500}
                    className="px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={banBusy || !banNameInput.trim()}
                      onClick={async () => {
                        setBanBusy(true);
                        setBanMsg(null);
                        try {
                          const { error } = await supabase.rpc('ban_name', {
                            p_name: banNameInput.trim(),
                            p_reason: banReasonInput.trim() || null,
                          });
                          if (error) throw error;
                          setBanMsg({ kind: 'ok', text: `Banned "${banNameInput.trim()}".` });
                          setBanNameInput('');
                          setBanReasonInput('');
                        } catch (err) {
                          setBanMsg({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
                        } finally {
                          setBanBusy(false);
                        }
                      }}
                      className="flex-1 py-2 rounded border-2 border-red-300 bg-red-500 text-white font-bold cursor-pointer hover:bg-red-400 disabled:opacity-50"
                    >
                      {banBusy ? '…' : '🚫 Ban'}
                    </button>
                    <button
                      disabled={banBusy || !banNameInput.trim()}
                      onClick={async () => {
                        setBanBusy(true);
                        setBanMsg(null);
                        try {
                          const { error } = await supabase.rpc('unban_name', {
                            p_name: banNameInput.trim(),
                          });
                          if (error) throw error;
                          setBanMsg({ kind: 'ok', text: `Unbanned "${banNameInput.trim()}".` });
                        } catch (err) {
                          setBanMsg({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
                        } finally {
                          setBanBusy(false);
                        }
                      }}
                      className="flex-1 py-2 rounded border-2 border-green-300 bg-green-600 text-white font-bold cursor-pointer hover:bg-green-500 disabled:opacity-50"
                    >
                      ✓ Unban
                    </button>
                  </div>
                  {banMsg && (
                    <p className={`text-xs font-medium ${banMsg.kind === 'ok' ? 'text-green-300' : 'text-red-300'}`}>
                      {banMsg.text}
                    </p>
                  )}
                  <p className="text-xs text-fuchsia-200/70">
                    Banned names see a "🚫 You are banned" screen on next load and can't play under that name.
                    Bypassable by picking a new name — this is honor-system enforcement, not foolproof.
                  </p>
                </div>
            </Section>

            {/* ==================== MINI-GAME CHEATS ==================== */}
            <Section title="🎮 Mini-Game Cheats" subtitle="Toggle any on/off — moved here from the old hacks panel">
              <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                {HACKS.map(hack => {
                  const active = localStorage.getItem(hack.key) === 'true';
                  return (
                    <div key={hack.key} className="flex items-center justify-between gap-2 py-1">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{hack.label}</div>
                        <div className="text-xs text-fuchsia-200/70 truncate">{hack.desc}</div>
                      </div>
                      <button
                        onClick={() => {
                          localStorage.setItem(hack.key, active ? 'false' : 'true');
                          bump();
                        }}
                        className={`px-3 py-1 rounded text-xs font-bold cursor-pointer border transition-all min-w-[50px] ${
                          active
                            ? 'border-green-300 bg-green-100 text-green-700'
                            : 'border-fuchsia-400/40 bg-black/30 text-fuchsia-200'
                        }`}
                      >
                        {active ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  );
                })}

                {/* Pancake Blast inline score editor */}
                {(() => {
                  const currentBlastHigh = parseFloat(localStorage.getItem('pancake-blast-high') || '0');
                  const setBlastScore = async () => {
                    const parsed = parseFloat(blastScoreInput);
                    if (!Number.isFinite(parsed) || parsed < 0) {
                      setBlastScoreMsg({ kind: 'err', text: 'Enter a valid non-negative number.' });
                      return;
                    }
                    if (!playerName) {
                      setBlastScoreMsg({ kind: 'err', text: 'Play any mini-game once to set your player name.' });
                      return;
                    }
                    setBlastScoreBusy(true);
                    setBlastScoreMsg(null);
                    try {
                      localStorage.setItem('pancake-blast-high', String(parsed));
                      const result = await adminSetScore('blast', playerName, parsed);
                      setBlastScoreMsg(result === 'ok'
                        ? { kind: 'ok', text: `Blast score set to ${formatNumber(parsed)}!` }
                        : { kind: 'err', text: 'Saved locally, but leaderboard update failed.' });
                      bump();
                    } finally {
                      setBlastScoreBusy(false);
                    }
                  };
                  return (
                    <div className="border-t border-fuchsia-500/30 mt-2 pt-3 flex flex-col gap-2">
                      <div>
                        <div className="text-sm font-bold text-white">🧱 Pancake Blast</div>
                        <div className="text-xs text-fuchsia-200/70">
                          Set your score directly · Current: <span className="font-bold text-white">{formatNumber(currentBlastHigh)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={blastScoreInput}
                          onChange={e => { setBlastScoreInput(e.target.value); setBlastScoreMsg(null); }}
                          placeholder="any score (no cap)"
                          className="flex-1 min-w-0 px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                        />
                        <button
                          disabled={blastScoreBusy || !blastScoreInput.trim()}
                          onClick={setBlastScore}
                          className="px-4 py-2 rounded border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold text-xs cursor-pointer hover:bg-fuchsia-400 disabled:opacity-50"
                        >
                          {blastScoreBusy ? '…' : 'Set'}
                        </button>
                      </div>
                      {blastScoreMsg && (
                        <p className={`text-xs font-medium ${blastScoreMsg.kind === 'ok' ? 'text-green-400' : 'text-red-300'}`}>
                          {blastScoreMsg.text}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </Section>

            {/* ==================== SCORE EDITOR ==================== */}
            <Section title="🎯 Mini-Game Score Editor" subtitle="Overwrite any game's high score — no cap">
              <div className="flex flex-col gap-3">
                <select
                  value={selectedScoreGame}
                  onChange={e => { setSelectedScoreGame(e.target.value); setNewScoreInput(''); setScoreEditorMsg(null); }}
                  className="w-full px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 cursor-pointer"
                >
                  {Object.entries(GAME_CONFIGS).map(([id, cfg]) => (
                    <option key={id} value={id}>{cfg.label}</option>
                  ))}
                </select>

                {(() => {
                  const config = GAME_CONFIGS[selectedScoreGame];
                  const storedRaw = localStorage.getItem(scoreKey(selectedScoreGame));
                  const currentHigh = storedRaw ? parseFloat(storedRaw) : 0;
                  return (
                    <div className="bg-black/30 rounded p-3 border border-fuchsia-400/30">
                      <div className="text-xs text-fuchsia-200/70">Current highest</div>
                      <div className="text-2xl font-bold text-white">
                        {config ? config.format(currentHigh) : currentHigh}
                      </div>
                      {playerName
                        ? <div className="text-xs text-fuchsia-200/70 mt-1">Player: <span className="font-bold text-white">{playerName}</span></div>
                        : <div className="text-xs text-red-300 mt-1">No player name set. Play any mini-game once.</div>
                      }
                    </div>
                  );
                })()}

                <input
                  type="text"
                  inputMode="decimal"
                  value={newScoreInput}
                  onChange={e => { setNewScoreInput(e.target.value); setScoreEditorMsg(null); }}
                  placeholder="New score — no cap (e.g. 1e50)"
                  className="w-full px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                />

                <button
                  disabled={scoreEditorBusy || !newScoreInput.trim() || !playerName}
                  onClick={async () => {
                    const parsed = parseFloat(newScoreInput);
                    if (!Number.isFinite(parsed) || parsed < 0) {
                      setScoreEditorMsg({ kind: 'err', text: 'Enter a valid non-negative number.' });
                      return;
                    }
                    setScoreEditorBusy(true);
                    setScoreEditorMsg(null);
                    try {
                      localStorage.setItem(scoreKey(selectedScoreGame), String(parsed));
                      const result = await adminSetScore(selectedScoreGame, playerName, parsed);
                      const config = GAME_CONFIGS[selectedScoreGame];
                      if (result === 'ok') {
                        setScoreEditorMsg({ kind: 'ok', text: `Saved ${config?.format(parsed) ?? parsed} for ${config?.label ?? selectedScoreGame}.` });
                      } else {
                        setScoreEditorMsg({ kind: 'err', text: 'Saved locally, but leaderboard update failed.' });
                      }
                    } finally {
                      setScoreEditorBusy(false);
                    }
                  }}
                  className="w-full py-3 rounded-xl border-0 bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scoreEditorBusy ? 'Saving…' : 'Save as new high score'}
                </button>

                {scoreEditorMsg && (
                  <p className={`text-sm font-medium text-center ${scoreEditorMsg.kind === 'ok' ? 'text-green-400' : 'text-red-300'}`}>
                    {scoreEditorMsg.text}
                  </p>
                )}
              </div>
            </Section>

            {/* ==================== PRODUCTION OVERRIDES ==================== */}
            <Section title="📊 Production Overrides" subtitle={`CpS: ${formatCps(cps)} | Click: ${formatNumber(clickPower)}`}>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <label className="text-xs text-fuchsia-200/80 block mb-1">Per Second (CpS)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cpsInput}
                      onChange={e => setCpsInput(e.target.value)}
                      placeholder={cpsOverride !== null ? String(cpsOverride) : 'Natural'}
                      className="flex-1 min-w-0 px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                    />
                    <button
                      onClick={() => {
                        const val = parseFloat(cpsInput);
                        if (Number.isFinite(val) && val >= 0) { onSetCpsOverride(val); setCpsInput(''); }
                      }}
                      className="px-3 py-2 rounded border-2 border-fuchsia-300 bg-fuchsia-500 text-white text-xs font-bold cursor-pointer hover:bg-fuchsia-400"
                    >
                      Set
                    </button>
                    {cpsOverride !== null && (
                      <button onClick={() => onSetCpsOverride(null)} className="px-3 py-2 rounded border-2 border-red-300 bg-red-50 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-100">
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-fuchsia-200/80 block mb-1">Per Click</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={clickInput}
                      onChange={e => setClickInput(e.target.value)}
                      placeholder={clickOverride !== null ? String(clickOverride) : 'Natural'}
                      className="flex-1 min-w-0 px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
                    />
                    <button
                      onClick={() => {
                        const val = parseFloat(clickInput);
                        if (Number.isFinite(val) && val >= 0) { onSetClickOverride(val); setClickInput(''); }
                      }}
                      className="px-3 py-2 rounded border-2 border-fuchsia-300 bg-fuchsia-500 text-white text-xs font-bold cursor-pointer hover:bg-fuchsia-400"
                    >
                      Set
                    </button>
                    {clickOverride !== null && (
                      <button onClick={() => onSetClickOverride(null)} className="px-3 py-2 rounded border-2 border-red-300 bg-red-50 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-100">
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            {/* ==================== OP AUTO CLICKER ==================== */}
            <Section title="🤖 OP Auto Clicker" subtitle={autoClickerOn ? 'ON — 999 DDc / sec' : 'OFF'}>
              <button
                onClick={() => setAutoClickerOn(v => !v)}
                className={`w-full px-4 py-3 rounded-xl border-2 font-bold cursor-pointer transition-all ${
                  autoClickerOn
                    ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-fuchsia-300 bg-fuchsia-500 text-white hover:bg-fuchsia-400'
                }`}
              >
                {autoClickerOn ? 'Turn OFF' : 'Turn ON'}
              </button>
              <p className="text-xs text-fuchsia-200/70 mt-2">
                Adds 999 duodecillion (9.99 × 10<sup>41</sup>) pancakes per second straight to your stack
                and bumps totalClicks at the same rate. Click achievements unlock instantly. Keeps running with the panel closed.
              </p>
            </Section>

            {/* ==================== TIME ==================== */}
            <Section title="⏰ Time Simulation" subtitle={`CpS: ${formatCps(cps)}`}>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={timeValue}
                  onChange={e => setTimeValue(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300"
                />
                <select
                  value={timeUnit}
                  onChange={e => setTimeUnit(Number(e.target.value))}
                  className="px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300 cursor-pointer"
                >
                  {TIME_UNITS.map(u => (
                    <option key={u.label} value={u.seconds}>{u.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-fuchsia-200/70 mb-2">
                Will add: <span className="font-bold text-white">{formatNumber(timePreview)}</span> pancakes
              </p>
              <button
                onClick={() => {
                  if (timeSeconds > 0) simulateTime(timeSeconds);
                }}
                className="w-full py-2 rounded border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold cursor-pointer hover:bg-fuchsia-400"
              >
                Simulate Time
              </button>
            </Section>

            {/* ==================== FRENZY ==================== */}
            <Section title="⚡ CPS Multiplier" subtitle={frenzyMult > 1 ? `Active: ${frenzyMult}x` : 'No frenzy'}>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={frenzyMultInput}
                  onChange={e => setFrenzyMultInput(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300"
                  placeholder="Multiplier"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={frenzyDurInput}
                  onChange={e => setFrenzyDurInput(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded border-2 border-fuchsia-400/40 bg-black/40 text-white font-medium outline-none focus:border-fuchsia-300"
                  placeholder="Duration (sec)"
                />
              </div>
              <button
                onClick={() => {
                  const mult = parseFloat(frenzyMultInput || '1');
                  const dur = parseFloat(frenzyDurInput || '60');
                  if (mult >= 1 && dur > 0) activateFrenzy(mult, dur);
                }}
                className="w-full py-2 rounded border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold cursor-pointer hover:bg-fuchsia-400"
              >
                Activate Frenzy
              </button>
            </Section>

            {/* ==================== BUTTER PAT ==================== */}
            <Section title="🧈 Butter Pat">
              <button
                onClick={onForceButterPat}
                className="w-full py-3 rounded border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold cursor-pointer hover:bg-fuchsia-400"
              >
                Spawn Butter Pat Now
              </button>
            </Section>

            {/* ==================== DANGER ZONE ==================== */}
            <Section title="🗑️ Danger Zone" danger>
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full py-3 rounded border-2 border-red-400 bg-red-50 text-red-600 font-bold cursor-pointer hover:bg-red-100 transition-colors"
                >
                  Reset All Save Data
                </button>
              ) : (
                <div className="bg-red-50 rounded p-4 border-2 border-red-300">
                  <p className="text-sm text-red-700 font-semibold mb-3">
                    This permanently deletes ALL progress. Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { resetSave(); setConfirmReset(false); handleClose(); }}
                      className="flex-1 py-2 rounded bg-red-500 text-white font-bold cursor-pointer hover:bg-red-600 border-0"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="flex-1 py-2 rounded bg-gray-200 text-gray-600 font-bold cursor-pointer hover:bg-gray-300 border-0"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Section>

          </div>
        </div>
      </div>

      <GiftModal isOpen={giftModalOpen} onClose={() => setGiftModalOpen(false)} />
    </>
  );
}

function formatRemainingForOwner(ms: number): string {
  if (ms <= 0) return 'expired';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Section({ title, subtitle, danger, children }: {
  title: string;
  subtitle?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 border-2"
      style={{
        background: danger ? 'rgba(220, 38, 38, 0.08)' : 'rgba(255, 100, 220, 0.06)',
        borderColor: danger ? 'rgba(220, 38, 38, 0.4)' : 'rgba(255, 100, 220, 0.3)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="glitch-section text-sm font-bold text-white" data-text={title}>{title}</h3>
        {subtitle && <span className="text-xs text-fuchsia-200/70">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function QuickButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
        danger
          ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
          : 'border-fuchsia-300/60 bg-black/30 text-fuchsia-100 hover:bg-fuchsia-500/30'
      }`}
    >
      {label}
    </button>
  );
}

const GLITCH_STYLES = `
.glitch-title {
  position: relative;
  display: inline-block;
}
.glitch-title::before,
.glitch-title::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.glitch-title::before {
  color: #ff00ff;
  animation: owner-glitch-1 2.4s infinite linear alternate-reverse;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
}
.glitch-title::after {
  color: #00ffff;
  animation: owner-glitch-2 2.4s infinite linear alternate-reverse;
  clip-path: polygon(0 60%, 100% 60%, 100% 100%, 0 100%);
}
.glitch-section {
  position: relative;
  display: inline-block;
}
.glitch-section::before {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  color: rgba(255, 0, 200, 0.55);
  pointer-events: none;
  animation: owner-glitch-1 3.5s infinite linear alternate-reverse;
  clip-path: polygon(0 0, 100% 0, 100% 50%, 0 50%);
}
@keyframes owner-glitch-1 {
  0%   { transform: translate(0); }
  20%  { transform: translate(-2px, 1px); }
  40%  { transform: translate(-1px, -1px); }
  60%  { transform: translate(1px, 1px); }
  80%  { transform: translate(2px, -1px); }
  100% { transform: translate(0); }
}
@keyframes owner-glitch-2 {
  0%   { transform: translate(0); }
  20%  { transform: translate(2px, -1px); }
  40%  { transform: translate(1px, 1px); }
  60%  { transform: translate(-1px, -1px); }
  80%  { transform: translate(-2px, 1px); }
  100% { transform: translate(0); }
}
.glitch-btn {
  position: relative;
  display: inline-block;
}
.glitch-btn::before,
.glitch-btn::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.glitch-btn::before {
  color: rgba(255, 0, 220, 0.7);
  animation: owner-glitch-1 2s infinite linear alternate-reverse;
}
.glitch-btn::after {
  color: rgba(0, 220, 255, 0.7);
  animation: owner-glitch-2 2s infinite linear alternate-reverse;
}
`;

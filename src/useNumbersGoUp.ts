import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type BigNum,
  BN_ZERO,
  bnFromJSON,
  bnMax,
  bnToJSON,
} from './bignum';
import {
  growOneSecond,
  growBySeconds,
  highestUnlockedTier,
  findTier,
  MAX_OFFLINE_SECONDS,
} from './numbersGoUp';
import { submitNguScore } from './nguLeaderboardApi';

// Standalone localStorage persistence — kept out of the central game save so
// the big-number value never has to round-trip through that schema. The
// counter runs continuously (even with the modal closed) and accrues offline
// via timestamp catch-up, so the number "keeps climbing forever".
const NGU_KEY = 'pancake-ngu-save-v1';

interface NguSave {
  value: { m: number; e: number };
  best: { m: number; e: number };
  tier: number;
  lastTick: number;
}

interface NguPersistState {
  value: BigNum;
  best: BigNum;
  tier: number;
}

function loadNgu(nowMs: number): NguPersistState {
  try {
    const raw = localStorage.getItem(NGU_KEY);
    if (!raw) return { value: BN_ZERO, best: BN_ZERO, tier: 0 };
    const s = JSON.parse(raw) as Partial<NguSave>;
    let value = bnFromJSON(s.value);
    let best = bnFromJSON(s.best);
    const tier = typeof s.tier === 'number' && findTier(s.tier) ? s.tier : 0;
    // Offline catch-up: apply elapsed real seconds at the active tier.
    const lastTick = typeof s.lastTick === 'number' ? s.lastTick : nowMs;
    const elapsed = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, Math.floor((nowMs - lastTick) / 1000)));
    if (elapsed > 0) value = growBySeconds(value, tier, elapsed);
    best = bnMax(best, value);
    return { value, best, tier };
  } catch {
    return { value: BN_ZERO, best: BN_ZERO, tier: 0 };
  }
}

function saveNgu(state: NguPersistState, nowMs: number) {
  try {
    const save: NguSave = {
      value: bnToJSON(state.value),
      best: bnToJSON(state.best),
      tier: state.tier,
      lastTick: nowMs,
    };
    localStorage.setItem(NGU_KEY, JSON.stringify(save));
  } catch { /* quota */ }
}

export interface UseNumbersGoUpReturn {
  value: BigNum;
  best: BigNum;
  tier: number;
  /** Buy/activate a tier — only succeeds if its threshold has been reached.
   *  Does NOT spend the running number. */
  buyTier: (tierId: number) => void;
  /** Owner override: set the current number directly. Also bumps best. */
  ownerSetValue: (v: BigNum) => void;
  /** Owner override: set the active growth tier directly (ignores threshold). */
  ownerSetTier: (tierId: number) => void;
}

interface UseNumbersGoUpOpts {
  /** Leaderboard display name, or null to skip submitting. */
  playerName: string | null;
}

export function useNumbersGoUp(opts: UseNumbersGoUpOpts): UseNumbersGoUpReturn {
  const { playerName } = opts;
  const [init] = useState(() => loadNgu(Date.now()));
  const [value, setValue] = useState<BigNum>(init.value);
  const [best, setBest] = useState<BigNum>(init.best);
  const [tier, setTier] = useState<number>(init.tier);

  // Refs so the 1 Hz tick + persistence always see the latest without
  // re-subscribing each render.
  const valueRef = useRef(value); valueRef.current = value;
  const bestRef = useRef(best); bestRef.current = best;
  const tierRef = useRef(tier); tierRef.current = tier;

  // 1 Hz growth tick. Runs continuously while the app is open.
  useEffect(() => {
    const id = window.setInterval(() => {
      setValue(prev => {
        const next = growOneSecond(prev, tierRef.current);
        setBest(b => bnMax(b, next));
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Persist every 5s + on unload, stamping lastTick for offline catch-up.
  useEffect(() => {
    const persist = () => saveNgu(
      { value: valueRef.current, best: bestRef.current, tier: tierRef.current },
      Date.now(),
    );
    const id = window.setInterval(persist, 5000);
    window.addEventListener('beforeunload', persist);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('beforeunload', persist);
      persist();
    };
  }, []);

  // Throttled leaderboard submit when best improves and we have a name.
  const lastSubmittedRef = useRef<BigNum | null>(null);
  useEffect(() => {
    if (!playerName) return;
    const id = window.setInterval(() => {
      const b = bestRef.current;
      if (b.m === 0) return;
      const last = lastSubmittedRef.current;
      if (last && last.e === b.e && last.m === b.m) return;
      lastSubmittedRef.current = b;
      void submitNguScore(playerName, b).catch(() => { /* swallow — retried next interval */ });
    }, 15000);
    return () => window.clearInterval(id);
  }, [playerName]);

  const buyTier = useCallback((tierId: number) => {
    const t = findTier(tierId);
    if (!t) return;
    // Only allow if the value has reached the tier's threshold.
    if (t.id !== 0 && highestUnlockedTier(valueRef.current).id < t.id) return;
    setTier(tierId);
  }, []);

  const ownerSetValue = useCallback((v: BigNum) => {
    setValue(v);
    setBest(b => bnMax(b, v));
  }, []);

  const ownerSetTier = useCallback((tierId: number) => {
    if (findTier(tierId)) setTier(tierId);
  }, []);

  return { value, best, tier, buyTier, ownerSetValue, ownerSetTier };
}

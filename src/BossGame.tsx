import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatNumber } from './gameData';

interface BossGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

const STATE_KEY = 'pancake-boss-state';
const HIGH_KEY = 'pancake-boss-high';
const HACK_ONESHOT = 'pancake-hack-boss-oneshot';
const CRIT_MULT = 5;
const CRIT_CHANCE_MAX = 0.5;

interface BossState {
  level: number;          // boss currently being fought (1 = first)
  hp: number;             // current HP of that boss
  dmgLevel: number;       // 0 = base 1 dmg
  critLevel: number;      // 0 = base 0% crit chance
  pp: number;             // pancake points
  tutorialSeen: boolean;  // shown after defeating boss 1
}

const DEFAULT_STATE: BossState = {
  level: 1,
  hp: 1,
  dmgLevel: 0,
  critLevel: 0,
  pp: 0,
  tutorialSeen: false,
};

function bossMaxHp(level: number): number {
  if (level <= 1) return 1;
  return Math.pow(5, level - 1);
}

function defeatReward(level: number): number {
  if (level === 1) return 100;
  return 5 * Math.pow(3, level - 2);
}

function clickDamage(dmgLevel: number): number {
  // Triangular scaling: 1st upgrade adds +1, 2nd adds +2, 3rd adds +3, …
  // Total damage after N upgrades = 1 + (1+2+…+N) = 1 + N(N+1)/2.
  return 1 + (dmgLevel * (dmgLevel + 1)) / 2;
}

function critChance(critLevel: number): number {
  return Math.min(CRIT_CHANCE_MAX, critLevel * 0.02);
}

function dmgUpgradeCost(dmgLevel: number): number {
  return Math.ceil(10 * Math.pow(1.15, dmgLevel));
}

function critUpgradeCost(critLevel: number): number {
  return Math.ceil(15 * Math.pow(1.4, critLevel));
}

const BUY_MAX_SAFETY = 10_000;

function loadState(): BossState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<BossState>;
    return {
      level: Math.max(1, parsed.level ?? 1),
      hp: parsed.hp ?? bossMaxHp(parsed.level ?? 1),
      dmgLevel: Math.max(0, parsed.dmgLevel ?? 0),
      critLevel: Math.max(0, parsed.critLevel ?? 0),
      pp: Math.max(0, parsed.pp ?? 0),
      tutorialSeen: !!parsed.tutorialSeen,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

interface FloatNum {
  id: number;
  x: number;
  y: number;
  amount: number;
  crit: boolean;
}

export function BossGame({ onBack, onScore }: BossGameProps) {
  const [state, setState] = useState<BossState>(loadState);
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [showDefeat, setShowDefeat] = useState<{ levelDefeated: number; reward: number } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hitFlash, setHitFlash] = useState(0);
  const floatIdRef = useRef(0);

  // Persist on every change.
  useEffect(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [state]);

  const maxHp = useMemo(() => bossMaxHp(state.level), [state.level]);
  const dmg = clickDamage(state.dmgLevel);
  const crit = critChance(state.critLevel);

  const handleHit = useCallback((evt: React.PointerEvent<HTMLDivElement>) => {
    if (showDefeat || showTutorial) return;

    const oneShot = localStorage.getItem(HACK_ONESHOT) === 'true';
    const isCrit = Math.random() < crit;
    const baseDmg = oneShot ? maxHp : dmg;
    const damage = isCrit ? baseDmg * CRIT_MULT : baseDmg;

    const rect = evt.currentTarget.getBoundingClientRect();
    const fx = evt.clientX - rect.left;
    const fy = evt.clientY - rect.top;

    setFloats(prev => {
      const next = [...prev, { id: ++floatIdRef.current, x: fx, y: fy, amount: damage, crit: isCrit }];
      return next.slice(-12);
    });
    setHitFlash(n => n + 1);

    setState(prev => {
      const newHp = prev.hp - damage;
      if (newHp > 0) return { ...prev, hp: newHp };

      // Boss defeated — open the defeat modal, then user clicks Continue.
      const reward = defeatReward(prev.level);
      const defeatedLevel = prev.level;
      const newLevel = prev.level + 1;
      const next: BossState = {
        ...prev,
        level: newLevel,
        hp: bossMaxHp(newLevel),
        pp: prev.pp + reward,
      };
      setShowDefeat({ levelDefeated: defeatedLevel, reward });
      try {
        const prevHigh = Number(localStorage.getItem(HIGH_KEY) ?? 0);
        if (defeatedLevel > prevHigh) {
          localStorage.setItem(HIGH_KEY, String(defeatedLevel));
          onScore?.('boss', defeatedLevel);
        }
      } catch { /* ignore */ }
      return next;
    });
  }, [dmg, crit, maxHp, showDefeat, showTutorial, onScore]);

  // Clear floating numbers after they animate out.
  useEffect(() => {
    if (floats.length === 0) return;
    const t = setTimeout(() => {
      setFloats(prev => prev.slice(Math.max(0, prev.length - 6)));
    }, 800);
    return () => clearTimeout(t);
  }, [floats]);

  const closeDefeat = () => {
    const wasFirst = showDefeat?.levelDefeated === 1;
    setShowDefeat(null);
    if (wasFirst && !state.tutorialSeen) {
      setShowTutorial(true);
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    setState(prev => ({ ...prev, tutorialSeen: true }));
  };

  const buyDmg = () => {
    const cost = dmgUpgradeCost(state.dmgLevel);
    if (state.pp < cost) return;
    setState(prev => ({ ...prev, pp: prev.pp - cost, dmgLevel: prev.dmgLevel + 1 }));
  };

  const buyDmgMax = () => {
    setState(prev => {
      let pp = prev.pp;
      let dmgLevel = prev.dmgLevel;
      let safety = 0;
      while (safety < BUY_MAX_SAFETY) {
        const cost = dmgUpgradeCost(dmgLevel);
        if (pp < cost) break;
        pp -= cost;
        dmgLevel += 1;
        safety += 1;
      }
      if (dmgLevel === prev.dmgLevel) return prev;
      return { ...prev, pp, dmgLevel };
    });
  };

  const buyCrit = () => {
    if (crit >= CRIT_CHANCE_MAX) return;
    const cost = critUpgradeCost(state.critLevel);
    if (state.pp < cost) return;
    setState(prev => ({ ...prev, pp: prev.pp - cost, critLevel: prev.critLevel + 1 }));
  };

  const buyCritMax = () => {
    setState(prev => {
      let pp = prev.pp;
      let critLevel = prev.critLevel;
      let safety = 0;
      while (safety < BUY_MAX_SAFETY) {
        if (critChance(critLevel) >= CRIT_CHANCE_MAX) break;
        const cost = critUpgradeCost(critLevel);
        if (pp < cost) break;
        pp -= cost;
        critLevel += 1;
        safety += 1;
      }
      if (critLevel === prev.critLevel) return prev;
      return { ...prev, pp, critLevel };
    });
  };

  const resetRun = () => {
    if (!confirm('Reset all Pancake Boss progress? You will lose all PP and upgrades.')) return;
    setState(DEFAULT_STATE);
    localStorage.removeItem(HIGH_KEY);
  };

  const hpPct = Math.max(0, Math.min(1, state.hp / maxHp));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Pancake Boss</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Tap the angry pancake. Survive the rising tide.</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {/* Top status strip */}
        <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
          <div className="flex flex-col">
            <span className="font-bold text-pancake-brown">Level {state.level}</span>
            <span className="text-[10px] text-pancake-medium">{formatNumber(dmg)} dmg/click · {Math.round(crit * 100)}% crit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-bold text-pancake-brown text-base">💰 {formatNumber(state.pp)} PP</div>
            <button
              onClick={() => setShopOpen(true)}
              className="px-3 py-1 rounded-lg bg-pancake-gold text-pancake-brown text-xs font-bold border-0 cursor-pointer hover:brightness-105"
            >
              Upgrade Shop
            </button>
          </div>
        </div>

        {/* Boss arena */}
        <div
          className="relative select-none overflow-hidden cursor-pointer"
          style={{ height: 380, background: 'radial-gradient(circle at 50% 35%, #FFE6B8 0%, #FFD27A 65%, #C08838 100%)', touchAction: 'manipulation' }}
          onPointerDown={handleHit}
        >
          {/* Boss sprite */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              key={hitFlash}
              className="relative"
              style={{
                animation: 'boss-hit 0.18s ease-out',
              }}
            >
              {/* Robot arms */}
              <div className="absolute text-5xl select-none" style={{ left: -64, top: 40 }}>🦾</div>
              <div className="absolute text-5xl select-none" style={{ right: -64, top: 40, transform: 'scaleX(-1)' }}>🦾</div>
              {/* Body — big pancake */}
              <div className="text-[10rem] leading-none select-none drop-shadow-lg">🥞</div>
              {/* Angry face overlay */}
              <div className="absolute inset-0 flex items-center justify-center text-5xl select-none" style={{ marginTop: -12 }}>😠</div>
              {/* Robot legs */}
              <div className="absolute text-4xl select-none" style={{ left: 30, bottom: -36 }}>🦿</div>
              <div className="absolute text-4xl select-none" style={{ right: 30, bottom: -36, transform: 'scaleX(-1)' }}>🦿</div>
            </div>
          </div>

          {/* Floating damage numbers */}
          {floats.map(f => (
            <div
              key={f.id}
              className="absolute pointer-events-none font-extrabold select-none"
              style={{
                left: f.x,
                top: f.y,
                color: f.crit ? '#dc2626' : '#4A3728',
                fontSize: f.crit ? 32 : 22,
                textShadow: '0 1px 2px rgba(255,255,255,0.9)',
                animation: 'float-up 0.8s ease-out forwards',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {f.crit ? `CRIT! ${f.amount}` : `-${f.amount}`}
            </div>
          ))}

          {/* HP bar */}
          <div className="absolute left-4 right-4 bottom-4">
            <div className="w-full h-5 bg-black/30 rounded-full overflow-hidden border border-black/40">
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${hpPct * 100}%`,
                  background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                }}
              />
            </div>
            <div className="text-center text-xs font-bold text-pancake-brown mt-1">
              {formatNumber(Math.max(0, Math.ceil(state.hp)))} / {formatNumber(maxHp)} HP
            </div>
          </div>
        </div>

        {/* Footer instructions */}
        <div className="px-4 py-3 text-center text-xs text-pancake-medium">
          Tap the boss to deal damage. Earn PP per defeat. Spend it in the shop.
          <button onClick={resetRun} className="block mx-auto mt-1 text-[10px] underline text-pancake-medium/70 bg-transparent border-0 cursor-pointer">
            reset progress
          </button>
        </div>
      </div>

      {/* Defeat overlay */}
      {showDefeat && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="text-5xl mb-2">🎉</div>
            <h3 className="text-xl font-bold text-pancake-brown mb-2">
              {showDefeat.levelDefeated === 1
                ? 'Boss defeated!'
                : `Level ${showDefeat.levelDefeated} cleared!`}
            </h3>
            <p className="text-pancake-brown leading-relaxed mb-2">
              {showDefeat.levelDefeated === 1
                ? <>Congratulations, you are now moving on to level 2 boss, which will have <b>5 health</b> instead of the 1.</>
                : <>Next up: <b>Level {showDefeat.levelDefeated + 1}</b> with <b>{formatNumber(bossMaxHp(showDefeat.levelDefeated + 1))} HP</b>.</>}
            </p>
            <p className="text-pancake-brown mb-4">
              You earned <span className="font-bold text-amber-600">+{formatNumber(showDefeat.reward)} PP</span>.
            </p>
            <button
              onClick={closeDefeat}
              className="w-full py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-base border-0 cursor-pointer hover:brightness-105"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Tutorial overlay (one-time, after first defeat) */}
      {showTutorial && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center text-3xl mb-2">📖</div>
            <h3 className="text-lg font-bold text-pancake-brown mb-3 text-center">How upgrades work</h3>
            <div className="text-sm text-pancake-brown leading-relaxed space-y-2">
              <p>
                Now that you've defeated the first boss and are moving on to the second boss (5 HP), what you'll need to do is upgrade your <b>damage per click</b> in the upgrade shop.
              </p>
              <p>
                You can also upgrade your <b>accuracy bonus chance</b>, which gives you <b>×{CRIT_MULT}</b> the damage you would usually do. It's rare, but each upgrade boosts your odds.
              </p>
              <p>
                For example, if you're doing 2 damage per click and your accuracy bonus pops, that one hit would do <b>{2 * CRIT_MULT}</b> damage instead.
              </p>
              <p className="text-pancake-medium text-xs">
                You start with <b>100 PP</b> from clearing the first boss — spend it however you like. Later bosses give smaller rewards but you'll have stronger clicks.
              </p>
            </div>
            <button
              onClick={closeTutorial}
              className="w-full mt-5 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-base border-0 cursor-pointer hover:brightness-105"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Upgrade shop */}
      {shopOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShopOpen(false)}>
          <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-pancake-brown">🛠️ Upgrade Shop</h3>
              <div className="font-bold text-pancake-brown">💰 {formatNumber(state.pp)} PP</div>
            </div>

            {/* Click damage */}
            <UpgradeRow
              icon="👊"
              title="Click Damage"
              currentLabel={`${formatNumber(dmg)} dmg/click`}
              nextLabel={`→ ${formatNumber(clickDamage(state.dmgLevel + 1))} dmg/click`}
              cost={dmgUpgradeCost(state.dmgLevel)}
              affordable={state.pp >= dmgUpgradeCost(state.dmgLevel)}
              onBuy={buyDmg}
              onBuyMax={buyDmgMax}
            />

            {/* Crit chance */}
            <UpgradeRow
              icon="🎯"
              title="Accuracy Bonus"
              currentLabel={`${Math.round(crit * 100)}% chance for ×${CRIT_MULT} damage`}
              nextLabel={crit >= CRIT_CHANCE_MAX
                ? 'Max'
                : `→ ${Math.round(critChance(state.critLevel + 1) * 100)}% chance`}
              cost={critUpgradeCost(state.critLevel)}
              affordable={state.pp >= critUpgradeCost(state.critLevel) && crit < CRIT_CHANCE_MAX}
              onBuy={buyCrit}
              onBuyMax={buyCritMax}
              maxed={crit >= CRIT_CHANCE_MAX}
            />

            <button
              onClick={() => setShopOpen(false)}
              className="w-full mt-3 py-2 rounded-lg bg-pancake-warm text-pancake-brown text-sm font-bold border-2 border-shop-border cursor-pointer"
            >
              Back to fight
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float-up {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -180%) scale(1.1); opacity: 0; }
        }
        @keyframes boss-hit {
          0% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.06) rotate(-3deg); }
          60% { transform: scale(0.96) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

interface UpgradeRowProps {
  icon: string;
  title: string;
  currentLabel: string;
  nextLabel: string;
  cost: number;
  affordable: boolean;
  onBuy: () => void;
  onBuyMax: () => void;
  maxed?: boolean;
}

function UpgradeRow({ icon, title, currentLabel, nextLabel, cost, affordable, onBuy, onBuyMax, maxed }: UpgradeRowProps) {
  return (
    <div className="rounded-xl border-2 border-shop-border bg-pancake-warm p-3 mb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-pancake-brown text-sm">{icon} {title}</div>
          <div className="text-xs text-pancake-medium">{currentLabel}</div>
          <div className="text-[11px] text-pancake-medium/80">{nextLabel}</div>
        </div>
        {maxed ? (
          <button
            disabled
            className="px-3 py-2 rounded-lg bg-pancake-gold/40 text-pancake-brown text-xs font-bold border-0 cursor-not-allowed whitespace-nowrap self-start"
          >
            MAX
          </button>
        ) : (
          <div className="flex flex-col gap-1 items-stretch min-w-[96px]">
            <button
              onClick={onBuy}
              disabled={!affordable}
              className="px-3 py-2 rounded-lg bg-pancake-gold text-pancake-brown text-xs font-bold border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {formatNumber(cost)} PP
            </button>
            <button
              onClick={onBuyMax}
              disabled={!affordable}
              className="px-2 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-pancake-brown text-[10px] font-bold border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
              title="Auto-buy as many as you can afford"
            >
              Buy max
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

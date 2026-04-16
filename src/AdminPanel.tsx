import { useState } from 'react';
import type { GameState } from './useGameState';
import { BUILDINGS, UPGRADES, CLICK_UPGRADES, formatNumber, formatCps } from './gameData';
import { ACHIEVEMENTS } from './achievements';
import { GAME_CONFIGS, adminSetScore } from './leaderboardApi';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  cps: number;
  baseCps: number;
  clickPower: number;
  frenzyMult: number;
  setDirectState: (partial: Partial<GameState>) => void;
  addCookies: (amount: number) => void;
  grantAllAchievements: () => void;
  resetSave: () => void;
  simulateTime: (seconds: number) => void;
  activateFrenzy: (mult: number, dur: number) => void;
  onForceButterPat: () => void;
  onSetCpsOverride: (cps: number | null) => void;
  onSetClickOverride: (power: number | null) => void;
  cpsOverride: number | null;
  clickOverride: number | null;
}

const ADMIN_PASSWORD = 'bcdm9812';
const SCORE_EDITOR_PASSWORD = 'thisisthepassword';

// localStorage keys for per-game high scores (most use '-high', split/edge use '-best')
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

const MAX_TIME_SECONDS = 100 * 31536000; // 100 years

export function AdminPanel({
  isOpen, onClose, state, cps, baseCps: _baseCps, clickPower, frenzyMult,
  setDirectState, addCookies: _addCookies, grantAllAchievements, resetSave, simulateTime,
  activateFrenzy, onForceButterPat,
  onSetCpsOverride, onSetClickOverride, cpsOverride, clickOverride,
}: AdminPanelProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Pancake count
  const [pancakeInput, setPancakeInput] = useState('');

  // Buildings
  const [buildingInputs, setBuildingInputs] = useState<Record<string, string>>({});

  // Time simulation
  const [timeValue, setTimeValue] = useState('1');
  const [timeUnit, setTimeUnit] = useState(3600); // default hours

  // Frenzy
  const [frenzyMultInput, setFrenzyMultInput] = useState('100');
  const [frenzyDurInput, setFrenzyDurInput] = useState('60');

  // CPS / Click overrides
  const [cpsInput, setCpsInput] = useState('');
  const [clickInput, setClickInput] = useState('');

  // Reset confirmation
  const [confirmReset, setConfirmReset] = useState(false);

  // Mini Game Score Editor
  const [scoreEditorOpen, setScoreEditorOpen] = useState(false);
  const [scoreEditorUnlocked, setScoreEditorUnlocked] = useState(false);
  const [scoreEditorPwInput, setScoreEditorPwInput] = useState('');
  const [scoreEditorPwError, setScoreEditorPwError] = useState(false);
  const [selectedScoreGame, setSelectedScoreGame] = useState<string>('split');
  const [newScoreInput, setNewScoreInput] = useState('');
  const [scoreEditorMsg, setScoreEditorMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [scoreEditorBusy, setScoreEditorBusy] = useState(false);

  // Force re-render for hack toggles
  const [, setTick] = useState(0);

  if (!isOpen) return null;

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError(false);
      setPasswordInput('');
      localStorage.setItem('pancake-admin-unlocked', 'true');
    } else {
      setPasswordError(true);
    }
  };

  const handleClose = () => {
    setAuthenticated(false);
    setPasswordInput('');
    setPasswordError(false);
    setConfirmReset(false);
    onClose();
  };

  // Password screen
  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
        <div className="bg-pancake-cream rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4" onClick={e => e.stopPropagation()}>
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-2xl font-bold text-pancake-brown mb-4">Admin Panel</h2>
          <input
            type="password"
            value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Enter password..."
            className={`w-full px-4 py-3 rounded-xl border-2 text-center text-pancake-brown font-medium bg-pancake-warm outline-none ${
              passwordError ? 'border-red-400 animate-shake' : 'border-shop-border focus:border-pancake-gold'
            }`}
            autoFocus
          />
          {passwordError && (
            <p className="text-red-500 text-sm mt-2 font-medium">Wrong password!</p>
          )}
          <button
            onClick={handleLogin}
            className="mt-4 w-full py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105 transition-all"
          >
            Unlock
          </button>
          <p className="text-pancake-medium text-xs mt-3">Click outside to cancel</p>
        </div>
      </div>
    );
  }

  const achievementCount = Object.keys(state.unlockedAchievements).filter(k => state.unlockedAchievements[k]).length;
  const totalAchievements = ACHIEVEMENTS.length;

  const timeSeconds = Math.min(parseFloat(timeValue || '0') * timeUnit, MAX_TIME_SECONDS);
  const timePreview = cps * timeSeconds;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-pancake-cream rounded-t-2xl border-b-2 border-shop-border/30 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-pancake-brown">⚙️ Admin Panel</h2>
          <button
            onClick={handleClose}
            className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">

          {/* Section 1: Pancake Count */}
          <Section title="🥞 Pancake Count" subtitle={`Current: ${formatNumber(state.cookies)}`}>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                value={pancakeInput}
                onChange={e => setPancakeInput(e.target.value)}
                placeholder="Set pancake count..."
                className="flex-1 px-3 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown font-medium outline-none focus:border-pancake-gold"
              />
              <button
                onClick={() => {
                  const val = parseFloat(pancakeInput);
                  if (!isNaN(val) && val >= 0) {
                    setDirectState({ cookies: val, totalBaked: Math.max(state.totalBaked, val), lifetimeBaked: Math.max(state.lifetimeBaked, val) });
                    setPancakeInput('');
                  }
                }}
                className="px-4 py-2 rounded-lg border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105"
              >
                Set
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: '+1K', amount: 1e3 },
                { label: '+1M', amount: 1e6 },
                { label: '+1B', amount: 1e9 },
                { label: '+1T', amount: 1e12 },
                { label: '+1Qa', amount: 1e15 },
              ].map(({ label, amount }) => (
                <QuickButton
                  key={label}
                  label={label}
                  onClick={() => setDirectState({
                    cookies: state.cookies + amount,
                    totalBaked: state.totalBaked + amount,
                    lifetimeBaked: state.lifetimeBaked + amount,
                  })}
                />
              ))}
            </div>
          </Section>

          {/* Section: Production Overrides */}
          <Section title="📊 Production Overrides" subtitle={`CpS: ${formatCps(cps)} | Click: ${formatNumber(clickPower)}`}>
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <label className="text-xs text-pancake-medium block mb-1">Per Second (CpS)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={cpsInput}
                    onChange={e => setCpsInput(e.target.value)}
                    placeholder={cpsOverride !== null ? String(cpsOverride) : 'Natural'}
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown font-medium outline-none focus:border-pancake-gold"
                  />
                  <button
                    onClick={() => {
                      const val = parseFloat(cpsInput);
                      if (!isNaN(val) && val >= 0) { onSetCpsOverride(val); setCpsInput(''); }
                    }}
                    className="px-3 py-2 rounded-lg border-2 border-pancake-gold bg-pancake-gold text-pancake-brown text-xs font-bold cursor-pointer hover:brightness-105"
                  >
                    Set
                  </button>
                  {cpsOverride !== null && (
                    <button onClick={() => onSetCpsOverride(null)} className="px-3 py-2 rounded-lg border-2 border-red-300 bg-red-50 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-100">
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-pancake-medium block mb-1">Per Click</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={clickInput}
                    onChange={e => setClickInput(e.target.value)}
                    placeholder={clickOverride !== null ? String(clickOverride) : 'Natural'}
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown font-medium outline-none focus:border-pancake-gold"
                  />
                  <button
                    onClick={() => {
                      const val = parseFloat(clickInput);
                      if (!isNaN(val) && val >= 0) { onSetClickOverride(val); setClickInput(''); }
                    }}
                    className="px-3 py-2 rounded-lg border-2 border-pancake-gold bg-pancake-gold text-pancake-brown text-xs font-bold cursor-pointer hover:brightness-105"
                  >
                    Set
                  </button>
                  {clickOverride !== null && (
                    <button onClick={() => onSetClickOverride(null)} className="px-3 py-2 rounded-lg border-2 border-red-300 bg-red-50 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-100">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-pancake-medium">
              {cpsOverride !== null && <span className="text-pancake-gold font-bold mr-2">CpS override active: {formatNumber(cpsOverride)}/s</span>}
              {clickOverride !== null && <span className="text-pancake-gold font-bold">Click override active: {formatNumber(clickOverride)}/click</span>}
              {cpsOverride === null && clickOverride === null && 'Set custom values to override natural production. Clear to return to normal.'}
            </p>
          </Section>

          {/* Section 2: Buildings */}
          <Section title="🏗️ Buildings">
            <div className="flex flex-col gap-2">
              {BUILDINGS.map(b => {
                const current = state.buildingCounts[b.id] || 0;
                return (
                  <div key={b.id} className="flex items-center gap-2">
                    <span className="text-lg w-6 text-center">{b.emoji}</span>
                    <span className="text-sm font-medium text-pancake-brown flex-1 min-w-0 truncate">{b.name}</span>
                    <span className="text-xs text-pancake-medium w-8 text-right">{current}</span>
                    <input
                      type="number"
                      value={buildingInputs[b.id] ?? ''}
                      onChange={e => setBuildingInputs(prev => ({ ...prev, [b.id]: e.target.value }))}
                      placeholder={String(current)}
                      className="w-20 px-2 py-1 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown text-sm text-center outline-none focus:border-pancake-gold"
                    />
                    <button
                      onClick={() => {
                        const val = parseInt(buildingInputs[b.id] || '');
                        if (!isNaN(val) && val >= 0) {
                          setDirectState({ buildingCounts: { ...state.buildingCounts, [b.id]: val } });
                          setBuildingInputs(prev => ({ ...prev, [b.id]: '' }));
                        }
                      }}
                      className="px-2 py-1 rounded-lg border-2 border-pancake-gold bg-pancake-gold text-pancake-brown text-xs font-bold cursor-pointer hover:brightness-105"
                    >
                      Set
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <QuickButton label="All to 100" onClick={() => {
                const counts: Record<string, number> = {};
                BUILDINGS.forEach(b => counts[b.id] = 100);
                setDirectState({ buildingCounts: counts });
              }} />
              <QuickButton label="All to 1000" onClick={() => {
                const counts: Record<string, number> = {};
                BUILDINGS.forEach(b => counts[b.id] = 1000);
                setDirectState({ buildingCounts: counts });
              }} />
              <QuickButton label="Clear All" onClick={() => setDirectState({ buildingCounts: {} })} danger />
            </div>
          </Section>

          {/* Section 3: Upgrades */}
          <Section title="⬆️ Upgrades">
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
              <QuickButton label="Clear All Upgrades" onClick={() => setDirectState({ purchasedUpgrades: {}, purchasedClickUpgrades: {} })} danger />
            </div>
          </Section>

          {/* Section 4: Achievements */}
          <Section title="🏆 Achievements" subtitle={`${achievementCount} / ${totalAchievements} unlocked`}>
            <div className="flex gap-2">
              <QuickButton label="Grant All Achievements" onClick={grantAllAchievements} />
              <QuickButton label="Clear All" onClick={() => setDirectState({ unlockedAchievements: {} })} danger />
            </div>
          </Section>

          {/* Section 5: Time Simulation */}
          <Section title="⏰ Time Simulation" subtitle={`Current CpS: ${formatCps(cps)}`}>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                value={timeValue}
                onChange={e => setTimeValue(e.target.value)}
                min="0"
                className="flex-1 px-3 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown font-medium outline-none focus:border-pancake-gold"
              />
              <select
                value={timeUnit}
                onChange={e => setTimeUnit(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown font-medium outline-none focus:border-pancake-gold cursor-pointer"
              >
                {TIME_UNITS.map(u => (
                  <option key={u.label} value={u.seconds}>{u.label}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-pancake-medium mb-2">
              Will add: <span className="font-bold text-pancake-brown">{formatNumber(timePreview)}</span> pancakes
              {timeSeconds > MAX_TIME_SECONDS && <span className="text-red-500 ml-2">(capped at 100 years)</span>}
            </p>
            <button
              onClick={() => {
                const seconds = Math.min(parseFloat(timeValue || '0') * timeUnit, MAX_TIME_SECONDS);
                if (seconds > 0) simulateTime(seconds);
              }}
              className="w-full py-2 rounded-lg border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105"
            >
              Simulate Time
            </button>
          </Section>

          {/* Section 6: CPS Multiplier */}
          <Section title="⚡ CPS Multiplier" subtitle={frenzyMult > 1 ? `Active: ${frenzyMult}x` : 'No frenzy active'}>
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <label className="text-xs text-pancake-medium block mb-1">Multiplier</label>
                <input
                  type="number"
                  value={frenzyMultInput}
                  onChange={e => setFrenzyMultInput(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown font-medium outline-none focus:border-pancake-gold"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-pancake-medium block mb-1">Duration (sec)</label>
                <input
                  type="number"
                  value={frenzyDurInput}
                  onChange={e => setFrenzyDurInput(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown font-medium outline-none focus:border-pancake-gold"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const mult = parseFloat(frenzyMultInput || '1');
                  const dur = parseFloat(frenzyDurInput || '60');
                  if (mult >= 1 && dur > 0) activateFrenzy(mult, dur);
                }}
                className="flex-1 py-2 rounded-lg border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105"
              >
                Activate Frenzy
              </button>
              {[
                { label: '7x 30s', mult: 7, dur: 30 },
                { label: '100x 60s', mult: 100, dur: 60 },
                { label: '1000x 300s', mult: 1000, dur: 300 },
              ].map(p => (
                <QuickButton key={p.label} label={p.label} onClick={() => activateFrenzy(p.mult, p.dur)} />
              ))}
            </div>
          </Section>

          {/* Section 7: Butter Pat */}
          <Section title="🧈 Butter Pat">
            <button
              onClick={onForceButterPat}
              className="w-full py-3 rounded-lg border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105"
            >
              Spawn Butter Pat Now
            </button>
          </Section>

          {/* Section 8: Mini Game Hacks */}
          <Section title="🎮 Mini Game Hacks" subtitle="Toggle cheats for each mini game">
            <div className="flex flex-col gap-2">
              {[
                { key: 'pancake-hack-split-guide', label: '✂️ Split the Pancake', desc: 'Show guide line at 50%' },
                { key: 'pancake-hack-edge-guide', label: '🗡️ Edge Slicer', desc: 'Show guide lines near edges' },
                { key: 'pancake-hack-chopper-auto', label: '🪓 Pancake Chopper', desc: 'Auto-chop mode (rapid fire)' },
                { key: 'pancake-hack-stacker-slow', label: '🥞 Pancake Stacker', desc: 'Slow motion (3x slower)' },
                { key: 'pancake-hack-flipper-zone', label: '🍳 Pancake Flipper', desc: 'Extended golden zone (3x wider)' },
                { key: 'pancake-hack-catcher-bigpan', label: '🥛 Batter Catcher', desc: 'Huge pan (2x wider)' },
                { key: 'pancake-hack-recipe-safe', label: '🥣 Recipe Rush', desc: 'Hide bad ingredients' },
              ].map(hack => {
                const active = localStorage.getItem(hack.key) === 'true';
                return (
                  <div key={hack.key} className="flex items-center justify-between gap-2 py-1">
                    <div>
                      <div className="text-sm font-bold text-pancake-brown">{hack.label}</div>
                      <div className="text-xs text-pancake-medium">{hack.desc}</div>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.setItem(hack.key, active ? 'false' : 'true');
                        setTick(t => t + 1);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer border-2 transition-all min-w-[50px] ${
                        active
                          ? 'border-green-400 bg-green-100 text-green-700'
                          : 'border-shop-border bg-pancake-cream text-pancake-medium'
                      }`}
                    >
                      {active ? 'ON' : 'OFF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Section 9: Danger Zone */}
          <Section title="🗑️ Danger Zone" danger>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-3 rounded-lg border-2 border-red-400 bg-red-50 text-red-600 font-bold cursor-pointer hover:bg-red-100 transition-colors"
              >
                Reset All Save Data
              </button>
            ) : (
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-300">
                <p className="text-sm text-red-700 font-semibold mb-3">
                  This will permanently delete ALL progress. Are you sure?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      resetSave();
                      setConfirmReset(false);
                      handleClose();
                    }}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white font-bold cursor-pointer hover:bg-red-600 transition-colors border-0"
                  >
                    Yes, Delete Everything
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-600 font-bold cursor-pointer hover:bg-gray-300 transition-colors border-0"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Mini Game Score Editor — last section per user spec */}
          <Section title="🎯 Mini Game Score Editor" subtitle="Password-protected">
            <button
              onClick={() => {
                setScoreEditorOpen(true);
                setScoreEditorUnlocked(false);
                setScoreEditorPwInput('');
                setScoreEditorPwError(false);
                setScoreEditorMsg(null);
              }}
              className="w-full py-3 rounded-lg border-2 border-pancake-medium bg-pancake-cream text-pancake-brown font-bold cursor-pointer hover:bg-pancake-light/30 transition-colors"
            >
              Open Score Editor
            </button>
          </Section>

        </div>
      </div>

      {scoreEditorOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setScoreEditorOpen(false)}
        >
          <div
            className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
              <h3 className="text-lg font-bold text-pancake-brown">🎯 Score Editor</h3>
              <button
                onClick={() => setScoreEditorOpen(false)}
                className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
              >
                ✕
              </button>
            </div>

            {!scoreEditorUnlocked ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">🔒</div>
                <p className="text-sm text-pancake-medium mb-3">Enter password to continue</p>
                <input
                  type="password"
                  value={scoreEditorPwInput}
                  onChange={e => { setScoreEditorPwInput(e.target.value); setScoreEditorPwError(false); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (scoreEditorPwInput === SCORE_EDITOR_PASSWORD) {
                        setScoreEditorUnlocked(true);
                        setScoreEditorPwInput('');
                        setScoreEditorPwError(false);
                      } else {
                        setScoreEditorPwError(true);
                      }
                    }
                  }}
                  placeholder="Password..."
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border-2 text-center text-pancake-brown font-medium bg-pancake-warm outline-none ${
                    scoreEditorPwError ? 'border-red-400 animate-shake' : 'border-shop-border focus:border-pancake-gold'
                  }`}
                />
                {scoreEditorPwError && (
                  <p className="text-red-500 text-sm mt-2 font-medium">Wrong password!</p>
                )}
                <button
                  onClick={() => {
                    if (scoreEditorPwInput === SCORE_EDITOR_PASSWORD) {
                      setScoreEditorUnlocked(true);
                      setScoreEditorPwInput('');
                      setScoreEditorPwError(false);
                    } else {
                      setScoreEditorPwError(true);
                    }
                  }}
                  className="mt-4 w-full py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105 transition-all"
                >
                  Unlock
                </button>
              </div>
            ) : (() => {
              const config = GAME_CONFIGS[selectedScoreGame];
              const storedRaw = localStorage.getItem(scoreKey(selectedScoreGame));
              const currentHigh = storedRaw ? parseFloat(storedRaw) : 0;
              const playerName = localStorage.getItem('pancake-player-name')?.trim() ?? '';
              return (
                <div className="p-5 flex flex-col gap-3">
                  <label className="text-xs font-bold text-pancake-brown">Pick a mini game</label>
                  <select
                    value={selectedScoreGame}
                    onChange={e => { setSelectedScoreGame(e.target.value); setNewScoreInput(''); setScoreEditorMsg(null); }}
                    className="w-full px-3 py-2 rounded-lg border-2 border-pancake-medium bg-pancake-warm text-pancake-brown font-medium outline-none focus:border-pancake-gold"
                  >
                    {Object.entries(GAME_CONFIGS).map(([id, cfg]) => (
                      <option key={id} value={id}>{cfg.label}</option>
                    ))}
                  </select>

                  <div className="bg-pancake-warm rounded-xl p-3 border-2 border-shop-border/30">
                    <div className="text-xs text-pancake-medium">Current highest score</div>
                    <div className="text-2xl font-bold text-pancake-brown">
                      {config ? config.format(currentHigh) : currentHigh}
                    </div>
                    {playerName
                      ? <div className="text-xs text-pancake-medium mt-1">Player: <span className="font-bold">{playerName}</span></div>
                      : <div className="text-xs text-red-500 mt-1">No player name set. Play any mini-game once to set one.</div>
                    }
                  </div>

                  <label className="text-xs font-bold text-pancake-brown">New score</label>
                  <input
                    type="number"
                    value={newScoreInput}
                    onChange={e => { setNewScoreInput(e.target.value); setScoreEditorMsg(null); }}
                    placeholder={String(currentHigh)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-pancake-medium bg-white text-pancake-brown font-medium outline-none focus:border-pancake-gold"
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
                        if (result === 'ok') {
                          setScoreEditorMsg({ kind: 'ok', text: `Saved ${config?.format(parsed) ?? parsed} for ${config?.label ?? selectedScoreGame}.` });
                        } else {
                          setScoreEditorMsg({ kind: 'err', text: 'Local saved, but leaderboard update failed.' });
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
                    <p className={`text-sm font-medium text-center ${scoreEditorMsg.kind === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                      {scoreEditorMsg.text}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, danger, children }: {
  title: string;
  subtitle?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl p-4 border-2 ${danger ? 'border-red-300/50 bg-red-50/30' : 'border-shop-border/30 bg-pancake-warm'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-pancake-brown">{title}</h3>
        {subtitle && <span className="text-xs text-pancake-medium">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function QuickButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
        danger
          ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
          : 'border-pancake-medium bg-pancake-cream text-pancake-brown hover:bg-pancake-light/30'
      }`}
    >
      {label}
    </button>
  );
}

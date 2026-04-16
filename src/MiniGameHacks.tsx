import { useState } from 'react';
import { GAME_CONFIGS, adminSetScore } from './leaderboardApi';

interface MiniGameHacksProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCORE_EDITOR_PASSWORD = 'thisisthepassword';

const SCORE_KEY_OVERRIDES: Record<string, string> = {
  split: 'pancake-split-best',
  edge:  'pancake-edge-best',
};
function scoreKey(gameId: string): string {
  return SCORE_KEY_OVERRIDES[gameId] ?? `pancake-${gameId}-high`;
}

const HACKS: { key: string; label: string; desc: string }[] = [
  { key: 'pancake-hack-split-guide',    label: '✂️ Split the Pancake',       desc: 'Show guide line at 50%' },
  { key: 'pancake-hack-edge-guide',     label: '🗡️ Edge Slicer',             desc: 'Show guide lines near edges' },
  { key: 'pancake-hack-chopper-auto',   label: '🪓 Pancake Chopper',         desc: 'Auto-chop mode (rapid fire)' },
  { key: 'pancake-hack-stacker-slow',   label: '🥞 Pancake Stacker',         desc: 'Slow motion (3x slower)' },
  { key: 'pancake-hack-flipper-zone',   label: '🍳 Pancake Flipper',         desc: 'Extended golden zone (3x wider)' },
  { key: 'pancake-hack-catcher-bigpan', label: '🥛 Batter Catcher',          desc: 'Huge pan (2x wider)' },
  { key: 'pancake-hack-recipe-safe',    label: '🥣 Recipe Rush',             desc: 'Hide bad ingredients' },
];

export function MiniGameHacks({ isOpen, onClose }: MiniGameHacksProps) {
  const [, setTick] = useState(0);

  // Score Editor state
  const [scoreEditorOpen, setScoreEditorOpen] = useState(false);
  const [scoreEditorUnlocked, setScoreEditorUnlocked] = useState(false);
  const [scoreEditorPwInput, setScoreEditorPwInput] = useState('');
  const [scoreEditorPwError, setScoreEditorPwError] = useState(false);
  const [selectedScoreGame, setSelectedScoreGame] = useState<string>('split');
  const [newScoreInput, setNewScoreInput] = useState('');
  const [scoreEditorMsg, setScoreEditorMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [scoreEditorBusy, setScoreEditorBusy] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setScoreEditorOpen(false);
    setScoreEditorUnlocked(false);
    setScoreEditorPwInput('');
    setScoreEditorPwError(false);
    setScoreEditorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — glitch-themed */}
        <div className="sticky top-0 bg-gradient-to-r from-fuchsia-900 via-purple-900 to-indigo-900 rounded-t-2xl border-b-2 border-fuchsia-500/40 p-4 flex items-center justify-between z-10">
          <h2 className="glitch-title text-xl font-bold text-white tracking-wider" data-text="🎮 MINI GAME HACKS">
            🎮 MINI GAME HACKS
          </h2>
          <button
            onClick={handleClose}
            className="text-2xl text-white/80 hover:text-white cursor-pointer bg-transparent border-0 leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Hacks section */}
          <div className="rounded-xl p-4 border-2 border-fuchsia-500/30 bg-fuchsia-50/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-fuchsia-900">⚡ Cheats</h3>
              <span className="text-xs text-fuchsia-700">Toggle any on/off</span>
            </div>
            <div className="flex flex-col gap-2">
              {HACKS.map(hack => {
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
          </div>

          {/* Score Editor section */}
          <div className="rounded-xl p-4 border-2 border-fuchsia-500/30 bg-fuchsia-50/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-fuchsia-900">🎯 Score Editor</h3>
              <span className="text-xs text-fuchsia-700">Password-protected</span>
            </div>
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
          </div>
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

      <style>{`
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
        }
        .glitch-title::before {
          color: #ff00ff;
          animation: glitch-anim-1 2s infinite linear alternate-reverse;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
        }
        .glitch-title::after {
          color: #00ffff;
          animation: glitch-anim-2 2s infinite linear alternate-reverse;
          clip-path: polygon(0 60%, 100% 60%, 100% 100%, 0 100%);
        }
        @keyframes glitch-anim-1 {
          0%   { transform: translate(0); }
          20%  { transform: translate(-2px, 1px); }
          40%  { transform: translate(-1px, -1px); }
          60%  { transform: translate(1px, 1px); }
          80%  { transform: translate(2px, -1px); }
          100% { transform: translate(0); }
        }
        @keyframes glitch-anim-2 {
          0%   { transform: translate(0); }
          20%  { transform: translate(2px, -1px); }
          40%  { transform: translate(1px, 1px); }
          60%  { transform: translate(-1px, -1px); }
          80%  { transform: translate(-2px, 1px); }
          100% { transform: translate(0); }
        }
      `}</style>
    </div>
  );
}

import { useState } from 'react';
import { GAME_CONFIGS, adminSetScore } from './leaderboardApi';
import { formatNumber } from './gameData';

const MAX_EDITABLE_SCORE = 999e39; // 999 duodecillion

interface MiniGameHacksProps {
  isOpen: boolean;
  onClose: () => void;
}

const HACKS_PASSWORD = 'thisisthepassword';

const SCORE_KEY_OVERRIDES: Record<string, string> = {
  split: 'pancake-split-best',
  edge:  'pancake-edge-best',
};
function scoreKey(gameId: string): string {
  return SCORE_KEY_OVERRIDES[gameId] ?? `pancake-${gameId}-high`;
}

const HACKS: { key: string; label: string; desc: string }[] = [
  // Original 7
  { key: 'pancake-hack-split-guide',    label: '✂️ Split the Pancake',       desc: 'Show guide line at 50%' },
  { key: 'pancake-hack-edge-guide',     label: '🗡️ Edge Slicer',             desc: 'Show guide lines near edges' },
  { key: 'pancake-hack-chopper-auto',   label: '🪓 Pancake Chopper',         desc: 'Auto-chop mode (rapid fire)' },
  { key: 'pancake-hack-stacker-slow',   label: '🥞 Pancake Stacker',         desc: 'Slow motion (3x slower)' },
  { key: 'pancake-hack-flipper-zone',   label: '🍳 Pancake Flipper',         desc: 'Extended golden zone (3x wider)' },
  { key: 'pancake-hack-catcher-bigpan', label: '🥛 Batter Catcher',          desc: 'Huge pan (2x wider)' },
  { key: 'pancake-hack-recipe-safe',    label: '🥣 Recipe Rush',             desc: 'Hide bad ingredients' },
  // New 8
  { key: 'pancake-hack-syrup-show',     label: '🍯 Syrup Drizzle',           desc: 'Target path glows bright' },
  { key: 'pancake-hack-berry-allgood',  label: '🫐 Blueberry Sort',          desc: 'No rotten berries spawn' },
  { key: 'pancake-hack-toss-easy',      label: '🥞 Pancake Toss & Catch',    desc: 'Huge catch window + slow gravity' },
  { key: 'pancake-hack-pour-slow',      label: '🫗 Batter Pour Precision',   desc: 'Slow pour for perfect precision' },
  { key: 'pancake-hack-maze-freeze',    label: '🌀 Pancake Maze Roll',       desc: 'Freeze timer (unlimited time)' },
  { key: 'pancake-hack-memory-timer',   label: '🧠 Short Stack Memory',      desc: '30s timer — spam buttons to rack up points' },
  { key: 'pancake-hack-grid-ghost',     label: '🔲 Griddle Grid Puzzle',     desc: 'Slow drop speed' },
];

export function MiniGameHacks({ isOpen, onClose }: MiniGameHacksProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [, setTick] = useState(0);

  // Score Editor state (no separate password)
  const [selectedScoreGame, setSelectedScoreGame] = useState<string>('split');
  const [newScoreInput, setNewScoreInput] = useState('');
  const [scoreEditorMsg, setScoreEditorMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [scoreEditorBusy, setScoreEditorBusy] = useState(false);

  // Pancake Blast inline score editor
  const [blastScoreInput, setBlastScoreInput] = useState('');
  const [blastScoreMsg, setBlastScoreMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [blastScoreBusy, setBlastScoreBusy] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setUnlocked(false);
    setPwInput('');
    setPwError(false);
    setScoreEditorMsg(null);
    onClose();
  };

  const tryUnlock = () => {
    if (pwInput === HACKS_PASSWORD) {
      setUnlocked(true);
      setPwInput('');
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  // Password gate
  if (!unlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
        <div
          className="bg-gradient-to-br from-fuchsia-900 via-purple-900 to-indigo-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border-2 border-fuchsia-500/40"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 text-center">
            <div className="text-4xl mb-2">🔒</div>
            <h2 className="glitch-title text-xl font-bold text-white tracking-wider mb-1" data-text="🎮 MINI GAME HACKS">
              🎮 MINI GAME HACKS
            </h2>
            <p className="text-xs text-fuchsia-200/80 mb-4">Enter password to continue</p>
            <input
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={e => { if (e.key === 'Enter') tryUnlock(); }}
              placeholder="Password..."
              autoFocus
              className={`w-full px-4 py-3 rounded-xl border-2 text-center text-white placeholder-fuchsia-300/50 font-medium bg-black/30 outline-none ${
                pwError ? 'border-red-400 animate-shake' : 'border-fuchsia-400/50 focus:border-fuchsia-300'
              }`}
            />
            {pwError && (
              <p className="text-red-300 text-sm mt-2 font-medium">Wrong password!</p>
            )}
            <button
              onClick={tryUnlock}
              className="mt-4 w-full py-3 rounded-xl border-2 border-fuchsia-400 bg-fuchsia-600 text-white font-bold cursor-pointer hover:bg-fuchsia-500 transition-all"
            >
              Unlock
            </button>
            <p className="text-xs text-fuchsia-300/70 mt-3">Click outside to cancel</p>
          </div>
        </div>

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

  const config = GAME_CONFIGS[selectedScoreGame];
  const storedRaw = localStorage.getItem(scoreKey(selectedScoreGame));
  const currentHigh = storedRaw ? parseFloat(storedRaw) : 0;
  const playerName = localStorage.getItem('pancake-player-name')?.trim() ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
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
          {/* Cheats */}
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

              {/* Pancake Blast — inline score setter (replaces snap-radius toggle) */}
              {(() => {
                const currentBlastHigh = parseFloat(localStorage.getItem('pancake-blast-high') || '0');
                const playerName = localStorage.getItem('pancake-player-name')?.trim() ?? '';
                const setBlastScore = async () => {
                  const parsed = parseFloat(blastScoreInput);
                  if (!Number.isFinite(parsed) || parsed < 0) {
                    setBlastScoreMsg({ kind: 'err', text: 'Enter a valid non-negative number.' });
                    return;
                  }
                  if (parsed > MAX_EDITABLE_SCORE) {
                    setBlastScoreMsg({ kind: 'err', text: `Max: ${formatNumber(MAX_EDITABLE_SCORE)} (999 DDc).` });
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
                    setTick(t => t + 1);
                  } finally {
                    setBlastScoreBusy(false);
                  }
                };
                return (
                  <div className="border-t-2 border-fuchsia-500/20 mt-2 pt-3 flex flex-col gap-2">
                    <div>
                      <div className="text-sm font-bold text-pancake-brown">🧱 Pancake Blast</div>
                      <div className="text-xs text-pancake-medium">
                        Set your score directly · Current: <span className="font-bold">{formatNumber(currentBlastHigh)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={blastScoreInput}
                        onChange={e => { setBlastScoreInput(e.target.value); setBlastScoreMsg(null); }}
                        max={MAX_EDITABLE_SCORE}
                        step="any"
                        placeholder="e.g. 999e39"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border-2 border-pancake-medium bg-white text-pancake-brown font-medium outline-none focus:border-pancake-gold"
                      />
                      <button
                        disabled={blastScoreBusy || !blastScoreInput.trim()}
                        onClick={setBlastScore}
                        className="px-4 py-2 rounded-lg border-2 border-fuchsia-400 bg-fuchsia-600 text-white font-bold text-xs cursor-pointer hover:bg-fuchsia-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {blastScoreBusy ? '…' : 'Set'}
                      </button>
                    </div>
                    <p className="text-xs text-pancake-medium">Max: 999 DDc (duodecillion)</p>
                    {blastScoreMsg && (
                      <p className={`text-xs font-medium ${blastScoreMsg.kind === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                        {blastScoreMsg.text}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Score Editor — inline, no separate password */}
          <div className="rounded-xl p-4 border-2 border-fuchsia-500/30 bg-fuchsia-50/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-fuchsia-900">🎯 Score Editor</h3>
              <span className="text-xs text-fuchsia-700">Overwrite any game's high score</span>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-pancake-brown block mb-1">Pick a mini game</label>
                <select
                  value={selectedScoreGame}
                  onChange={e => { setSelectedScoreGame(e.target.value); setNewScoreInput(''); setScoreEditorMsg(null); }}
                  className="w-full px-3 py-2 rounded-lg border-2 border-pancake-medium bg-pancake-warm text-pancake-brown font-medium outline-none focus:border-pancake-gold"
                >
                  {Object.entries(GAME_CONFIGS).map(([id, cfg]) => (
                    <option key={id} value={id}>{cfg.label}</option>
                  ))}
                </select>
              </div>

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

              <div>
                <label className="text-xs font-bold text-pancake-brown block mb-1">New score</label>
                <input
                  type="number"
                  value={newScoreInput}
                  onChange={e => { setNewScoreInput(e.target.value); setScoreEditorMsg(null); }}
                  placeholder={String(currentHigh)}
                  max={MAX_EDITABLE_SCORE}
                  step="any"
                  className="w-full px-3 py-2 rounded-lg border-2 border-pancake-medium bg-white text-pancake-brown font-medium outline-none focus:border-pancake-gold"
                />
                <p className="text-xs text-pancake-medium mt-1">Max: 999 DDc (duodecillion)</p>
              </div>

              <button
                disabled={scoreEditorBusy || !newScoreInput.trim() || !playerName}
                onClick={async () => {
                  const parsed = parseFloat(newScoreInput);
                  if (!Number.isFinite(parsed) || parsed < 0) {
                    setScoreEditorMsg({ kind: 'err', text: 'Enter a valid non-negative number.' });
                    return;
                  }
                  if (parsed > MAX_EDITABLE_SCORE) {
                    setScoreEditorMsg({ kind: 'err', text: `Max score is 999 duodecillion (${formatNumber(MAX_EDITABLE_SCORE)}).` });
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
          </div>
        </div>
      </div>

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

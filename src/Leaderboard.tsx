import { useState, useEffect, useCallback } from 'react';
import { fetchLeaderboard, submitScore, GAME_CONFIGS, type LeaderboardEntry } from './leaderboard';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const GAMES = Object.entries(GAME_CONFIGS);

export function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
  const [activeGame, setActiveGame] = useState(GAMES[0][0]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchLeaderboard(activeGame);
    setEntries(data);
    setLoading(false);
  }, [activeGame]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  if (!isOpen) return null;

  const config = GAME_CONFIGS[activeGame];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <h2 className="text-xl font-bold text-pancake-brown">🏆 Leaderboard</h2>
          <button
            onClick={onClose}
            className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
          >
            ✕
          </button>
        </div>

        {/* Game tabs */}
        <div className="flex gap-1 p-2 overflow-x-auto border-b border-shop-border/20 bg-pancake-warm">
          {GAMES.map(([id, cfg]) => (
            <button
              key={id}
              onClick={() => setActiveGame(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer border-0 transition-colors ${
                activeGame === id
                  ? 'bg-pancake-gold text-pancake-brown'
                  : 'bg-transparent text-pancake-medium hover:text-pancake-brown'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Scores */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-pancake-medium py-8">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🥞</div>
              <div className="text-pancake-medium text-sm">No scores yet!</div>
              <div className="text-pancake-medium text-xs mt-1">Be the first to set a record.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {entries.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    i === 0 ? 'bg-yellow-100/60' : i === 1 ? 'bg-gray-100/40' : i === 2 ? 'bg-orange-50/40' : ''
                  }`}
                >
                  <div className={`text-sm font-bold w-6 text-center ${
                    i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-pancake-medium'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-pancake-brown text-sm truncate">{entry.player_name}</div>
                  </div>
                  <div className="font-bold text-pancake-gold text-sm">
                    {config.format(entry.score)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit score button */}
        <div className="p-3 border-t border-shop-border/20 bg-pancake-warm">
          <button
            onClick={() => setSubmitOpen(true)}
            className="w-full py-2.5 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0 hover:brightness-105 active:scale-[0.98] transition-all"
          >
            Submit My Score
          </button>
        </div>

        {/* Submit modal */}
        {submitOpen && (
          <SubmitModal
            gameId={activeGame}
            gameLabel={config.label}
            onClose={() => setSubmitOpen(false)}
            onSubmitted={() => { setSubmitOpen(false); load(); }}
          />
        )}
      </div>
    </div>
  );
}

function SubmitModal({ gameId, gameLabel, onClose, onSubmitted }: {
  gameId: string;
  gameLabel: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [name, setName] = useState(() => localStorage.getItem('pancake-player-name') || '');
  const [scoreStr, setScoreStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill score from localStorage high scores
  useEffect(() => {
    const keys: Record<string, string> = {
      split: 'pancake-split-best',
      edge: 'pancake-edge-best',
      chopper: 'pancake-chopper-high',
      stacker: 'pancake-stacker-high',
      flipper: 'pancake-flipper-high',
      catcher: 'pancake-catcher-high',
      recipe: 'pancake-recipe-high',
    };
    const key = keys[gameId];
    if (key) {
      const val = localStorage.getItem(key);
      if (val) setScoreStr(val);
    }
  }, [gameId]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter your name'); return; }
    const score = parseFloat(scoreStr);
    if (isNaN(score)) { setError('Enter a valid score'); return; }

    setSubmitting(true);
    setError('');
    localStorage.setItem('pancake-player-name', trimmed);
    const ok = await submitScore(gameId, trimmed, score);
    setSubmitting(false);
    if (ok) {
      onSubmitted();
    } else {
      setError('Failed to submit. Try again.');
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10" onClick={onClose}>
      <div className="bg-pancake-cream rounded-xl shadow-xl p-5 w-72" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-pancake-brown text-lg mb-1">Submit Score</h3>
        <p className="text-xs text-pancake-medium mb-3">{gameLabel}</p>

        <label className="text-xs text-pancake-medium font-bold block mb-1">Your Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          placeholder="Enter name..."
          className="w-full px-3 py-2 rounded-lg border-2 border-pancake-medium bg-white text-pancake-brown text-sm mb-3 outline-none focus:border-pancake-gold"
        />

        <label className="text-xs text-pancake-medium font-bold block mb-1">Your Best Score</label>
        <input
          type="text"
          value={scoreStr}
          onChange={e => setScoreStr(e.target.value)}
          placeholder="Score"
          className="w-full px-3 py-2 rounded-lg border-2 border-pancake-medium bg-white text-pancake-brown text-sm mb-3 outline-none focus:border-pancake-gold"
        />

        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown text-sm font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2 rounded-lg bg-pancake-gold text-pancake-brown text-sm font-bold cursor-pointer border-0 disabled:opacity-50"
          >
            {submitting ? '...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

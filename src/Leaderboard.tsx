import { useState, useEffect, useCallback } from 'react';
import { fetchLeaderboardPage, GAME_CONFIGS, type LeaderboardEntry } from './leaderboardApi';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const GAMES = Object.entries(GAME_CONFIGS);
const PAGE_SIZE = 20;

export function Leaderboard({ isOpen, onClose }: LeaderboardProps) {
  const [activeGame, setActiveGame] = useState(GAMES[0][0]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchLeaderboardPage(activeGame, page, PAGE_SIZE);
    setEntries(data.entries);
    setTotalEntries(data.total);
    setLoading(false);
  }, [activeGame, page]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  if (!isOpen) return null;

  const config = GAME_CONFIGS[activeGame];
  const myNameRaw = localStorage.getItem('pancake-player-name')?.trim() || '';
  const myName = myNameRaw.toLowerCase();
  const isAdmin = localStorage.getItem('pancake-admin-unlocked') === 'true';
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  const switchGame = (id: string) => {
    setActiveGame(id);
    setPage(0);
  };

  const handleNameSave = () => {
    const trimmed = editNameInput.trim();
    if (!trimmed) return;
    localStorage.setItem('pancake-player-name', trimmed.slice(0, 20));
    setEditingName(false);
    load();
  };

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

        {/* Player name bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-shop-border/20 bg-pancake-warm/50">
          <div className="text-xs text-pancake-medium">
            Playing as: <span className="font-bold text-pancake-brown">{myNameRaw || 'Anonymous'}</span>
          </div>
          <button
            onClick={() => { setEditingName(true); setEditNameInput(myNameRaw); }}
            className="text-xs text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 underline"
          >
            {myNameRaw ? 'Edit name' : 'Set name'}
          </button>
        </div>

        {/* Game tabs */}
        <div className="flex gap-1 p-2 overflow-x-auto border-b border-shop-border/20 bg-pancake-warm">
          {GAMES.map(([id, cfg]) => (
            <button
              key={id}
              onClick={() => switchGame(id)}
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
              <div className="text-pancake-medium text-xs mt-1">Play this game to get on the board.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {entries.map((entry, i) => {
                const rank = page * PAGE_SIZE + i + 1;
                const isMe = myName && entry.player_name.trim().toLowerCase() === myName;

                const rankDisplay =
                  rank === 1 ? '🥇' :
                  rank === 2 ? '🥈' :
                  rank === 3 ? '🥉' :
                  rank <= 10 ? `${rank} ★` :
                  `${rank}`;

                const rankColor =
                  rank === 1 ? 'text-yellow-500' :
                  rank === 2 ? 'text-gray-400' :
                  rank === 3 ? 'text-orange-400' :
                  rank <= 10 ? 'text-amber-500' :
                  rank <= 20 ? 'text-pancake-brown' :
                  'text-pancake-medium';

                const rowBg =
                  isMe ? 'ring-2 ring-pancake-gold/50 bg-pancake-gold/10' :
                  rank === 1 ? 'bg-yellow-100/60' :
                  rank === 2 ? 'bg-gray-100/40' :
                  rank === 3 ? 'bg-orange-50/40' :
                  rank <= 10 ? 'bg-amber-50/30' :
                  rank <= 20 ? 'bg-pancake-warm/20' : '';

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${rowBg}`}
                  >
                    <div className={`text-sm font-bold w-8 text-center ${rankColor}`}>
                      {rankDisplay}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${isMe && isAdmin ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'text-pancake-brown'}`}>
                        {entry.player_name}{isMe && isAdmin && <span className="ml-1">✦</span>}{isMe && <span className="text-pancake-medium text-xs ml-1">(you)</span>}
                      </div>
                    </div>
                    <div className="font-bold text-pancake-gold text-sm">
                      {config.format(entry.score)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-shop-border/20 bg-pancake-warm">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg bg-pancake-gold text-pancake-brown text-xs font-bold cursor-pointer border-0 disabled:opacity-30 disabled:cursor-default"
            >
              ← Prev
            </button>
            <span className="text-xs text-pancake-medium font-bold">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded-lg bg-pancake-gold text-pancake-brown text-xs font-bold cursor-pointer border-0 disabled:opacity-30 disabled:cursor-default"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Edit name modal */}
      {editingName && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingName(false)}>
          <div className="bg-pancake-cream rounded-xl shadow-xl p-5 w-72" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-pancake-brown text-lg mb-1">Edit Name</h3>
            <p className="text-xs text-pancake-medium mb-3">This will apply to future scores only</p>
            <input
              type="text"
              value={editNameInput}
              onChange={e => setEditNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameSave()}
              maxLength={20}
              placeholder="Your name..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg border-2 border-pancake-medium bg-white text-pancake-brown text-sm mb-3 outline-none focus:border-pancake-gold"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingName(false)}
                className="flex-1 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown text-sm font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleNameSave}
                disabled={!editNameInput.trim()}
                className="flex-1 py-2 rounded-lg bg-pancake-gold text-pancake-brown text-sm font-bold cursor-pointer border-0 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { type BigNum, bnFormat, bnGte } from './bignum';
import { TIERS, findTier, highestUnlockedTier } from './numbersGoUp';
import { fetchNguLeaderboard, type NguLeaderboardEntry } from './nguLeaderboardApi';
import { getPlayerId } from './leaderboardApi';

interface NumbersGoUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: BigNum;
  best: BigNum;
  tier: number;
  onBuyTier: (tierId: number) => void;
}

export function NumbersGoUpModal(props: NumbersGoUpModalProps) {
  const { isOpen, onClose, value, best, tier, onBuyTier } = props;
  const [board, setBoard] = useState<NguLeaderboardEntry[] | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);

  // Fetch the leaderboard each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setBoardLoading(true);
    fetchNguLeaderboard(20)
      .then(rows => { if (!cancelled) setBoard(rows); })
      .catch(() => { if (!cancelled) setBoard([]); })
      .finally(() => { if (!cancelled) setBoardLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeTier = findTier(tier) ?? TIERS[0];
  const unlocked = highestUnlockedTier(value);
  const myId = getPlayerId();
  const rateLabel = activeTier.id === 0
    ? '+1 every second'
    : `×${activeTier.growthFactor} every second`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <style>{NGU_KEYFRAMES}</style>
      <div
        className="rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border-4"
        style={{
          background: 'linear-gradient(180deg, #0d1b3a 0%, #0a1228 100%)',
          borderColor: '#3b6fd4',
          boxShadow: '0 20px 60px rgba(20, 50, 120, 0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 border-b-2 px-5 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #13284f 0%, #0d1b3a 100%)', borderColor: 'rgba(59,111,212,0.5)' }}
        >
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            🔢 Numbers Go Up
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-white/70 hover:text-white cursor-pointer bg-transparent border-0 leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* The Number */}
          <div className="text-center py-4 rounded-xl" style={{ background: 'rgba(59,111,212,0.12)', border: '1px solid rgba(59,111,212,0.3)' }}>
            <div
              key={value.e}
              className="font-extrabold text-cyan-300 tabular-nums break-all px-3"
              style={{ fontSize: 'clamp(2rem, 9vw, 4rem)', textShadow: '0 0 24px rgba(80,200,255,0.55)', animation: 'ngu-pop 0.4s ease-out' }}
            >
              {bnFormat(value)}
            </div>
            <div className="text-sm font-bold text-cyan-100/80 mt-1">{rateLabel}</div>
            <div className="text-xs text-blue-200/60 mt-0.5">Best: {bnFormat(best)}</div>
          </div>

          {/* Tier buy buttons */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-bold uppercase tracking-wide text-blue-200/70">Multipliers</div>
            {TIERS.filter(t => t.id !== 0).map(t => {
              const isActive = t.id === tier;
              const isUnlocked = bnGte(value, t.threshold);
              const canBuy = isUnlocked && !isActive;
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                  style={{
                    background: isActive ? 'rgba(80,200,255,0.18)' : 'rgba(59,111,212,0.08)',
                    border: isActive ? '1px solid rgba(80,200,255,0.7)' : '1px solid rgba(59,111,212,0.25)',
                    opacity: isUnlocked ? 1 : 0.55,
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white">{t.label} <span className="text-blue-200/70 font-normal">— {t.desc}</span></div>
                    {!isUnlocked && (
                      <div className="text-[11px] text-blue-200/60">Reach {bnFormat(t.threshold)} to unlock</div>
                    )}
                  </div>
                  {isActive ? (
                    <span className="px-3 py-1 rounded text-xs font-bold border border-cyan-300 bg-cyan-100 text-cyan-800 whitespace-nowrap">ACTIVE</span>
                  ) : (
                    <button
                      onClick={() => onBuyTier(t.id)}
                      disabled={!canBuy}
                      className="px-3 py-1 rounded text-xs font-bold cursor-pointer border-2 border-cyan-300 bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {canBuy ? `Buy ${t.label}` : 'Locked'}
                    </button>
                  )}
                </div>
              );
            })}
            <div className="text-[11px] text-blue-200/50">
              Buying a multiplier doesn't spend your number — it's also your leaderboard score.
              Highest multiplier unlocked: <span className="font-bold text-cyan-200">{unlocked.id === 0 ? 'none yet' : unlocked.label}</span>.
            </div>
          </div>

          {/* Leaderboard */}
          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-bold uppercase tracking-wide text-blue-200/70">🏆 Highest Numbers</div>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(59,111,212,0.3)' }}>
              {boardLoading && <div className="px-3 py-4 text-center text-blue-200/60 text-sm">Loading…</div>}
              {!boardLoading && board && board.length === 0 && (
                <div className="px-3 py-4 text-center text-blue-200/60 text-sm">No scores yet — you could be #1!</div>
              )}
              {!boardLoading && board && board.map((row, i) => {
                const mine = row.player_id === myId;
                return (
                  <div
                    key={row.player_id}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm"
                    style={{ background: mine ? 'rgba(80,200,255,0.14)' : i % 2 ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-blue-200/60 font-bold w-6 text-right tabular-nums">{i + 1}</span>
                      <span className={`truncate font-bold ${mine ? 'text-cyan-200' : 'text-white'}`}>{row.player_name}{mine ? ' (you)' : ''}</span>
                    </div>
                    <span className="font-extrabold text-cyan-300 tabular-nums whitespace-nowrap">{bnFormat(row.best)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const NGU_KEYFRAMES = `
@keyframes ngu-pop {
  0%   { transform: scale(0.85); opacity: 0.6; }
  60%  { transform: scale(1.08); }
  100% { transform: scale(1); opacity: 1; }
}
`;

import { useEffect, useRef } from 'react';
import { PANCAKE_PASS_TIERS, passProgress } from './pancakePass';
import { formatNumber } from './gameData';

interface PancakePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  peakCookies: number;
  claimed: Record<string, boolean>;
}

export function PancakePassModal({ isOpen, onClose, peakCookies, claimed }: PancakePassModalProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  // On open, jump the list to the player's current frontier — the next
  // tier they're working toward, so they don't have to scroll through
  // 50 already-claimed tiers to find it.
  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current;
    if (!el) return;
    const { currentTier } = passProgress(peakCookies);
    const target = el.querySelector<HTMLDivElement>(`[data-tier-key="${currentTier.key}"]`);
    if (target) {
      // Position it near the top of the visible list with a little buffer.
      el.scrollTop = Math.max(0, target.offsetTop - 60);
    }
  }, [isOpen, peakCookies]);

  if (!isOpen) return null;

  const { currentTier, nextTier, progressToNext } = passProgress(peakCookies);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-4 border-pancake-gold flex flex-col"
        style={{ maxHeight: 'min(90vh, 720px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-pancake-warm border-b-2 border-pancake-gold/30 px-5 py-3 flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-pancake-medium font-bold">Pancake Pass</p>
            <h2 className="text-lg font-extrabold text-pancake-brown">
              🎖️ Tier {currentTier.index + 1}
            </h2>
            <p className="text-xs text-pancake-medium mt-0.5">
              Your peak: <span className="font-bold">{formatNumber(peakCookies)}</span> 🥞
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-pancake-brown/70 hover:text-pancake-brown text-xl leading-none cursor-pointer bg-transparent border-0"
          >
            ✕
          </button>
        </div>

        {nextTier && (
          <div className="px-5 py-3 border-b border-pancake-gold/20">
            <div className="flex items-baseline justify-between text-xs text-pancake-medium">
              <span>Next: Tier {nextTier.index + 1}</span>
              <span>{formatNumber(nextTier.threshold)} 🥞</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-pancake-gold/20 overflow-hidden">
              <div
                className="h-full bg-pancake-gold transition-all"
                style={{ width: `${Math.round(progressToNext * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-pancake-medium mt-1.5">
              Reward at Tier {nextTier.index + 1}: <span className="text-pancake-brown font-bold">{nextTier.rewardLabel}</span>
            </p>
          </div>
        )}

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5"
        >
          {PANCAKE_PASS_TIERS.map(tier => {
            const isClaimed = !!claimed[tier.key];
            const isCurrent = tier.key === currentTier.key;
            const reached = peakCookies >= tier.threshold;
            return (
              <div
                key={tier.key}
                data-tier-key={tier.key}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                  isCurrent
                    ? 'bg-pancake-gold/25 border-pancake-gold ring-1 ring-pancake-gold/40'
                    : isClaimed
                      ? 'bg-white/60 border-pancake-gold/30'
                      : 'bg-white/30 border-pancake-gold/10 opacity-70'
                }`}
              >
                <div className="text-pancake-brown font-extrabold w-12 text-sm tabular-nums">
                  T{tier.index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-pancake-brown text-sm font-bold truncate">
                    {tier.index === 0
                      ? 'Welcome to Pancake Stack'
                      : `Reach ${formatNumber(tier.threshold)} 🥞`}
                  </div>
                  <div className="text-pancake-medium text-xs truncate">{tier.rewardLabel}</div>
                </div>
                <div className="text-lg leading-none">
                  {isClaimed ? '✅' : reached ? '⏳' : '🔒'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-2.5 border-t border-pancake-gold/20 text-[10px] text-pancake-medium text-center">
          Tiers unlock automatically when your all-time peak crosses the threshold.
          Spending pancakes never un-claims a reward.
        </div>
      </div>
    </div>
  );
}

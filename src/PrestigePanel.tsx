import { formatNumber } from './gameData';
import { getPrestigeMultiplier } from './useGameState';
import { useState } from 'react';

interface PrestigePanelProps {
  sugarStars: number;
  newStarsOnPrestige: number;
  canPrestige: boolean;
  prestigeCount: number;
  lifetimeBaked: number;
  onPrestige: () => void;
}

export function PrestigePanel({
  sugarStars,
  newStarsOnPrestige,
  canPrestige,
  prestigeCount,
  lifetimeBaked,
  onPrestige,
}: PrestigePanelProps) {
  const [confirming, setConfirming] = useState(false);

  const currentBonus = Math.round((getPrestigeMultiplier(sugarStars) - 1) * 100);
  const nextBonus = Math.round((getPrestigeMultiplier(sugarStars + newStarsOnPrestige) - 1) * 100);

  if (!canPrestige && sugarStars === 0) return null;

  return (
    <div className="p-3 border-t-2 border-pancake-gold/30">
      <h3 className="text-sm font-bold text-pancake-brown mb-2 flex items-center gap-1">
        Prestige
        {sugarStars > 0 && (
          <span className="text-pancake-gold text-xs font-normal">
            ({sugarStars} Maple Stars = +{currentBonus}% CpS)
          </span>
        )}
      </h3>

      {canPrestige && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          className="w-full p-3 rounded-xl border-2 border-pancake-gold bg-gradient-to-r from-pancake-gold/20 to-pancake-gold/10 hover:from-pancake-gold/30 hover:to-pancake-gold/20 cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="text-sm font-bold text-pancake-brown">
            Ascend for +{newStarsOnPrestige} Maple Stars
          </div>
          <div className="text-xs text-pancake-medium mt-1">
            CpS bonus: +{currentBonus}% &rarr; +{nextBonus}%
          </div>
        </button>
      )}

      {confirming && (
        <div className="bg-pancake-cream rounded-xl p-4 border-2 border-red-300">
          <p className="text-sm text-pancake-brown font-semibold mb-2">
            Are you sure? This will reset all your pancakes, buildings, and upgrades!
          </p>
          <p className="text-xs text-pancake-medium mb-3">
            You'll keep {sugarStars + newStarsOnPrestige} Maple Stars (+{nextBonus}% CpS permanently)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onPrestige(); setConfirming(false); }}
              className="flex-1 py-2 rounded-lg bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0 hover:brightness-110 transition-all"
            >
              Ascend!
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-600 font-bold text-sm cursor-pointer border-0 hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!canPrestige && sugarStars > 0 && (
        <div className="text-xs text-pancake-medium">
          Keep flipping to earn more Maple Stars!
        </div>
      )}

      <div className="mt-2 text-xs text-pancake-medium/70 flex gap-3">
        {prestigeCount > 0 && <span>Prestiges: {prestigeCount}</span>}
        <span>Lifetime: {formatNumber(lifetimeBaked)}</span>
      </div>
    </div>
  );
}

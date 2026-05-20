import { useEffect } from 'react';
import type { PancakePassTier } from './pancakePass';

interface PancakePassCelebrationProps {
  tier: PancakePassTier;
  onDismiss: () => void;
}

// Small celebration banner that pops at the top of the screen when a tier
// auto-unlocks. Auto-dismisses after a few seconds so it doesn't block
// gameplay. Caller is responsible for queueing multiple — this component
// renders one tier at a time.
const VISIBLE_MS = 4200;

export function PancakePassCelebration({ tier, onDismiss }: PancakePassCelebrationProps) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [tier.key, onDismiss]);

  return (
    <>
      <style>{POP_STYLES}</style>
      <div
        className="fixed top-12 left-1/2 z-[62] -translate-x-1/2 pointer-events-none"
        style={{ animation: 'pp-pop 4.2s ease-out forwards' }}
      >
        <div
          className="bg-pancake-cream border-4 border-pancake-gold rounded-2xl shadow-2xl px-5 py-3 min-w-[280px] max-w-[90vw] text-center pointer-events-auto cursor-pointer"
          onClick={onDismiss}
        >
          <div className="text-[10px] uppercase tracking-wider font-bold text-pancake-medium">
            🎖️ Pancake Pass
          </div>
          <div className="text-pancake-brown font-extrabold text-lg mt-0.5">
            {tier.index === 0 ? 'Welcome!' : `Tier ${tier.index + 1} unlocked!`}
          </div>
          <div className="text-pancake-brown text-sm mt-1">
            +{tier.rewardLabel}
          </div>
        </div>
      </div>
    </>
  );
}

const POP_STYLES = `
@keyframes pp-pop {
  0%   { transform: translate(-50%, -120%) scale(0.95); opacity: 0; }
  12%  { transform: translate(-50%, 0) scale(1.04); opacity: 1; }
  18%  { transform: translate(-50%, 0) scale(1.0); }
  82%  { transform: translate(-50%, 0) scale(1.0); opacity: 1; }
  100% { transform: translate(-50%, -40%) scale(0.95); opacity: 0; }
}
`;

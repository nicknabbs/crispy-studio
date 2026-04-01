import { CLICK_UPGRADES, formatNumber, formatCps } from './gameData';

interface ClickPanelProps {
  clickPower: number;
  cookies: number;
  purchasedClickUpgrades: Record<string, boolean>;
  totalClicks: number;
  totalBaked: number;
  cps: number;
  onBuyClickUpgrade: (id: string) => void;
}

export function ClickPanel({
  clickPower, cookies, purchasedClickUpgrades, totalClicks, totalBaked, cps, onBuyClickUpgrade,
}: ClickPanelProps) {
  // Separate into buyable, locked-but-next, and purchased
  const available: typeof CLICK_UPGRADES = [];
  let nextLocked: (typeof CLICK_UPGRADES)[number] | null = null;

  for (const cu of CLICK_UPGRADES) {
    if (purchasedClickUpgrades[cu.id]) continue;
    const meetsClicks = !cu.requiredTotalClicks || totalClicks >= cu.requiredTotalClicks;
    const meetsBaked = !cu.requiredTotalBaked || totalBaked >= cu.requiredTotalBaked;
    if (meetsClicks && meetsBaked) {
      available.push(cu);
    } else if (!nextLocked) {
      nextLocked = cu;
    }
  }

  // Don't show panel if nothing to display
  if (available.length === 0 && !nextLocked) {
    const purchased = CLICK_UPGRADES.filter(cu => purchasedClickUpgrades[cu.id]).length;
    if (purchased === 0) return null;
    // All purchased — show compact summary
    return (
      <div className="p-3 border-t-2 border-shop-border/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-pancake-brown">Click Power</h3>
          <span className="text-sm font-bold text-pancake-gold tabular-nums">{formatNumber(clickPower)}/click</span>
        </div>
        <div className="text-xs text-pancake-medium mt-1">All click upgrades purchased!</div>
      </div>
    );
  }

  return (
    <div className="p-3 border-t-2 border-shop-border/30">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-pancake-brown">Click Power</h3>
        <span className="text-sm font-bold text-pancake-gold tabular-nums">{formatNumber(clickPower)}/click</span>
      </div>

      {/* Buyable upgrades */}
      {available.map(cu => {
        const canAfford = cookies >= cu.cost;
        const cpsBonus = cu.addCpsPercent ? Math.floor(cps * cu.addCpsPercent / 100) : 0;
        return (
          <button
            key={cu.id}
            onClick={() => canAfford && onBuyClickUpgrade(cu.id)}
            disabled={!canAfford}
            className={`w-full flex items-center gap-2 p-2.5 rounded-xl border-2 mb-1.5 text-left transition-all duration-150 ${
              canAfford
                ? 'border-pancake-gold bg-pancake-cream hover:bg-pancake-light/30 cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                : 'border-shop-border/50 bg-shop-bg/50 opacity-60 cursor-not-allowed'
            }`}
          >
            <span className="text-2xl flex-shrink-0">🍳</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-pancake-brown">{cu.name}</div>
              <div className="text-xs text-pancake-medium">
                {cu.description}
                {cpsBonus > 0 && (
                  <span className="text-pancake-gold font-semibold"> (+{formatNumber(cpsBonus)} right now)</span>
                )}
              </div>
              <div className={`text-xs font-bold mt-0.5 ${canAfford ? 'text-green-700' : 'text-pancake-dark'}`}>
                🥞 {formatNumber(cu.cost)}
              </div>
            </div>
          </button>
        );
      })}

      {/* Next locked upgrade with progress bar */}
      {nextLocked && (
        <div className="p-2.5 rounded-xl border-2 border-dashed border-shop-border/50 bg-shop-bg/30">
          <div className="text-xs font-bold text-pancake-brown/50">Next: {nextLocked.name}</div>
          <div className="text-xs text-pancake-medium/50">{nextLocked.description}</div>
          {nextLocked.requiredTotalBaked && (
            <div className="mt-1.5">
              <div className="flex justify-between text-xs text-pancake-medium/50 mb-0.5">
                <span>Total baked</span>
                <span>{formatNumber(totalBaked)} / {formatNumber(nextLocked.requiredTotalBaked)}</span>
              </div>
              <div className="w-full h-2 bg-shop-border/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pancake-gold/60 to-pancake-gold rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalBaked / nextLocked.requiredTotalBaked) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {nextLocked.requiredTotalClicks && (
            <div className="mt-1.5">
              <div className="flex justify-between text-xs text-pancake-medium/50 mb-0.5">
                <span>Total clicks</span>
                <span>{formatNumber(totalClicks)} / {formatNumber(nextLocked.requiredTotalClicks)}</span>
              </div>
              <div className="w-full h-2 bg-shop-border/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pancake-gold/60 to-pancake-gold rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalClicks / nextLocked.requiredTotalClicks) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

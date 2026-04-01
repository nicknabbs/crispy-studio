import { UPGRADES, formatNumber } from './gameData';

interface UpgradesPanelProps {
  cookies: number;
  buildingCounts: Record<string, number>;
  purchasedUpgrades: Record<string, boolean>;
  onBuyUpgrade: (id: string) => void;
}

export function UpgradesPanel({
  cookies,
  buildingCounts,
  purchasedUpgrades,
  onBuyUpgrade,
}: UpgradesPanelProps) {
  const availableUpgrades = UPGRADES.filter(u => {
    if (purchasedUpgrades[u.id]) return false;
    const owned = buildingCounts[u.buildingId] || 0;
    return owned >= u.requiredOwned;
  }).sort((a, b) => a.cost - b.cost);

  if (availableUpgrades.length === 0) return null;

  return (
    <div className="p-3">
      <h3 className="text-sm font-bold text-pancake-brown mb-2">Building Upgrades</h3>
      <div className="flex flex-wrap gap-2">
        {availableUpgrades.map(u => {
          const canAfford = cookies >= u.cost;
          return (
            <button
              key={u.id}
              onClick={() => canAfford && onBuyUpgrade(u.id)}
              disabled={!canAfford}
              title={`${u.name}\n${u.description}\nCost: ${formatNumber(u.cost)}`}
              className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl transition-all duration-150 ${
                canAfford
                  ? 'border-pancake-gold bg-pancake-cream hover:scale-110 cursor-pointer shadow-md hover:shadow-lg'
                  : 'border-shop-border/50 bg-shop-bg/50 opacity-50 cursor-not-allowed'
              }`}
            >
              ⬆️
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { BUILDINGS, UPGRADES, getBulkCost, getMaxBuyable, formatNumber, formatCps } from './gameData';
import { getPrestigeMultiplier } from './useGameState';

type BuyAmount = 1 | 10 | 100 | 'max';

interface ShopProps {
  cookies: number;
  buildingCounts: Record<string, number>;
  purchasedUpgrades: Record<string, boolean>;
  sugarStars: number;
  onBuy: (id: string, count: number) => void;
  cps: number;
}

export function Shop({ cookies, buildingCounts, purchasedUpgrades, sugarStars, onBuy, cps }: ShopProps) {
  const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);

  const visibleBuildings = BUILDINGS.filter((b, i) => {
    if (i === 0) return true;
    const owned = buildingCounts[b.id] || 0;
    if (owned > 0) return true;
    const cost = getBulkCost(b, 0, 1);
    return cookies >= cost * 0.1 || cps * 300 >= cost;
  });

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-pancake-brown">Shop</h2>
        <div className="flex gap-1">
          {([1, 10, 100, 'max'] as BuyAmount[]).map(amt => (
            <button
              key={String(amt)}
              onClick={() => setBuyAmount(amt)}
              className={`px-2 py-0.5 rounded text-xs font-bold border cursor-pointer transition-all ${
                buyAmount === amt
                  ? 'bg-pancake-gold text-pancake-brown border-pancake-gold'
                  : 'bg-pancake-cream text-pancake-medium border-shop-border hover:bg-pancake-light/30'
              }`}
            >
              {amt === 'max' ? 'MAX' : `x${amt}`}
            </button>
          ))}
        </div>
      </div>
      {visibleBuildings.map(building => {
        const owned = buildingCounts[building.id] || 0;
        const count = buyAmount === 'max' ? getMaxBuyable(building, owned, cookies) : buyAmount;
        const cost = count > 0 ? getBulkCost(building, owned, count) : Infinity;
        const canAfford = count > 0 && cookies >= cost;
        const ppsEach = getBuildingPps(building.id, purchasedUpgrades, sugarStars);

        return (
          <button
            key={building.id}
            onClick={() => canAfford && onBuy(building.id, count)}
            disabled={!canAfford}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
              canAfford
                ? 'border-pancake-medium bg-pancake-cream hover:bg-pancake-light/30 hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
                : 'border-shop-border/50 bg-shop-bg/50 opacity-60 cursor-not-allowed'
            }`}
          >
            <span className="text-3xl flex-shrink-0">{building.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-pancake-brown text-sm">
                  {building.name}
                </span>
                <span className="text-xs font-medium text-pancake-dark bg-pancake-cream rounded-full px-2 py-0.5">
                  {owned}{count > 1 ? ` +${count}` : ''}
                </span>
              </div>
              <div className="text-xs text-pancake-medium mt-0.5 truncate">
                {building.flavor}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs font-bold ${canAfford ? 'text-green-700' : 'text-pancake-dark'}`}>
                  🥞 {count > 0 ? formatNumber(cost) : '---'}
                </span>
                <span className="text-xs text-pancake-medium">
                  each: {formatCps(ppsEach)} PpS
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getBuildingPps(
  buildingId: string,
  purchasedUpgrades: Record<string, boolean>,
  sugarStars: number,
): number {
  const building = BUILDINGS.find(b => b.id === buildingId);
  if (!building) return 0;
  let mult = 1;
  for (const u of UPGRADES) {
    if (u.buildingId === buildingId && purchasedUpgrades[u.id]) {
      mult *= u.multiplier;
    }
  }
  return building.baseCps * mult * getPrestigeMultiplier(sugarStars);
}

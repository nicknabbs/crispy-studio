import { PRESTIGE_UPGRADES } from './gameData';
import { playPurchase } from './sounds';

interface MapleShopProps {
  isOpen: boolean;
  onClose: () => void;
  sugarStars: number;
  purchasedPrestigeUpgrades: Record<string, boolean>;
  onBuy: (upgradeId: string) => void;
}

export function MapleShop({ isOpen, onClose, sugarStars, purchasedPrestigeUpgrades, onBuy }: MapleShopProps) {
  if (!isOpen) return null;

  const purchased = (id: string) => !!purchasedPrestigeUpgrades[id];
  const canAfford = (cost: number) => sugarStars >= cost;
  const meetsReq = (req?: string) => !req || purchased(req);

  const handleBuy = (id: string) => {
    onBuy(id);
    playPurchase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pancake-gold/20 to-pancake-cream rounded-t-2xl border-b-2 border-pancake-gold/30 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">🍁 Maple Star Shop</h2>
            <p className="text-sm text-pancake-medium mt-0.5">
              Spend your stars on permanent upgrades
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-pancake-gold/20 text-pancake-brown font-bold px-3 py-1.5 rounded-full text-sm border border-pancake-gold/40">
              🍁 {sugarStars} Stars
            </span>
            <button
              onClick={onClose}
              className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4">
          {sugarStars === 0 && Object.keys(purchasedPrestigeUpgrades).length === 0 && (
            <div className="text-center py-8 text-pancake-medium">
              <div className="text-4xl mb-3">🍁</div>
              <p className="font-medium">You need Maple Stars to shop here!</p>
              <p className="text-sm mt-1">Prestige to earn your first stars.</p>
            </div>
          )}

          <div className="grid gap-3">
            {PRESTIGE_UPGRADES.map(upgrade => {
              const owned = purchased(upgrade.id);
              const affordable = canAfford(upgrade.cost);
              const unlocked = meetsReq(upgrade.requires);
              const locked = !unlocked && !owned;
              const buyable = !owned && affordable && unlocked;

              return (
                <button
                  key={upgrade.id}
                  onClick={() => buyable && handleBuy(upgrade.id)}
                  disabled={!buyable}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                    owned
                      ? 'border-pancake-gold bg-pancake-gold/10 opacity-70'
                      : locked
                        ? 'border-shop-border/30 bg-shop-bg/30 opacity-40'
                        : buyable
                          ? 'border-pancake-gold bg-pancake-cream hover:bg-pancake-light/30 hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
                          : 'border-shop-border/50 bg-shop-bg/50 opacity-60'
                  }`}
                >
                  <span className="text-3xl flex-shrink-0">{locked ? '🔒' : upgrade.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-pancake-brown text-sm">
                        {locked ? '???' : upgrade.name}
                      </span>
                      {owned ? (
                        <span className="text-xs font-bold text-pancake-gold bg-pancake-gold/20 px-2 py-0.5 rounded-full">Owned</span>
                      ) : (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          affordable && unlocked ? 'text-pancake-brown bg-pancake-gold/30' : 'text-pancake-medium bg-shop-border/20'
                        }`}>
                          🍁 {upgrade.cost}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-pancake-medium mt-0.5 truncate">
                      {locked ? 'Requires a previous upgrade...' : upgrade.description}
                    </div>
                    {upgrade.requires && !locked && !owned && (
                      <div className="text-xs mt-0.5">
                        {purchased(upgrade.requires) ? (
                          <span className="text-green-600">Prerequisite met</span>
                        ) : (
                          <span className="text-red-400">Requires: {PRESTIGE_UPGRADES.find(u => u.id === upgrade.requires)?.name}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

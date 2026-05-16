import { useMemo } from 'react';
import { DEFAULT_SKIN, renderSkinLayers, type PancakeSkin } from './skinEngine';
import { SHOP_SKINS, type ShopSkin } from './skinShop';
import { formatNumber } from './gameData';

interface PancakeStylistProps {
  isOpen: boolean;
  onClose: () => void;
  skin: PancakeSkin | null;
  onSkinChange: (skin: PancakeSkin | null) => void;
  cookies: number;
  ownedSkinIds: string[];
  onPurchase: (shopSkin: ShopSkin) => void;
}

export function PancakeStylist({
  isOpen, onClose, skin, onSkinChange, cookies, ownedSkinIds, onPurchase,
}: PancakeStylistProps) {
  const ownedSet = useMemo(() => new Set(ownedSkinIds), [ownedSkinIds]);

  if (!isOpen) return null;

  const equippedName = skin?.name ?? 'Default Stack';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream rounded-t-2xl border-b-2 border-pancake-gold/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-pancake-gold/20 flex items-center justify-center text-2xl">
              🥞
            </div>
            <div>
              <h2 className="text-lg font-bold text-pancake-brown leading-tight">Pancake's Skin Shop</h2>
              <p className="text-xs text-pancake-medium">Spend pancakes to dress up your stack</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Balance + currently equipped */}
        <div className="px-4 py-3 bg-pancake-warm border-b border-pancake-gold/20 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="text-[11px] uppercase tracking-wide text-pancake-medium">Balance</div>
            <div className="text-lg font-bold text-pancake-brown">🥞 {formatNumber(cookies)}</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[11px] uppercase tracking-wide text-pancake-medium">Equipped</div>
            <div className="text-sm font-bold text-pancake-brown truncate max-w-[180px]">{equippedName}</div>
            {skin && (
              <button
                onClick={() => onSkinChange(null)}
                className="text-[11px] text-pancake-medium hover:text-pancake-brown underline cursor-pointer bg-transparent border-0 p-0 mt-0.5"
              >
                Unequip (use Default)
              </button>
            )}
          </div>
        </div>

        {/* Shop list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {SHOP_SKINS.map(shopSkin => {
            const owned = ownedSet.has(shopSkin.id);
            const equipped = owned && skin?.name === shopSkin.skin.name;
            const affordable = cookies >= shopSkin.price;
            return (
              <SkinCard
                key={shopSkin.id}
                shopSkin={shopSkin}
                owned={owned}
                equipped={equipped}
                affordable={affordable}
                onBuy={() => onPurchase(shopSkin)}
                onEquip={() => onSkinChange(shopSkin.skin)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface SkinCardProps {
  shopSkin: ShopSkin;
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
  onBuy: () => void;
  onEquip: () => void;
}

function SkinCard({ shopSkin, owned, equipped, affordable, onBuy, onEquip }: SkinCardProps) {
  const preview = shopSkin.skin;
  const { pattern, topping, text } = renderSkinLayers(preview, `shop-${shopSkin.id}`);

  return (
    <div className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-colors ${
      equipped
        ? 'border-pancake-gold bg-pancake-gold/10'
        : 'border-shop-border bg-pancake-warm'
    }`}>
      {/* Preview */}
      <div
        className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden"
        style={{
          boxShadow: preview.glow ? `0 0 14px ${preview.glow}` : undefined,
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <radialGradient id={`g-${shopSkin.id}`} cx="40%" cy="35%">
              <stop offset="0%" stopColor="#FFE082" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#C89532" stopOpacity="0" />
            </radialGradient>
            <clipPath id={`clip-${shopSkin.id}`}>
              <ellipse cx="100" cy="95" rx="78" ry="45" />
            </clipPath>
          </defs>
          <g>
            <ellipse cx="100" cy="120" rx="88" ry="30" fill="#000" opacity="0.2" />
            <ellipse cx="100" cy="105" rx="85" ry="55" fill={preview.baseColor} />
            <ellipse cx="100" cy="105" rx="82" ry="52" fill={preview.accentColor} opacity="0.9" />
            <ellipse cx="100" cy="95" rx="78" ry="45" fill={preview.highlightColor} />
            <ellipse cx="100" cy="95" rx="78" ry="45" fill={`url(#g-${shopSkin.id})`} />
            <ellipse cx="100" cy="95" rx="78" ry="45" fill="none" stroke={preview.accentColor} strokeWidth="2" opacity="0.45" />
          </g>
          {pattern}
          {topping}
          {text}
        </svg>
      </div>

      {/* Name + blurb */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-bold text-pancake-brown text-sm truncate">{shopSkin.name}</div>
          {equipped && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-pancake-brown bg-pancake-gold px-1.5 py-0.5 rounded">
              Equipped
            </span>
          )}
        </div>
        <div className="text-[11px] text-pancake-medium leading-tight mt-0.5 line-clamp-2">{shopSkin.blurb}</div>
        <div className="text-[11px] text-pancake-medium mt-1">
          🥞 {formatNumber(shopSkin.price)}
        </div>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0">
        {owned ? (
          equipped ? (
            <button
              disabled
              className="px-3 py-2 rounded-lg bg-pancake-warm border-2 border-pancake-gold text-pancake-brown text-xs font-bold cursor-not-allowed opacity-80"
            >
              ✓
            </button>
          ) : (
            <button
              onClick={onEquip}
              className="px-3 py-2 rounded-lg bg-pancake-gold text-pancake-brown text-xs font-bold border-0 cursor-pointer hover:brightness-105 whitespace-nowrap"
            >
              Equip
            </button>
          )
        ) : (
          <button
            onClick={onBuy}
            disabled={!affordable}
            className="px-3 py-2 rounded-lg bg-pancake-gold text-pancake-brown text-xs font-bold border-0 cursor-pointer hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {affordable ? 'Buy' : '🔒'}
          </button>
        )}
      </div>
    </div>
  );
}

interface StylistButtonProps {
  onClick: () => void;
}

export function PancakeStylistButton({ onClick }: StylistButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute top-1/2 -translate-y-1/2 right-3 md:right-6 z-20
                 w-14 h-14 md:w-16 md:h-16 rounded-full
                 border-0 cursor-pointer p-0
                 shadow-[0_4px_0_rgba(139,105,20,0.35),0_8px_16px_rgba(0,0,0,0.15)]
                 hover:scale-110 active:scale-95 transition-transform"
      style={{ animation: 'stylist-bob 2.4s ease-in-out infinite' }}
      title="Pancake — skin shop"
      aria-label="Open Pancake skin shop"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id="miniGradient" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#FFE082" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C89532" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="62" rx="44" ry="14" fill="#000" opacity="0.22" />
        <ellipse cx="50" cy="52" rx="42" ry="28" fill="#D4A044" />
        <ellipse cx="50" cy="50" rx="40" ry="26" fill="#E8B84C" />
        <ellipse cx="50" cy="46" rx="38" ry="22" fill="#F0C85C" />
        <ellipse cx="50" cy="46" rx="38" ry="22" fill="url(#miniGradient)" />
        <circle cx="38" cy="43" r="3" fill="#4A3728" />
        <circle cx="62" cy="43" r="3" fill="#4A3728" />
        <circle cx="37" cy="42" r="1" fill="#fff" />
        <circle cx="61" cy="42" r="1" fill="#fff" />
        <path
          d="M 38 54 Q 50 62 62 54"
          fill="none"
          stroke="#4A3728"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx="32" cy="52" rx="4" ry="2.5" fill="#F48FB1" opacity="0.55" />
        <ellipse cx="68" cy="52" rx="4" ry="2.5" fill="#F48FB1" opacity="0.55" />
      </svg>
      <style>{`
        @keyframes stylist-bob {
          0%, 100% { transform: translateY(-50%) rotate(-4deg); }
          50% { transform: translateY(calc(-50% - 6px)) rotate(4deg); }
        }
      `}</style>
    </button>
  );
}

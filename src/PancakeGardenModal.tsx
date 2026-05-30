import { useState } from 'react';
import {
  GARDEN_SPECIES,
  GARDEN_COLUMNS,
  stageProgress,
  secondsToNextStage,
  secondsUntilDecay,
  secondsToMature,
  type PlantSpecies,
} from './pancakeGarden';
import { formatNumber } from './gameData';
import type { ResolvedTile, DiscoveryNotice, GardenBonuses } from './usePancakeGarden';

interface PancakeGardenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiles: ResolvedTile[];
  bonuses: GardenBonuses;
  discovered: Record<string, boolean>;
  cps: number;
  onPlant: (tileId: number, speciesId: string) => void;
  onHarvest: (tileId: number) => void;
  onClear: (tileId: number) => void;
  discoveryNotice: DiscoveryNotice | null;
  onDismissDiscovery: () => void;
  /** Whether the player has completed (or skipped) the first-time
   *  tutorial. When false, the modal renders the coach overlay on first
   *  open and calls onMarkTutorialSeen when the player finishes / skips. */
  tutorialSeen: boolean;
  onMarkTutorialSeen: () => void;
}

export function PancakeGardenModal(props: PancakeGardenModalProps) {
  const {
    isOpen, onClose, tiles, bonuses, discovered, cps,
    onPlant, onHarvest, onClear, discoveryNotice, onDismissDiscovery,
    tutorialSeen, onMarkTutorialSeen,
  } = props;
  const [pickerForTile, setPickerForTile] = useState<number | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(!tutorialSeen);

  if (!isOpen) return null;

  const discoveredCount = Object.keys(discovered).filter(k => discovered[k]).length;
  const totalSpecies = GARDEN_SPECIES.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <style>{GARDEN_KEYFRAMES}</style>
      <div
        className="rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border-4"
        style={{
          background: 'linear-gradient(180deg, #FFF8E1 0%, #FFFAF0 100%)',
          borderColor: '#C8A464',
          boxShadow: '0 20px 60px rgba(76, 110, 60, 0.25), 0 0 0 1px rgba(200, 164, 100, 0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="sticky top-0 border-b-2 px-5 py-4 flex items-start justify-between z-10 relative overflow-hidden"
          style={{
            background: 'linear-gradient(120deg, #DCEDC8 0%, #FFE082 60%, #FFF8E1 100%)',
            borderColor: 'rgba(200, 164, 100, 0.5)',
          }}
        >
          {/* Sun-ray decorations */}
          <div className="absolute -top-6 -right-6 text-6xl opacity-20 select-none pointer-events-none">☀️</div>
          <div className="absolute -bottom-3 -left-3 text-5xl opacity-15 select-none pointer-events-none">🌿</div>
          <div className="relative">
            <h2 className="text-xl font-extrabold text-pancake-brown flex items-center gap-2">
              <span style={{ animation: 'pg-sway 3s ease-in-out infinite' }}>🌱</span>
              Pancake Garden
            </h2>
            <p className="text-xs text-pancake-brown/80 mt-0.5 font-medium">
              Grow rare plants over real time · <span className="font-bold">{discoveredCount}/{totalSpecies}</span> species discovered
            </p>
            <div className="text-[11px] mt-1.5 flex flex-wrap gap-1.5">
              {bonuses.cpsPercent > 0 && <span className="bg-green-200/80 text-green-900 px-1.5 py-0.5 rounded-full font-extrabold border border-green-300">+{bonuses.cpsPercent}% CpS</span>}
              {bonuses.clickPercent > 0 && <span className="bg-blue-200/80 text-blue-900 px-1.5 py-0.5 rounded-full font-extrabold border border-blue-300">+{bonuses.clickPercent}% click</span>}
              {bonuses.butterSpeedPercent > 0 && <span className="bg-yellow-200/80 text-yellow-900 px-1.5 py-0.5 rounded-full font-extrabold border border-yellow-300">+{bonuses.butterSpeedPercent}% butter</span>}
              {bonuses.cpsPercent === 0 && bonuses.clickPercent === 0 && bonuses.butterSpeedPercent === 0 && (
                <span className="italic text-pancake-brown/60">Plant a seedling to start growing.</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-pancake-brown/70 hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none relative"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div
          className="grid gap-2 p-4"
          style={{ gridTemplateColumns: `repeat(${GARDEN_COLUMNS}, minmax(0, 1fr))` }}
        >
          {tiles.map(tile => (
            <TileCard
              key={tile.id}
              tile={tile}
              cps={cps}
              onClickPlant={() => setPickerForTile(tile.id)}
              onHarvest={() => onHarvest(tile.id)}
              onClear={() => onClear(tile.id)}
            />
          ))}
        </div>

        <div className="px-5 pb-4 text-[11px] text-pancake-medium">
          Mature plants grant their bonus while alive. Harvest before they decay.
          Hybrids unlock by planting next to mature parent pairs.
        </div>
      </div>

      {pickerForTile !== null && (
        <PlantPicker
          discovered={discovered}
          onPick={(speciesId) => { onPlant(pickerForTile, speciesId); setPickerForTile(null); }}
          onClose={() => setPickerForTile(null)}
        />
      )}

      {discoveryNotice && (
        <DiscoveryToast notice={discoveryNotice} onDismiss={onDismissDiscovery} />
      )}

      {tutorialOpen && (
        <GardenTutorial
          onFinish={() => {
            setTutorialOpen(false);
            onMarkTutorialSeen();
          }}
        />
      )}
    </div>
  );
}

interface TileCardProps {
  tile: ResolvedTile;
  cps: number;
  onClickPlant: () => void;
  onHarvest: () => void;
  onClear: () => void;
}

function TileCard({ tile, cps, onClickPlant, onHarvest, onClear }: TileCardProps) {
  // Empty tile — click to plant
  if (!tile.species) {
    return (
      <button
        onClick={onClickPlant}
        className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden hover:scale-[1.03]"
        style={{
          borderColor: 'rgba(160, 200, 120, 0.5)',
          background: 'linear-gradient(135deg, rgba(220, 237, 200, 0.5) 0%, rgba(255, 248, 225, 0.6) 100%)',
        }}
      >
        <span className="text-3xl opacity-50" style={{ animation: 'pg-shimmer 3.6s ease-in-out infinite' }}>🍳</span>
        <span className="text-[10px] mt-1 font-extrabold uppercase tracking-wide text-green-900/70">Plant</span>
      </button>
    );
  }

  const species = tile.species;
  const stage = tile.stage;
  const progress = stageProgress(species, tile.ageSeconds);
  const remaining = secondsToNextStage(species, tile.ageSeconds);
  const decayRemaining = stage === 'mature'
    ? secondsUntilDecay(tile.harvestExpiresAt, Date.now())
    : null;

  // Display emoji shrinks at earlier stages so growth feels real.
  const scale = stage === 'seed' ? 'text-lg' : stage === 'sprout' ? 'text-2xl' : 'text-4xl';

  const stageLabel: Record<typeof stage, string> = {
    seed: 'Seed', sprout: 'Growing', mature: 'Mature!', decayed: 'Decayed', empty: '',
  };

  // Stage-aware container styling: seed pale green, sprout brighter green,
  // mature gold-glowing, decayed red-faded.
  const tileStyle = (() => {
    if (stage === 'mature') {
      return {
        background: 'linear-gradient(135deg, #FFE082 0%, #FFF59D 100%)',
        borderColor: '#C8A464',
        boxShadow: '0 0 16px rgba(212, 160, 23, 0.5), inset 0 0 12px rgba(255, 224, 130, 0.4)',
        animation: 'pg-glow 2.4s ease-in-out infinite',
      };
    }
    if (stage === 'decayed') {
      return {
        background: 'linear-gradient(135deg, #FFCDD2 0%, #FFEBEE 100%)',
        borderColor: '#EF9A9A',
      };
    }
    if (stage === 'sprout') {
      return {
        background: 'linear-gradient(135deg, #C5E1A5 0%, #DCEDC8 100%)',
        borderColor: '#9CCC65',
      };
    }
    // seed
    return {
      background: 'linear-gradient(135deg, #DCEDC8 0%, #F1F8E9 100%)',
      borderColor: '#AED581',
    };
  })();

  return (
    <div
      className="aspect-square rounded-xl border-2 flex flex-col items-center justify-between p-2 transition-all"
      style={tileStyle}
    >
      <div className="text-[10px] font-bold uppercase tracking-wide text-pancake-brown text-center leading-tight w-full truncate">
        {species.name}
      </div>
      <div className={`${scale} leading-none ${stage === 'decayed' ? 'opacity-40 grayscale' : ''}`}>
        {species.emoji}
      </div>
      <div className="w-full">
        {stage === 'mature' ? (
          <>
            <button
              onClick={onHarvest}
              className="w-full py-1 rounded-md bg-pancake-gold text-pancake-brown text-[10px] font-extrabold border-0 cursor-pointer hover:brightness-105"
              title={harvestPreviewText(species, cps)}
            >
              Harvest
            </button>
            {decayRemaining !== null && (
              <div className="text-[9px] text-pancake-medium mt-0.5 text-center tabular-nums">
                Decays in {formatTime(decayRemaining)}
              </div>
            )}
          </>
        ) : stage === 'decayed' ? (
          <button
            onClick={onClear}
            className="w-full py-1 rounded-md bg-red-200 text-red-700 text-[10px] font-bold border-0 cursor-pointer hover:bg-red-300"
          >
            Clear
          </button>
        ) : (
          <>
            <div className="h-1.5 rounded-full bg-pancake-gold/20 overflow-hidden">
              <div
                className="h-full bg-pancake-gold transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="text-[9px] text-pancake-medium mt-0.5 text-center tabular-nums">
              {stageLabel[stage]} · {formatTime(remaining)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlantPicker({
  discovered, onPick, onClose,
}: { discovered: Record<string, boolean>; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto border-4 border-pancake-gold"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-pancake-gold/30 flex items-center justify-between">
          <h3 className="font-extrabold text-pancake-brown">Plant a seedling</h3>
          <button
            onClick={onClose}
            className="text-lg text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
          >✕</button>
        </div>
        <div className="p-3 flex flex-col gap-2">
          {GARDEN_SPECIES.map(s => {
            const isDiscovered = !!discovered[s.id];
            if (!isDiscovered) {
              return (
                <div key={s.id} className="px-3 py-2 rounded-lg bg-pancake-warm/30 border border-pancake-gold/20 flex items-center gap-3 opacity-50">
                  <span className="text-2xl">❓</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-pancake-brown font-bold text-sm">??? (Tier {s.tier})</div>
                    <div className="text-pancake-medium text-[11px]">{s.hint}</div>
                  </div>
                </div>
              );
            }
            return (
              <button
                key={s.id}
                onClick={() => onPick(s.id)}
                className="text-left px-3 py-2 rounded-lg bg-white/70 border border-pancake-gold/30 hover:bg-pancake-warm cursor-pointer flex items-center gap-3"
              >
                <span className="text-2xl">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-pancake-brown font-bold text-sm">{s.name} <span className="text-pancake-medium font-normal text-[10px]">T{s.tier}</span></div>
                  <div className="text-pancake-medium text-[11px]">
                    {formatMatureTime(secondsToMature(s))} to mature
                    {s.activeBonus && (
                      <> · {describeBonus(s.activeBonus)}</>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DiscoveryToast({ notice, onDismiss }: { notice: DiscoveryNotice; onDismiss: () => void }) {
  return (
    <div
      className="fixed top-12 left-1/2 -translate-x-1/2 z-[60] bg-pancake-cream border-4 border-pancake-gold rounded-2xl shadow-2xl px-5 py-3 text-center pointer-events-auto cursor-pointer"
      onClick={onDismiss}
      style={{ boxShadow: '0 0 24px rgba(212, 160, 23, 0.55)' }}
    >
      <div className="text-[10px] uppercase tracking-wider font-bold text-pancake-medium">🌱 New species discovered</div>
      <div className="text-3xl mt-1">{notice.speciesEmoji}</div>
      <div className="text-pancake-brown font-extrabold text-lg mt-1">{notice.speciesName}</div>
      <div className="text-[10px] text-pancake-medium mt-1">Tap to dismiss</div>
    </div>
  );
}

function harvestPreviewText(species: PlantSpecies, cps: number): string {
  const drop = species.harvestDrop;
  if (!drop) return 'Harvest';
  const parts: string[] = [];
  if (drop.pancakesFlatBase) parts.push(`+${formatNumber(drop.pancakesFlatBase)} pancakes`);
  if (drop.pancakesCpsMultiplier) parts.push(`+${formatNumber(drop.pancakesCpsMultiplier * cps)} pancakes`);
  if (drop.mapleStars && drop.mapleStarsChance) {
    parts.push(`${Math.round(drop.mapleStarsChance * 100)}% chance: +${drop.mapleStars} Maple Star${drop.mapleStars > 1 ? 's' : ''}`);
  }
  return parts.length > 0 ? `Harvest — ${parts.join(', ')}` : 'Harvest';
}

function describeBonus(b: NonNullable<PlantSpecies['activeBonus']>): string {
  const parts: string[] = [];
  if (b.cpsPercent) parts.push(`+${b.cpsPercent}% CpS`);
  if (b.clickPercent) parts.push(`+${b.clickPercent}% click`);
  if (b.butterSpeedPercent) parts.push(`+${b.butterSpeedPercent}% butter`);
  return parts.join(', ');
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s`;
}

/** Plain-language duration for the "X to mature" picker hint. Whole minutes
 *  when the duration divides cleanly; otherwise minutes + seconds. */
function formatMatureTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (s === 0) return `${m} min`;
  return `${m} min ${s}s`;
}

const TUTORIAL_STEPS = [
  {
    emoji: '🌱',
    title: 'Welcome to the Pancake Garden!',
    body: 'Tap any empty tile (the 🍳 pan) to pick a seedling and plant it.',
  },
  {
    emoji: '⏳',
    title: 'Plants grow in real time',
    body: 'Seedlings need real-world minutes to mature. You can close the game and they\'ll keep growing in the background.',
  },
  {
    emoji: '🥞',
    title: 'Mature plants give a CpS boost…',
    body: 'While a plant is Mature you get its passive bonus on every pancake.',
  },
  {
    emoji: '🌾',
    title: '…then harvest before it decays',
    body: 'After it matures you have a couple of minutes to tap Harvest for a big pancake payout. Closed-game plants pause their decay timer until you\'re back.',
  },
];

function GardenTutorial({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const s = TUTORIAL_STEPS[step];
  return (
    <div
      className="fixed inset-0 z-[58] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={e => e.stopPropagation()}
    >
      <div
        className="rounded-2xl shadow-2xl border-4 border-pancake-gold bg-pancake-cream max-w-sm w-full p-5 text-center"
        style={{ boxShadow: '0 0 30px rgba(212, 160, 23, 0.55)' }}
      >
        <div className="text-[11px] uppercase tracking-wider font-bold text-pancake-medium">
          Garden tutorial · {step + 1} / {TUTORIAL_STEPS.length}
        </div>
        <div className="text-5xl mt-2 mb-1" style={{ animation: 'pg-sway 3s ease-in-out infinite' }}>
          {s.emoji}
        </div>
        <h3 className="font-extrabold text-pancake-brown text-lg leading-tight">
          {s.title}
        </h3>
        <p className="text-sm text-pancake-dark mt-2">
          {s.body}
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onFinish}
            className="flex-1 py-2 rounded-lg border-2 border-pancake-medium/40 bg-pancake-warm text-pancake-brown text-sm font-bold cursor-pointer hover:bg-pancake-warm/80"
          >
            Skip
          </button>
          <button
            onClick={() => isLast ? onFinish() : setStep(step + 1)}
            className="flex-1 py-2 rounded-lg bg-pancake-gold text-pancake-brown text-sm font-extrabold border-0 cursor-pointer hover:brightness-105"
          >
            {isLast ? "Let’s grow" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Scoped animation keyframes. Lives inside the modal so we don't have to
// touch the global stylesheet to add the garden-specific motion.
const GARDEN_KEYFRAMES = `
@keyframes pg-sway {
  0%, 100% { transform: rotate(-4deg); }
  50%      { transform: rotate(4deg); }
}
@keyframes pg-shimmer {
  0%, 100% { opacity: 0.45; transform: scale(1); }
  50%      { opacity: 0.7;  transform: scale(1.05); }
}
@keyframes pg-glow {
  0%, 100% { box-shadow: 0 0 14px rgba(212, 160, 23, 0.45), inset 0 0 10px rgba(255, 224, 130, 0.35); }
  50%      { box-shadow: 0 0 22px rgba(212, 160, 23, 0.65), inset 0 0 14px rgba(255, 224, 130, 0.55); }
}
`;


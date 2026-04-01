import { useState } from 'react';
import { SplitGame } from './SplitGame';
import { EdgeSlicerGame } from './EdgeSlicerGame';
import { StackerGame } from './StackerGame';
import { FlipperGame } from './FlipperGame';
import { CatcherGame } from './CatcherGame';
import { RecipeGame } from './RecipeGame';
import { ChopperGame } from './ChopperGame';
import { Leaderboard } from './Leaderboard';

interface MiniGamesProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveGame = null | 'split' | 'edge' | 'chopper' | 'stacker' | 'flipper' | 'catcher' | 'recipe';

const GAMES = [
  {
    id: 'split' as const,
    name: 'Split the Pancake',
    emoji: '🔪',
    description: 'Cut the pancake exactly in half! How precise can you be?',
  },
  {
    id: 'edge' as const,
    name: 'Edge Slicer',
    emoji: '🗡️',
    description: 'Cut as close to the edge as possible. Can you hit 0.1%?',
  },
  {
    id: 'chopper' as const,
    name: 'Pancake Chopper',
    emoji: '🪓',
    description: 'Tap as fast as you can! How many pieces can you chop?',
  },
  {
    id: 'stacker' as const,
    name: 'Pancake Stacker',
    emoji: '🥞',
    description: 'Stack pancakes as high as you can without toppling!',
  },
  {
    id: 'flipper' as const,
    name: 'Pancake Flipper',
    emoji: '🍳',
    description: 'Flip the pancake at the perfect golden moment!',
  },
  {
    id: 'catcher' as const,
    name: 'Batter Catcher',
    emoji: '🥛',
    description: 'Catch batter drops with your pan. Dodge the burnt ones!',
  },
  {
    id: 'recipe' as const,
    name: 'Recipe Rush',
    emoji: '🥣',
    description: 'Tap the right ingredients before time runs out!',
  },
];

export function MiniGames({ isOpen, onClose }: MiniGamesProps) {
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  if (!isOpen) return null;

  if (activeGame === 'split') return <SplitGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'edge') return <EdgeSlicerGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'chopper') return <ChopperGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'stacker') return <StackerGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'flipper') return <FlipperGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'catcher') return <CatcherGame onBack={() => setActiveGame(null)} />;
  if (activeGame === 'recipe') return <RecipeGame onBack={() => setActiveGame(null)} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pancake-gold/20 to-pancake-cream rounded-t-2xl p-4 border-b-2 border-shop-border/30 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-pancake-brown">🎮 Mini Games</h2>
          <button
            onClick={onClose}
            className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* Leaderboard button */}
          <button
            onClick={() => setLeaderboardOpen(true)}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-pancake-gold bg-gradient-to-r from-yellow-50 to-pancake-cream hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all duration-150 text-left"
          >
            <span className="text-4xl flex-shrink-0">🏆</span>
            <div>
              <div className="font-bold text-pancake-brown">Leaderboard</div>
              <div className="text-xs text-pancake-medium mt-0.5">See top scores and submit yours!</div>
            </div>
          </button>

          {GAMES.map(game => (
            <button
              key={game.id}
              onClick={() => setActiveGame(game.id)}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-pancake-medium bg-pancake-cream hover:bg-pancake-light/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all duration-150 text-left"
            >
              <span className="text-4xl flex-shrink-0">{game.emoji}</span>
              <div>
                <div className="font-bold text-pancake-brown">{game.name}</div>
                <div className="text-xs text-pancake-medium mt-0.5">{game.description}</div>
              </div>
            </button>
          ))}
        </div>

        <Leaderboard isOpen={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      </div>
    </div>
  );
}

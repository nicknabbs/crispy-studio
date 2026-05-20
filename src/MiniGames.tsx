import { useState, useCallback } from 'react';
import { SplitGame } from './SplitGame';
import { EdgeSlicerGame } from './EdgeSlicerGame';
import { StackerGame } from './StackerGame';
import { FlipperGame } from './FlipperGame';
import { CatcherGame } from './CatcherGame';
import { RecipeGame } from './RecipeGame';
import { ChopperGame } from './ChopperGame';
import { SyrupGame } from './SyrupGame';
import { BerryGame } from './BerryGame';
import { TossGame } from './TossGame';
import { PourGame } from './PourGame';
import { MazeGame } from './MazeGame';
import { MemoryGame } from './MemoryGame';
import { GridGame } from './GridGame';
import { BlastGame } from './BlastGame';
import { ShuffleGame } from './ShuffleGame';
import { PopReactionGame } from './PopReactionGame';
import { BossGame } from './BossGame';
import { Leaderboard } from './Leaderboard';
import { autoSubmitScore } from './autoSubmitScore';
import { renameLeaderboardPlayer } from './leaderboardApi';

interface MiniGamesProps {
  isOpen: boolean;
  onClose: () => void;
  /** Open the Pancake Garden modal (a persistent overlay rather than a
   *  score-based mini-game). Called by the garden card here so App.tsx
   *  can manage the overlay state. */
  onOpenGarden?: () => void;
}

// NameModal is a stable top-level component on purpose. Defining it inside
// MiniGames made it a fresh function reference on every render — React saw
// a new component type each time and remounted the input subtree, which
// stole focus and dismissed the iOS keyboard mid-keystroke.
interface NameModalProps {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function NameModal({ open, value, onChange, onSave, onCancel }: NameModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-xl shadow-xl p-5 w-72">
        <h3 className="font-bold text-pancake-brown text-lg mb-1">New High Score!</h3>
        <p className="text-xs text-pancake-medium mb-3">Enter your name for the leaderboard</p>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(); }}
          maxLength={20}
          placeholder="Your name..."
          autoFocus
          autoCapitalize="words"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          className="w-full px-3 py-2 rounded-lg border-2 border-pancake-medium bg-white text-pancake-brown text-sm mb-3 outline-none focus:border-pancake-gold"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown text-sm font-bold cursor-pointer"
          >
            Skip
          </button>
          <button
            onClick={onSave}
            disabled={!value.trim()}
            className="flex-1 py-2 rounded-lg bg-pancake-gold text-pancake-brown text-sm font-bold cursor-pointer border-0 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

type ActiveGame = null | 'split' | 'edge' | 'chopper' | 'stacker' | 'flipper' | 'catcher' | 'recipe' | 'syrup' | 'berry' | 'toss' | 'pour' | 'maze' | 'memory' | 'grid' | 'blast' | 'shuffle' | 'pop' | 'boss';

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
  {
    id: 'syrup' as const,
    name: 'Syrup Drizzle',
    emoji: '🍯',
    description: 'Trace the syrup shape and hit all the dots!',
  },
  {
    id: 'berry' as const,
    name: 'Blueberry Sort',
    emoji: '🫐',
    description: 'Tap ripe berries, let rotten ones fall. Three lives.',
  },
  {
    id: 'toss' as const,
    name: 'Pancake Toss & Catch',
    emoji: '🥞',
    description: 'Catch the pancake as it returns. Each catch goes higher!',
  },
  {
    id: 'pour' as const,
    name: 'Batter Pour Precision',
    emoji: '🫗',
    description: 'Hold to pour, release exactly at target weight.',
  },
  {
    id: 'maze' as const,
    name: 'Pancake Maze Roll',
    emoji: '🌀',
    description: 'Roll through the maze. Grab syrup, dodge burnt spots!',
  },
  {
    id: 'memory' as const,
    name: 'Short Stack Memory',
    emoji: '🧠',
    description: 'Watch the pattern of flashing pancakes, then tap it back!',
  },
  {
    id: 'grid' as const,
    name: 'Griddle Grid Puzzle',
    emoji: '🔲',
    description: 'Tetris-style: fit falling pancake pieces, clear full rows.',
  },
  {
    id: 'blast' as const,
    name: 'Pancake Blast',
    emoji: '🧱',
    description: 'Block Blast-style! Place pieces on an 8×8 grid, clear rows or columns.',
  },
  {
    id: 'shuffle' as const,
    name: 'Pancake Toppings Shuffle',
    emoji: '🎩',
    description: 'Track the berry pancake under three shuffled lids. +1000 per round, keep going till you slip! A girl named Mason helped bring this mini game to life.',
  },
  {
    id: 'pop' as const,
    name: 'Pancake Pop Reaction Test',
    emoji: '⚡',
    description: 'Wait. A tiny pancake pops up. Tap it as fast as you can. Three rounds, each smaller and faster — lowest average reaction time wins.',
  },
  {
    id: 'boss' as const,
    name: 'Pancake Boss',
    emoji: '😠',
    description: 'Defeat the angry robo-pancake boss. Tap to attack. Spend Pancake Points on damage and accuracy upgrades. Hundreds of bosses ahead.',
  },
];

export function MiniGames({ isOpen, onClose, onOpenGarden }: MiniGamesProps) {
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [namePrompt, setNamePrompt] = useState<{ gameId: string; score: number } | null>(null);
  const [nameInput, setNameInput] = useState('');

  const handleScore = useCallback((gameId: string, score: number) => {
    const existingName = localStorage.getItem('pancake-player-name')?.trim();
    if (existingName) {
      autoSubmitScore(gameId, score);
    } else {
      setNamePrompt({ gameId, score });
      setNameInput('');
    }
  }, []);

  const handleNameSubmit = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !namePrompt) return;
    const newName = trimmed.slice(0, 20);
    const oldName = localStorage.getItem('pancake-player-name') ?? '';
    localStorage.setItem('pancake-player-name', newName);
    // Follow any existing leaderboard rows to the new name before we submit
    // the next score (so the new score replaces / sits next to the right row).
    void renameLeaderboardPlayer(oldName, newName).finally(() => {
      autoSubmitScore(namePrompt.gameId, namePrompt.score);
    });
    setNamePrompt(null);
  };

  if (!isOpen) return null;

  const goBack = () => setActiveGame(null);

  const namePromptOpen = !!namePrompt;
  const onNameCancel = () => setNamePrompt(null);
  const modal = (
    <NameModal
      open={namePromptOpen}
      value={nameInput}
      onChange={setNameInput}
      onSave={handleNameSubmit}
      onCancel={onNameCancel}
    />
  );

  if (activeGame === 'split') return <><SplitGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'edge') return <><EdgeSlicerGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'chopper') return <><ChopperGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'stacker') return <><StackerGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'flipper') return <><FlipperGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'catcher') return <><CatcherGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'recipe') return <><RecipeGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'syrup') return <><SyrupGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'berry') return <><BerryGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'toss') return <><TossGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'pour') return <><PourGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'maze') return <><MazeGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'memory') return <><MemoryGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'grid') return <><GridGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'blast') return <><BlastGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'shuffle') return <><ShuffleGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'pop') return <><PopReactionGame onBack={goBack} onScore={handleScore} />{modal}</>;
  if (activeGame === 'boss') return <><BossGame onBack={goBack} onScore={handleScore} />{modal}</>;

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
              <div className="text-xs text-pancake-medium mt-0.5">See top scores across all games</div>
            </div>
          </button>

          {onOpenGarden && (
            <button
              onClick={() => { onOpenGarden(); onClose(); }}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-pancake-gold bg-gradient-to-r from-pancake-warm to-pancake-cream hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all duration-150 text-left"
            >
              <span className="text-4xl flex-shrink-0">🌱</span>
              <div>
                <div className="font-bold text-pancake-brown flex items-center gap-2">
                  Pancake Garden
                  <span className="text-[10px] uppercase tracking-wide bg-pancake-gold/40 text-pancake-brown px-1.5 py-0.5 rounded">passive</span>
                </div>
                <div className="text-xs text-pancake-medium mt-0.5">
                  Grow rare pancake plants over real time. Mature plants boost CpS, click power, and butter speed.
                </div>
              </div>
            </button>
          )}

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

import { useState, useEffect, useRef, useCallback } from 'react';

interface RecipeGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

interface Ingredient {
  id: number;
  emoji: string;
  name: string;
  good: boolean;
  x: number;      // percent
  y: number;      // percent
  spawnedAt: number; // timestamp
  tapped?: boolean;
  result?: 'correct' | 'wrong';
}

const GOOD_ITEMS = [
  { emoji: '🥛', name: 'Milk' },
  { emoji: '🧈', name: 'Butter' },
  { emoji: '🥚', name: 'Egg' },
  { emoji: '🌾', name: 'Flour' },
  { emoji: '🍯', name: 'Honey' },
  { emoji: '🧂', name: 'Salt' },
  { emoji: '🫐', name: 'Blueberries' },
  { emoji: '🍌', name: 'Banana' },
  { emoji: '🍫', name: 'Chocolate' },
  { emoji: '🍁', name: 'Maple Syrup' },
];

const BAD_ITEMS = [
  { emoji: '🐟', name: 'Fish' },
  { emoji: '🌶️', name: 'Chili' },
  { emoji: '🧅', name: 'Onion' },
  { emoji: '🥦', name: 'Broccoli' },
  { emoji: '🍕', name: 'Pizza' },
  { emoji: '🌮', name: 'Taco' },
  { emoji: '🦐', name: 'Shrimp' },
  { emoji: '🧄', name: 'Garlic' },
  { emoji: '🥩', name: 'Steak' },
  { emoji: '🍣', name: 'Sushi' },
  { emoji: '🥒', name: 'Pickle' },
  { emoji: '🫒', name: 'Olive' },
];

const GAME_DURATION = 30; // seconds

export function RecipeGame({ onBack, onScore }: RecipeGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'over'>('ready');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-recipe-high');
    return saved ? parseInt(saved) : 0;
  });
  const [flashResult, setFlashResult] = useState<{ text: string; color: string; x: number; y: number } | null>(null);

  const nextIdRef = useRef(0);
  const ingredientsRef = useRef<Ingredient[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);

  const startGame = useCallback(() => {
    setIngredients([]);
    ingredientsRef.current = [];
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    comboRef.current = 0;
    setMisses(0);
    setCorrect(0);
    nextIdRef.current = 0;
    setFlashResult(null);
    setGameState('playing');
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('over');
          if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
            localStorage.setItem('pancake-recipe-high', String(scoreRef.current));
            onScore?.('recipe', scoreRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameState, highScore]);

  // Spawn ingredients
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawn = () => {
      // 70% good — good ones get tapped fast so they leave the screen,
      // bad ones linger since you avoid them, so this feels balanced
      const safeHack = localStorage.getItem('pancake-hack-recipe-safe') === 'true';
      const isGood = safeHack || Math.random() < 0.7;
      const pool = isGood ? GOOD_ITEMS : BAD_ITEMS;
      const item = pool[Math.floor(Math.random() * pool.length)];

      // Pick a position that doesn't overlap existing ingredients
      const existing = ingredientsRef.current.filter(i => !i.tapped);
      let x: number, y: number;
      let attempts = 0;
      do {
        x = 5 + Math.random() * 75;
        y = 5 + Math.random() * 70;
        attempts++;
      } while (
        attempts < 20 &&
        existing.some(e => Math.abs(e.x - x) < 14 && Math.abs(e.y - y) < 14)
      );

      const ing: Ingredient = {
        id: nextIdRef.current++,
        emoji: item.emoji,
        name: item.name,
        good: isGood,
        x,
        y,
        spawnedAt: Date.now(),
      };

      ingredientsRef.current = [...ingredientsRef.current.filter(i => !i.tapped).slice(-11), ing];
      setIngredients([...ingredientsRef.current]);
    };

    // Spawn faster as time goes on
    let spawnRate = 1200;
    const id = setInterval(() => {
      spawn();
    }, spawnRate);

    // Speed up spawning over time
    const speedId = setInterval(() => {
      spawnRate = Math.max(400, spawnRate - 50);
    }, 3000);

    spawn(); // first one immediately
    return () => { clearInterval(id); clearInterval(speedId); };
  }, [gameState]);

  // Auto-remove expired ingredients
  // Lifetime starts at 8s and shrinks to 2s as the game progresses
  useEffect(() => {
    if (gameState !== 'playing') return;
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = GAME_DURATION - timeLeft; // seconds into the game
      // Lerp from 8000ms down to 2000ms over the 30-second game
      const lifetimeMs = Math.max(2000, 8000 - (elapsed / GAME_DURATION) * 6000);

      const before = ingredientsRef.current.filter(i => !i.tapped);
      const alive: Ingredient[] = [];
      let missedGood = 0;
      for (const ing of before) {
        if (now - ing.spawnedAt > lifetimeMs) {
          if (ing.good) missedGood++;
        } else {
          alive.push(ing);
        }
      }
      if (missedGood > 0) {
        setMisses(prev => prev + missedGood);
      }
      ingredientsRef.current = alive;
      setIngredients([...alive]);
    }, 400);
    return () => clearInterval(id);
  }, [gameState, timeLeft]);

  const handleTap = useCallback((ing: Ingredient) => {
    if (gameState !== 'playing' || ing.tapped) return;

    // Mark as tapped
    ingredientsRef.current = ingredientsRef.current.map(i =>
      i.id === ing.id ? { ...i, tapped: true, result: ing.good ? 'correct' : 'wrong' } : i
    );
    setIngredients([...ingredientsRef.current]);

    if (ing.good) {
      comboRef.current += 1;
      const pts = 10 + comboRef.current * 3;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setCombo(comboRef.current);
      setCorrect(prev => prev + 1);
      setFlashResult({ text: `+${pts}`, color: 'text-green-500', x: ing.x, y: ing.y });
    } else {
      const penalty = 15 + comboRef.current * 2;
      scoreRef.current = Math.max(0, scoreRef.current - penalty);
      comboRef.current = 0;
      setScore(scoreRef.current);
      setCombo(0);
      setMisses(prev => prev + 1);
      setFlashResult({ text: `-${penalty}`, color: 'text-red-500', x: ing.x, y: ing.y });
    }

    setTimeout(() => setFlashResult(null), 500);
  }, [gameState]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (gameState === 'ready' || gameState === 'over')) {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, startGame]);

  const timerPercent = (timeLeft / GAME_DURATION) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Recipe Rush</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Tap pancake ingredients! Avoid the impostors!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {/* Score + timer */}
        <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20">
          <div className="flex justify-between items-center text-sm mb-1">
            <div>
              <span className="text-pancake-medium">Score: </span>
              <span className="font-bold text-pancake-brown">{score}</span>
              {combo > 1 && <span className="text-green-500 font-bold ml-1">x{combo}</span>}
            </div>
            <div className={`font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-pancake-brown'}`}>
              {timeLeft}s
            </div>
          </div>
          {/* Timer bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                timeLeft <= 5 ? 'bg-red-400' : timeLeft <= 10 ? 'bg-orange-400' : 'bg-green-400'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </div>

        {/* Game area */}
        <div
          className="relative select-none"
          style={{ width: '100%', height: 360, background: 'linear-gradient(180deg, #FFF9E6 0%, #FFF0DB 100%)' }}
          onClick={() => {
            if (gameState === 'ready' || gameState === 'over') startGame();
          }}
        >
          {/* Ingredient guide */}
          {gameState === 'playing' && (
            <div className="absolute top-1 left-0 right-0 flex justify-center gap-4 text-xs text-pancake-medium/60 z-10 pointer-events-none">
              <span>Tap: 🥛🧈🥚🌾🍯🍁</span>
              <span>Avoid: 🐟🌶️🧅🍕</span>
            </div>
          )}

          {/* Flash result */}
          {flashResult && (
            <div
              className={`absolute z-30 font-bold text-xl pointer-events-none ${flashResult.color}`}
              style={{ left: `${flashResult.x}%`, top: `${flashResult.y - 5}%`, transform: 'translateX(-50%)' }}
            >
              {flashResult.text}
            </div>
          )}

          {/* Ingredients */}
          {gameState === 'playing' && ingredients.filter(i => !i.tapped).map(ing => (
            <button
              key={ing.id}
              onClick={(e) => { e.stopPropagation(); handleTap(ing); }}
              className="absolute cursor-pointer bg-transparent border-0 p-0 hover:scale-125 active:scale-90 transition-transform duration-100"
              style={{
                left: `${ing.x}%`,
                top: `${ing.y}%`,
                fontSize: 36,
              }}
            >
              {ing.emoji}
            </button>
          ))}

          {/* Tapped ingredients — flash animation */}
          {gameState === 'playing' && ingredients.filter(i => i.tapped).map(ing => (
            <div
              key={ing.id}
              className="absolute pointer-events-none"
              style={{
                left: `${ing.x}%`,
                top: `${ing.y}%`,
                fontSize: 36,
                opacity: 0,
                transform: 'scale(1.5)',
                transition: 'all 0.3s',
              }}
            >
              {ing.result === 'correct' ? '✅' : '❌'}
            </div>
          ))}

          {/* Start overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
              <div className="text-5xl mb-3">🥣</div>
              <div className="text-xl font-bold text-pancake-brown mb-2">Recipe Rush</div>
              <p className="text-sm text-pancake-medium mb-1 px-8 text-center">
                Tap the pancake ingredients before they disappear!
              </p>
              <p className="text-xs text-pancake-medium mb-4 px-8 text-center">
                Tap good ingredients for points. Tapping bad ones costs you!
              </p>
              <div className="flex gap-3 mb-4">
                <div className="text-center">
                  <div className="text-2xl">🥛🧈🥚</div>
                  <div className="text-xs text-green-500 font-bold">Tap these!</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl">🐟🌶️🧅</div>
                  <div className="text-xs text-red-400 font-bold">Avoid!</div>
                </div>
              </div>
              <div className="px-6 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm">
                Tap to Start
              </div>
              {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}</p>}
            </div>
          )}

          {gameState === 'over' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
              <div className="text-4xl mb-2">{score >= highScore && score > 0 ? '🏆' : '⏰'}</div>
              <div className="text-xl font-bold text-pancake-brown mb-1">
                {score >= highScore && score > 0 ? 'New High Score!' : 'Time\'s Up!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold mb-2">{score}</div>
              <div className="flex gap-6 text-sm text-pancake-medium mb-4">
                <div className="text-center">
                  <div className="font-bold text-green-500">{correct}</div>
                  <div className="text-xs">Caught</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-red-400">{misses}</div>
                  <div className="text-xs">Missed</div>
                </div>
              </div>
              <div className="px-6 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm">
                Tap to Try Again
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

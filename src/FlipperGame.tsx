import { useState, useEffect, useRef, useCallback } from 'react';

interface FlipperGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

const PERFECT_ZONE = 0.08; // 8% window for "perfect"
const GREAT_ZONE = 0.16;
const GOOD_ZONE = 0.28;

export function FlipperGame({ onBack, onScore }: FlipperGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'cooking' | 'result' | 'over'>('ready');
  const [progress, setProgress] = useState(0); // 0 to 1
  const [speed, setSpeed] = useState(0.008);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [lastRating, setLastRating] = useState<string | null>(null);
  const [lives, setLives] = useState(3);
  const [sweetSpot, setSweetSpot] = useState(0.5);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-flipper-high');
    return saved ? parseInt(saved) : 0;
  });

  const animRef = useRef<number>(0);
  const progressRef = useRef(0);

  const startRound = useCallback(() => {
    progressRef.current = 0;
    setProgress(0);
    // Sweet spot drifts randomly each round: 0.35 to 0.65
    setSweetSpot(0.35 + Math.random() * 0.3);
    setGameState('cooking');
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setRound(0);
    setLives(3);
    setSpeed(0.004);
    setLastRating(null);
    startRound();
  }, [startRound]);

  // Cooking animation
  useEffect(() => {
    if (gameState !== 'cooking') return;

    const animate = () => {
      progressRef.current += speed;
      if (progressRef.current >= 1) {
        // Burnt! Ran out of time
        progressRef.current = 1;
        setProgress(1);
        setLastRating('BURNT!');
        setLives(prev => prev - 1);
        setStreak(0);
        setGameState('result');
        return;
      }
      setProgress(progressRef.current);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, speed]);

  // Check game over after lives change
  useEffect(() => {
    if (lives <= 0 && gameState === 'result') {
      const timer = setTimeout(() => {
        setGameState('over');
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('pancake-flipper-high', String(score));
          onScore?.('flipper', score);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lives, gameState, score, highScore]);

  // Auto-advance from result to next round
  useEffect(() => {
    if (gameState === 'result' && lives > 0) {
      const timer = setTimeout(() => {
        setRound(prev => prev + 1);
        setSpeed(prev => prev + 0.0012);
        startRound();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [gameState, lives, startRound]);

  const handleFlip = useCallback(() => {
    if (gameState !== 'cooking') return;
    cancelAnimationFrame(animRef.current);

    const p = progressRef.current;
    const dist = Math.abs(p - sweetSpot);
    const zoneMult = localStorage.getItem('pancake-hack-flipper-zone') === 'true' ? 3 : 1;

    let rating: string;
    let points: number;

    if (p < 0.15) {
      rating = 'RAW!';
      points = 0;
      setLives(prev => prev - 1);
      setStreak(0);
    } else if (dist <= PERFECT_ZONE * zoneMult) {
      rating = 'PERFECT!';
      points = 100 + streak * 20;
      setStreak(prev => {
        const next = prev + 1;
        setBestStreak(bs => Math.max(bs, next));
        return next;
      });
    } else if (dist <= GREAT_ZONE * zoneMult) {
      rating = 'Great!';
      points = 60 + streak * 10;
      setStreak(prev => {
        const next = prev + 1;
        setBestStreak(bs => Math.max(bs, next));
        return next;
      });
    } else if (dist <= GOOD_ZONE * zoneMult) {
      rating = 'Good';
      points = 30;
      setStreak(0);
    } else if (p > sweetSpot + GOOD_ZONE * zoneMult) {
      rating = 'Overcooked!';
      points = 0;
      setLives(prev => prev - 1);
      setStreak(0);
    } else {
      rating = 'Undercooked';
      points = 10;
      setStreak(0);
    }

    setLastRating(rating);
    setScore(prev => prev + points);
    setGameState('result');
  }, [gameState, sweetSpot, streak]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (gameState === 'cooking') handleFlip();
        else if (gameState === 'ready' || gameState === 'over') startGame();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleFlip, startGame]);

  // Color of the pancake based on progress
  const getPancakeColor = () => {
    if (progress < 0.15) return '#F5E6C8'; // raw/pale
    if (progress < 0.35) return '#F5D78E'; // light
    const dist = Math.abs(progress - sweetSpot);
    if (dist <= GREAT_ZONE) return '#D4A030'; // golden perfect
    if (progress > 0.8) return '#6B3A1F'; // burnt
    if (progress > 0.65) return '#8B5E2B'; // overcooked
    return '#C89532'; // ok
  };

  // Zone boundaries for the heat bar
  const zoneLeft = Math.max(0, (sweetSpot - GOOD_ZONE) * 100);
  const zoneRight = Math.min(100, (sweetSpot + GOOD_ZONE) * 100);
  const perfectLeft = Math.max(0, (sweetSpot - PERFECT_ZONE) * 100);
  const perfectRight = Math.min(100, (sweetSpot + PERFECT_ZONE) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Pancake Flipper</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Flip at the perfect moment!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {/* Score bar */}
        <div className="flex justify-between items-center px-4 py-2 bg-pancake-warm border-b border-shop-border/20 text-sm">
          <div>
            <span className="text-pancake-medium">Score: </span>
            <span className="font-bold text-pancake-brown">{score}</span>
          </div>
          <div>
            <span className="text-pancake-medium">Streak: </span>
            <span className="font-bold text-pancake-gold">{streak > 0 ? `${streak}x` : '-'}</span>
          </div>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <span key={i} className={`text-lg ${i < lives ? '' : 'opacity-20'}`}>❤️</span>
            ))}
          </div>
        </div>

        {/* Game area */}
        <div
          className="relative flex flex-col items-center py-6 px-4 gap-4 cursor-pointer select-none"
          style={{ minHeight: 320 }}
          onClick={() => {
            if (gameState === 'cooking') handleFlip();
            else if (gameState === 'ready' || gameState === 'over') startGame();
          }}
        >
          {/* The Pancake */}
          <div className="relative">
            <div
              className="rounded-[50%] transition-colors duration-200"
              style={{
                width: 160,
                height: 130,
                background: `radial-gradient(ellipse at 40% 35%, ${getPancakeColor()} 0%, ${getPancakeColor()}dd 70%, ${getPancakeColor()}99 100%)`,
                boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.15), 0 6px 16px rgba(139,105,20,0.3)',
                transform: gameState === 'result' && lastRating === 'PERFECT!' ? 'scaleY(-1)' : undefined,
                transition: 'transform 0.3s',
              }}
            >
              {/* Surface dots */}
              <div className="absolute inset-0 rounded-[50%] overflow-hidden opacity-15" style={{
                backgroundImage: 'radial-gradient(circle 2px, #8B6914 20%, transparent 20%)',
                backgroundSize: '14px 12px',
              }} />
            </div>

            {/* Rating popup */}
            {gameState === 'result' && lastRating && (
              <div className={`absolute -top-8 left-1/2 -translate-x-1/2 font-bold text-lg whitespace-nowrap animate-bounce ${
                lastRating === 'PERFECT!' ? 'text-green-500' :
                lastRating === 'Great!' ? 'text-green-400' :
                lastRating === 'Good' ? 'text-pancake-gold' :
                lastRating.includes('BURNT') || lastRating.includes('RAW') || lastRating.includes('Over') ? 'text-red-400' :
                'text-orange-400'
              }`}>
                {lastRating}
                {streak > 1 && (lastRating === 'PERFECT!' || lastRating === 'Great!') && (
                  <span className="text-sm ml-1">x{streak}</span>
                )}
              </div>
            )}
          </div>

          {/* Griddle */}
          <div className="w-48 h-3 rounded-full bg-gradient-to-b from-gray-400 to-gray-500 shadow-inner" />

          {/* Heat bar */}
          <div className="w-full max-w-xs relative">
            <div className="text-xs text-pancake-medium text-center mb-1">
              {gameState === 'cooking' ? 'Tap to flip!' : gameState === 'ready' ? 'Tap to start' : ''}
            </div>
            <div className="w-full h-6 rounded-full bg-gray-200 relative overflow-hidden border border-gray-300">
              {/* Danger zone (burnt) - right side */}
              <div className="absolute right-0 top-0 bottom-0 bg-red-200/60" style={{ width: `${100 - zoneRight}%` }} />
              {/* Raw zone - left side */}
              <div className="absolute left-0 top-0 bottom-0 bg-blue-200/60" style={{ width: '15%' }} />
              {/* Good zone */}
              <div className="absolute top-0 bottom-0 bg-yellow-200/60" style={{ left: `${zoneLeft}%`, width: `${zoneRight - zoneLeft}%` }} />
              {/* Perfect zone */}
              <div className="absolute top-0 bottom-0 bg-green-300/70 rounded" style={{ left: `${perfectLeft}%`, width: `${perfectRight - perfectLeft}%` }} />
              {/* Progress indicator */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-pancake-brown rounded-full z-10 transition-none"
                style={{ left: `${progress * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-pancake-medium/60 mt-0.5 px-1">
              <span>Raw</span>
              <span>Golden</span>
              <span>Burnt</span>
            </div>
          </div>

          {/* High score */}
          <div className="text-xs text-pancake-medium">
            Best: <span className="font-bold text-pancake-gold">{highScore}</span>
            {bestStreak > 0 && <span className="ml-3">Best streak: <span className="font-bold">{bestStreak}</span></span>}
          </div>

          {/* Start / Game Over overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
              <div className="text-5xl mb-3">🍳</div>
              <div className="text-xl font-bold text-pancake-brown mb-2">Pancake Flipper</div>
              <p className="text-sm text-pancake-medium mb-1">Watch the heat bar and flip at the golden zone!</p>
              <p className="text-xs text-pancake-medium mb-4">The sweet spot moves each round and cooking gets faster.</p>
              <div className="px-6 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm">
                Tap to Start
              </div>
            </div>
          )}

          {gameState === 'over' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
              <div className="text-4xl mb-2">{score >= highScore && score > 0 ? '🏆' : '🍳'}</div>
              <div className="text-xl font-bold text-pancake-brown mb-1">
                {score >= highScore && score > 0 ? 'New High Score!' : 'Kitchen Closed!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold mb-1">{score}</div>
              <p className="text-sm text-pancake-medium mb-1">{round} pancakes flipped</p>
              {bestStreak > 1 && <p className="text-xs text-pancake-medium mb-3">Best streak: {bestStreak}x</p>}
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

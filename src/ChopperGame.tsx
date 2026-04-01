import { useState, useEffect, useRef, useCallback } from 'react';

interface ChopperGameProps {
  onBack: () => void;
}

interface Knife {
  id: number;
  angle: number; // degrees — where the knife lands on the pancake
  landed: boolean;
}

const GAME_DURATION = 5; // seconds to chop
const PANCAKE_RADIUS = 100; // px
const KNIFE_LENGTH = 50;

export function ChopperGame({ onBack }: ChopperGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'result'>('ready');
  const [knives, setKnives] = useState<Knife[]>([]);
  const [flyingKnife, setFlyingKnife] = useState<{ id: number; angle: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [pieces, setPieces] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-chopper-high');
    return saved ? parseInt(saved) : 0;
  });

  const nextIdRef = useRef(0);
  const knivesRef = useRef<Knife[]>([]);
  const lastAngleRef = useRef(0);

  const startGame = useCallback(() => {
    setKnives([]);
    knivesRef.current = [];
    setFlyingKnife(null);
    setTimeLeft(GAME_DURATION);
    setPieces(0);
    nextIdRef.current = 0;
    lastAngleRef.current = 0;
    setGameState('playing');
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          const total = knivesRef.current.length;
          const p = total > 0 ? total : 0; // pieces = number of cuts (each cut adds a piece)
          setPieces(p);
          if (p > highScore) {
            setHighScore(p);
            localStorage.setItem('pancake-chopper-high', String(p));
          }
          setGameState('result');
          return 0;
        }
        return Math.round((prev - 0.1) * 10) / 10;
      });
    }, 100);
    return () => clearInterval(id);
  }, [gameState, highScore]);

  const chop = useCallback(() => {
    if (gameState !== 'playing') return;

    // Each knife gets a unique angle spread evenly + some randomness
    const baseStep = 360 / Math.max(1, knivesRef.current.length + 8);
    const angle = (lastAngleRef.current + baseStep + (Math.random() - 0.5) * baseStep * 0.5) % 360;
    lastAngleRef.current = angle;

    const id = nextIdRef.current++;

    // Show flying knife animation
    setFlyingKnife({ id, angle });

    // After brief flight, land it
    setTimeout(() => {
      const knife: Knife = { id, angle, landed: true };
      knivesRef.current = [...knivesRef.current, knife];
      setKnives([...knivesRef.current]);
      setFlyingKnife(null);
    }, 80);
  }, [gameState]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (gameState === 'playing') chop();
        else if (gameState === 'ready' || gameState === 'result') startGame();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, chop, startGame]);

  const timerPercent = (timeLeft / GAME_DURATION) * 100;

  // Generate slice lines from knives for visual effect
  const sliceLines = knives.map(k => {
    const rad = (k.angle * Math.PI) / 180;
    return {
      id: k.id,
      x1: PANCAKE_RADIUS + Math.cos(rad) * 8,
      y1: PANCAKE_RADIUS + Math.sin(rad) * 8,
      x2: PANCAKE_RADIUS + Math.cos(rad) * (PANCAKE_RADIUS - 4),
      y2: PANCAKE_RADIUS + Math.sin(rad) * (PANCAKE_RADIUS - 4),
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Pancake Chopper</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Tap as fast as you can to chop!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {/* Score + timer */}
        {gameState === 'playing' && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20">
            <div className="flex justify-between items-center text-sm mb-1">
              <div>
                <span className="text-pancake-medium">Cuts: </span>
                <span className="font-bold text-pancake-brown text-lg">{knives.length}</span>
              </div>
              <div className={`font-bold text-lg ${timeLeft <= 1.5 ? 'text-red-500 animate-pulse' : 'text-pancake-brown'}`}>
                {timeLeft.toFixed(1)}s
              </div>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  timeLeft <= 1.5 ? 'bg-red-400' : timeLeft <= 3 ? 'bg-orange-400' : 'bg-green-400'
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Game area */}
        <div
          className="relative flex items-center justify-center select-none"
          style={{ height: 340, background: 'linear-gradient(180deg, #FFF9E6 0%, #FFF0DB 100%)' }}
          onClick={() => {
            if (gameState === 'playing') chop();
            else if (gameState === 'ready' || gameState === 'result') startGame();
          }}
        >
          {/* Pancake with cut lines */}
          <div className="relative" style={{ width: PANCAKE_RADIUS * 2, height: PANCAKE_RADIUS * 2 }}>
            {/* The pancake */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(ellipse at 40% 35%, #F5C864 0%, #D4A030 50%, #B8860B 100%)',
                boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.15), 0 8px 24px rgba(139,105,20,0.3)',
              }}
            >
              {/* Surface dots */}
              <div className="absolute inset-0 rounded-full overflow-hidden opacity-20" style={{
                backgroundImage: 'radial-gradient(circle 2px, #8B6914 20%, transparent 20%)',
                backgroundSize: '14px 12px',
              }} />
            </div>

            {/* Slice lines SVG overlay */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={PANCAKE_RADIUS * 2}
              height={PANCAKE_RADIUS * 2}
              viewBox={`0 0 ${PANCAKE_RADIUS * 2} ${PANCAKE_RADIUS * 2}`}
            >
              {sliceLines.map(s => (
                <line
                  key={s.id}
                  x1={s.x1} y1={s.y1}
                  x2={s.x2} y2={s.y2}
                  stroke="#5C3A10"
                  strokeWidth="1.5"
                  opacity="0.6"
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* Knives sticking out of the pancake */}
            {knives.map(k => {
              const rad = (k.angle * Math.PI) / 180;
              const kx = PANCAKE_RADIUS + Math.cos(rad) * (PANCAKE_RADIUS + KNIFE_LENGTH * 0.3);
              const ky = PANCAKE_RADIUS + Math.sin(rad) * (PANCAKE_RADIUS + KNIFE_LENGTH * 0.3);
              return (
                <div
                  key={k.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: kx,
                    top: ky,
                    transform: `translate(-50%, -50%) rotate(${k.angle + 90}deg)`,
                    fontSize: 20,
                  }}
                >
                  🔪
                </div>
              );
            })}

            {/* Flying knife animation */}
            {flyingKnife && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: PANCAKE_RADIUS,
                  top: -40,
                  transform: `translateX(-50%) rotate(180deg)`,
                  fontSize: 28,
                  animation: 'knife-fly 0.08s ease-in forwards',
                }}
              >
                🔪
              </div>
            )}

            {/* Piece count in center during play */}
            {gameState === 'playing' && knives.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-3xl font-bold text-white/80 drop-shadow-lg">
                  {knives.length}
                </div>
              </div>
            )}
          </div>

          {/* Start overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
              <div className="text-5xl mb-3">🔪</div>
              <div className="text-xl font-bold text-pancake-brown mb-2">Pancake Chopper</div>
              <p className="text-sm text-pancake-medium mb-1 px-8 text-center">
                Tap as fast as you can to chop the pancake!
              </p>
              <p className="text-xs text-pancake-medium mb-4 px-8 text-center">
                You have {GAME_DURATION} seconds. Each tap = one cut!
              </p>
              <div className="px-6 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer">
                Tap to Start
              </div>
              {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore} cuts</p>}
            </div>
          )}

          {/* Result overlay */}
          {gameState === 'result' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
              <div className="text-4xl mb-2">{pieces >= highScore && pieces > 0 ? '🏆' : '🔪'}</div>
              <div className="text-xl font-bold text-pancake-brown mb-1">
                {pieces >= highScore && pieces > 0 ? 'New Record!' : 'Time\'s Up!'}
              </div>
              <div className="text-4xl font-bold text-pancake-gold mb-1">{pieces}</div>
              <p className="text-sm text-pancake-medium mb-1">
                {pieces === 0 ? 'cuts' : `cut${pieces === 1 ? '' : 's'} = ${pieces + 1} pieces!`}
              </p>
              <p className="text-xs text-pancake-medium mb-4">
                {getSpeedRating(pieces)}
              </p>
              <div className="px-6 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer">
                Tap to Try Again
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes knife-fly {
            0% { top: -40px; opacity: 1; }
            100% { top: ${PANCAKE_RADIUS - 10}px; opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  );
}

function getSpeedRating(cuts: number): string {
  if (cuts >= 60) return 'Absolute machine! Legendary speed!';
  if (cuts >= 45) return 'Insane chopping skills!';
  if (cuts >= 35) return 'Professional chef material!';
  if (cuts >= 25) return 'Quick hands!';
  if (cuts >= 15) return 'Not bad, keep practicing!';
  if (cuts >= 5) return 'Warming up those fingers...';
  return 'Did you fall asleep?';
}

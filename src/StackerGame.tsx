import { useState, useEffect, useRef, useCallback } from 'react';

interface StackerGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

interface StackedPancake {
  x: number;      // left offset relative to stack center
  width: number;   // width of this pancake
}

const GAME_WIDTH = 300;
const PANCAKE_HEIGHT = 18;
const BASE_WIDTH = 120;
const BASE_SPEED = 2;
const SPEED_INCREMENT = 0.15;
const MAX_VISIBLE = 14;
const TOLERANCE = 2; // pixels of overhang allowed before trimming

export function StackerGame({ onBack, onScore }: StackerGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'over'>('ready');
  const [stack, setStack] = useState<StackedPancake[]>([]);
  const [movingX, setMovingX] = useState(0);
  const [movingWidth, setMovingWidth] = useState(BASE_WIDTH);
  const [_direction, setDirection] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-stacker-high');
    return saved ? parseInt(saved) : 0;
  });
  const [lastResult, setLastResult] = useState<'perfect' | 'good' | 'miss' | null>(null);

  const animRef = useRef<number>(0);
  const speedRef = useRef(BASE_SPEED);
  const dirRef = useRef(1);
  const xRef = useRef(0);
  const widthRef = useRef(BASE_WIDTH);
  const stackRef = useRef<StackedPancake[]>([]);

  const startGame = useCallback(() => {
    const initial: StackedPancake = { x: GAME_WIDTH / 2 - BASE_WIDTH / 2, width: BASE_WIDTH };
    setStack([initial]);
    stackRef.current = [initial];
    setMovingX(0);
    xRef.current = 0;
    setMovingWidth(BASE_WIDTH);
    widthRef.current = BASE_WIDTH;
    setDirection(1);
    dirRef.current = 1;
    speedRef.current = BASE_SPEED;
    setScore(0);
    setLastResult(null);
    setGameState('playing');
  }, []);

  // Animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const slowHack = localStorage.getItem('pancake-hack-stacker-slow') === 'true';
    const animate = () => {
      const speedMult = slowHack ? 0.33 : 1;
      xRef.current += speedRef.current * dirRef.current * speedMult;
      if (xRef.current > GAME_WIDTH - widthRef.current) {
        xRef.current = GAME_WIDTH - widthRef.current;
        dirRef.current = -1;
      } else if (xRef.current < 0) {
        xRef.current = 0;
        dirRef.current = 1;
      }
      setMovingX(xRef.current);
      setDirection(dirRef.current);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState]);

  const dropPancake = useCallback(() => {
    if (gameState !== 'playing') return;

    const currentStack = stackRef.current;
    const top = currentStack[currentStack.length - 1];
    const dropX = xRef.current;
    const dropW = widthRef.current;

    // Calculate overlap with top of stack
    const topLeft = top.x;
    const topRight = top.x + top.width;
    const dropLeft = dropX;
    const dropRight = dropX + dropW;

    const overlapLeft = Math.max(topLeft, dropLeft);
    const overlapRight = Math.min(topRight, dropRight);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      // Complete miss — game over
      setLastResult('miss');
      setGameState('over');
      const finalScore = currentStack.length - 1;
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('pancake-stacker-high', String(finalScore));
        onScore?.('stacker', finalScore);
      }
      return;
    }

    // Check if it's a "perfect" drop (within tolerance)
    const isPerfect = Math.abs(dropX - top.x) <= TOLERANCE;

    const newPancake: StackedPancake = isPerfect
      ? { x: top.x, width: top.width }
      : { x: overlapLeft, width: overlapWidth };

    const newStack = [...currentStack, newPancake];
    setStack(newStack);
    stackRef.current = newStack;

    const newScore = newStack.length - 1;
    setScore(newScore);
    setLastResult(isPerfect ? 'perfect' : 'good');

    // Set up next moving pancake
    widthRef.current = newPancake.width;
    setMovingWidth(newPancake.width);
    xRef.current = 0;
    dirRef.current = 1;
    speedRef.current = BASE_SPEED + newScore * SPEED_INCREMENT;

    // Check if pancake too narrow to continue
    if (newPancake.width < 8) {
      setGameState('over');
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('pancake-stacker-high', String(newScore));
        onScore?.('stacker', newScore);
      }
    }
  }, [gameState, highScore]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (gameState === 'playing') dropPancake();
        else if (gameState === 'ready' || gameState === 'over') startGame();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, dropPancake, startGame]);

  const visibleStack = stack.slice(-MAX_VISIBLE);
  // Visual offset for tall stacks (available if needed for scroll)
  // const stackOffset = stack.length > MAX_VISIBLE ? (stack.length - MAX_VISIBLE) * PANCAKE_HEIGHT : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Pancake Stacker</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Tap to stack! Don't let them fall!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">
            ✕
          </button>
        </div>

        {/* Score bar */}
        <div className="flex justify-between px-4 py-2 bg-pancake-warm border-b border-shop-border/20">
          <div className="text-sm">
            <span className="text-pancake-medium">Score: </span>
            <span className="font-bold text-pancake-brown">{score}</span>
          </div>
          <div className="text-sm">
            <span className="text-pancake-medium">Best: </span>
            <span className="font-bold text-pancake-gold">{highScore}</span>
          </div>
        </div>

        {/* Game area */}
        <div
          className="relative mx-auto cursor-pointer select-none w-full"
          style={{ maxWidth: GAME_WIDTH, height: 320 }}
          onClick={() => {
            if (gameState === 'playing') dropPancake();
            else if (gameState === 'ready' || gameState === 'over') startGame();
          }}
        >
          {/* Result flash */}
          {lastResult === 'perfect' && gameState === 'playing' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-green-500 font-bold text-sm animate-bounce">
              PERFECT!
            </div>
          )}

          {/* Moving pancake (only during play) */}
          {gameState === 'playing' && (
            <div
              className="absolute z-10 rounded-lg"
              style={{
                left: movingX,
                top: 320 - (visibleStack.length + 1) * PANCAKE_HEIGHT - 4,
                width: movingWidth,
                height: PANCAKE_HEIGHT - 2,
                background: 'linear-gradient(180deg, #F5C864 0%, #D4A030 100%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                border: '1px solid #C89532',
              }}
            />
          )}

          {/* Stack */}
          {visibleStack.map((p, i) => (
            <div
              key={i + stack.length - visibleStack.length}
              className="absolute rounded-lg"
              style={{
                left: p.x,
                bottom: i * PANCAKE_HEIGHT,
                width: p.width,
                height: PANCAKE_HEIGHT - 2,
                background: `linear-gradient(180deg, ${i === visibleStack.length - 1 ? '#F5C864' : '#E8B84D'} 0%, ${i === visibleStack.length - 1 ? '#D4A030' : '#C89532'} 100%)`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                border: '1px solid #B8860B',
              }}
            />
          ))}

          {/* Plate at the bottom */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: GAME_WIDTH - 40,
              height: 8,
              background: 'linear-gradient(180deg, #ddd 0%, #bbb 100%)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          />

          {/* Start / Game Over overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80 rounded-b-2xl">
              <div className="text-5xl mb-3">🥞</div>
              <div className="text-xl font-bold text-pancake-brown mb-2">Pancake Stacker</div>
              <p className="text-sm text-pancake-medium mb-4">Tap or press Space to stack pancakes!</p>
              <div className="px-6 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105 text-sm">
                Tap to Start
              </div>
            </div>
          )}

          {gameState === 'over' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80 rounded-b-2xl">
              <div className="text-4xl mb-2">
                {score > highScore - 1 && score > 0 ? '🏆' : '💥'}
              </div>
              <div className="text-xl font-bold text-pancake-brown mb-1">
                {score >= highScore && score > 0 ? 'New High Score!' : 'Stack Toppled!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold mb-1">{score}</div>
              <p className="text-sm text-pancake-medium mb-4">pancakes stacked</p>
              <div className="px-6 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105 text-sm">
                Tap to Try Again
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

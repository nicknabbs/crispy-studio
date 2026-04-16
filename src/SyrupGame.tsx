import { useState, useRef, useCallback, useEffect } from 'react';

interface SyrupGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

interface Point { x: number; y: number; }
interface TargetDot extends Point { hit: boolean; }

const CANVAS = 280;
const HIT_RADIUS = 22;

// Five target shapes — picked randomly each round
const SHAPES: { name: string; points: Point[] }[] = [
  {
    name: 'Spiral',
    points: Array.from({ length: 10 }, (_, i) => {
      const t = i / 9;
      const angle = t * Math.PI * 2.5;
      const r = 30 + t * 90;
      return { x: CANVAS / 2 + Math.cos(angle) * r, y: CANVAS / 2 + Math.sin(angle) * r };
    }),
  },
  {
    name: 'Zigzag',
    points: Array.from({ length: 10 }, (_, i) => ({
      x: 40 + (i / 9) * (CANVAS - 80),
      y: CANVAS / 2 + (i % 2 === 0 ? -40 : 40),
    })),
  },
  {
    name: 'Heart',
    points: Array.from({ length: 10 }, (_, i) => {
      const t = (i / 9) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return { x: CANVAS / 2 + x * 6, y: CANVAS / 2 + y * 6 };
    }),
  },
  {
    name: 'Wave',
    points: Array.from({ length: 10 }, (_, i) => {
      const t = i / 9;
      return { x: 40 + t * (CANVAS - 80), y: CANVAS / 2 + Math.sin(t * Math.PI * 3) * 50 };
    }),
  },
  {
    name: 'Circle',
    points: Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2;
      return { x: CANVAS / 2 + Math.cos(angle) * 90, y: CANVAS / 2 + Math.sin(angle) * 90 };
    }),
  },
];

export function SyrupGame({ onBack, onScore }: SyrupGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'result'>('ready');
  const [target, setTarget] = useState(SHAPES[0]);
  const [dots, setDots] = useState<TargetDot[]>([]);
  const [path, setPath] = useState<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-syrup-high');
    return saved ? parseInt(saved) : 0;
  });

  const areaRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<TargetDot[]>([]);
  const pathRef = useRef<Point[]>([]);

  const startGame = useCallback(() => {
    const pick = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    setTarget(pick);
    const newDots = pick.points.map(p => ({ ...p, hit: false }));
    dotsRef.current = newDots;
    setDots(newDots);
    pathRef.current = [];
    setPath([]);
    setScore(0);
    setGameState('playing');
  }, []);

  const finish = useCallback((finalDots: TargetDot[], pathLen: number) => {
    const hits = finalDots.filter(d => d.hit).length;
    const hitPct = (hits / finalDots.length) * 100;
    const targetLen = finalDots.length * 40;
    const strayPenalty = Math.max(0, pathLen - targetLen * 1.4) / targetLen * 30;
    const finalScore = Math.max(0, Math.round(hitPct - strayPenalty));
    setScore(finalScore);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('pancake-syrup-high', String(finalScore));
      onScore?.('syrup', finalScore);
    }
    setGameState('result');
  }, [highScore, onScore]);

  const getPos = (e: React.PointerEvent): Point | null => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const addPoint = (p: Point) => {
    pathRef.current = [...pathRef.current, p];
    setPath(pathRef.current);
    dotsRef.current = dotsRef.current.map(d => {
      if (d.hit) return d;
      const dx = d.x - p.x, dy = d.y - p.y;
      return dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS ? { ...d, hit: true } : d;
    });
    setDots(dotsRef.current);
  };

  const handleDown = (e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    const p = getPos(e);
    if (!p) return;
    setDrawing(true);
    pathRef.current = [p];
    setPath([p]);
    addPoint(p);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!drawing || gameState !== 'playing') return;
    const p = getPos(e);
    if (!p) return;
    addPoint(p);
  };

  const handleUp = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    setTimeout(() => {
      let len = 0;
      const pts = pathRef.current;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
      }
      finish(dotsRef.current, len);
    }, 200);
  }, [drawing, finish]);

  useEffect(() => {
    const stop = () => { if (drawing) handleUp(); };
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, [drawing, handleUp]);

  const pathStr = path.length > 0
    ? 'M ' + path.map(p => `${p.x},${p.y}`).join(' L ')
    : '';
  const targetStr = 'M ' + target.points.map(p => `${p.x},${p.y}`).join(' L ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Syrup Drizzle</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Trace the shape with syrup!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {gameState === 'playing' && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
            <div>
              <span className="text-pancake-medium">Shape: </span>
              <span className="font-bold text-pancake-brown">{target.name}</span>
            </div>
            <div className="text-pancake-medium">
              Hit: <span className="font-bold text-pancake-brown">{dots.filter(d => d.hit).length}/{dots.length}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #FFF9E6 0%, #FFF0DB 100%)' }}>
          <div
            ref={areaRef}
            className="relative rounded-full"
            style={{
              width: CANVAS, height: CANVAS,
              background: 'radial-gradient(ellipse at 40% 35%, #F5C864 0%, #D4A030 50%, #B8860B 100%)',
              boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.15), 0 8px 24px rgba(139,105,20,0.3)',
              touchAction: 'none',
              cursor: gameState === 'playing' ? 'crosshair' : 'default',
            }}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
          >
            <svg width={CANVAS} height={CANVAS} className="absolute inset-0 pointer-events-none">
              {gameState === 'playing' && (() => {
                const bright = localStorage.getItem('pancake-hack-syrup-show') === 'true';
                return (
                  <path
                    d={targetStr}
                    stroke={bright ? '#FF3399' : '#5C3A10'}
                    strokeWidth={bright ? 6 : 2}
                    strokeDasharray={bright ? undefined : '6 4'}
                    fill="none"
                    opacity={bright ? 0.9 : 0.35}
                  />
                );
              })()}
              {dots.map((d, i) => (
                <circle
                  key={i}
                  cx={d.x} cy={d.y} r={8}
                  fill={d.hit ? '#8B4513' : 'rgba(92,58,16,0.25)'}
                  stroke={d.hit ? '#5C3A10' : 'transparent'}
                  strokeWidth="1.5"
                />
              ))}
              {path.length > 1 && (
                <path d={pathStr} stroke="#5C3A10" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85" />
              )}
            </svg>

            {gameState === 'ready' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-pancake-cream/85">
                <div className="text-5xl mb-2">🍯</div>
                <div className="text-lg font-bold text-pancake-brown">Syrup Drizzle</div>
                <p className="text-xs text-pancake-medium text-center px-6 mt-1 mb-3">
                  Drag to trace the target shape and hit all the dots!
                </p>
                <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                  Tap to Start
                </button>
                {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}%</p>}
              </div>
            )}

            {gameState === 'result' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-pancake-cream/85">
                <div className="text-4xl mb-1">{score >= highScore && score > 0 ? '🏆' : '🍯'}</div>
                <div className="text-base font-bold text-pancake-brown">{score >= highScore && score > 0 ? 'New Record!' : 'Nice drizzle!'}</div>
                <div className="text-3xl font-bold text-pancake-gold my-1">{score}%</div>
                <p className="text-xs text-pancake-medium mb-3">
                  {dots.filter(d => d.hit).length}/{dots.length} dots hit
                </p>
                <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

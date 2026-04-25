import { useState, useEffect, useRef, useCallback } from 'react';

interface PopReactionGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

const ROUNDS = 3;
// Pancake size per round (px). R1=100%, R2=80%, R3=65% per user's spec.
const PANCAKE_SIZES = [100, 80, 65];
// Random delay window per round (ms). R1/R2 = 3-7s, R3 tightens to 3-5s.
const DELAY_RANGES: [number, number][] = [
  [3000, 7000],
  [3000, 7000],
  [3000, 5000],
];
const RATING_DURATION = 1300;

type Phase = 'intro' | 'waiting' | 'pancake' | 'rating' | 'done';
type Rating = 'PERFECT' | 'GREAT' | 'GOOD' | 'HORRIBLE';

function classifyReaction(ms: number): Rating {
  // User's spec called out under 0.3 / 0.4-0.5 / 0.6-0.8 / 0.9+ —
  // boundaries below cover the gaps in between, biased generous.
  if (ms < 400) return 'PERFECT';
  if (ms < 600) return 'GREAT';
  if (ms < 900) return 'GOOD';
  return 'HORRIBLE';
}

export function PopReactionGame({ onBack, onScore }: PopReactionGameProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0); // 0-based
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [lastReactionMs, setLastReactionMs] = useState<number | null>(null);
  const [reactions, setReactions] = useState<number[]>([]);
  const [highBest, setHighBest] = useState<number>(() => {
    const saved = localStorage.getItem('pancake-pop-high');
    return saved ? parseInt(saved) : Number.POSITIVE_INFINITY;
  });

  const showTimeRef = useRef(0);
  const tappedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleRound = useCallback((roundIdx: number) => {
    cancelTimer();
    if (roundIdx >= ROUNDS) {
      setPhase('done');
      return;
    }
    setRound(roundIdx);
    setPhase('waiting');
    const [min, max] = DELAY_RANGES[roundIdx];
    const delay = min + Math.random() * (max - min);
    timerRef.current = setTimeout(() => {
      const size = PANCAKE_SIZES[roundIdx];
      const margin = size / 2 + 16;
      const w = containerRef.current?.clientWidth ?? window.innerWidth;
      const h = containerRef.current?.clientHeight ?? window.innerHeight;
      const x = margin + Math.random() * Math.max(0, w - margin * 2);
      const y = margin + Math.random() * Math.max(0, h - margin * 2);
      setPos({ x, y });
      tappedRef.current = false;
      showTimeRef.current = performance.now();
      setPhase('pancake');
    }, delay);
  }, []);

  const startGame = useCallback(() => {
    cancelTimer();
    setReactions([]);
    setLastReactionMs(null);
    scheduleRound(0);
  }, [scheduleRound]);

  const handleTap = useCallback(() => {
    if (phase !== 'pancake' || tappedRef.current) return;
    tappedRef.current = true;
    cancelTimer();
    const ms = performance.now() - showTimeRef.current;
    setLastReactionMs(ms);
    setReactions(prev => [...prev, ms]);
    setPhase('rating');
    timerRef.current = setTimeout(() => {
      scheduleRound(round + 1);
    }, RATING_DURATION);
  }, [phase, round, scheduleRound]);

  // Submit score once the run completes
  useEffect(() => {
    if (phase !== 'done' || reactions.length !== ROUNDS) return;
    const avgMs = Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length);
    if (avgMs < highBest) {
      setHighBest(avgMs);
      localStorage.setItem('pancake-pop-high', String(avgMs));
    }
    onScore?.('pop', avgMs);
  }, [phase, reactions, highBest, onScore]);

  // Cleanup
  useEffect(() => () => cancelTimer(), []);

  const avgMs = reactions.length > 0
    ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)
    : 0;
  const rating: Rating | null = lastReactionMs !== null ? classifyReaction(lastReactionMs) : null;
  const newBest = phase === 'done' && reactions.length === ROUNDS && avgMs <= highBest;

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-white overflow-hidden select-none">
      {/* Minimal back button — stays out of the way */}
      <button
        onClick={onBack}
        className="absolute top-3 left-3 z-30 text-xs text-gray-300 hover:text-gray-700 cursor-pointer bg-transparent border-0 px-2 py-1"
      >
        ← Back
      </button>

      {/* Round indicator */}
      {(phase === 'waiting' || phase === 'pancake' || phase === 'rating') && (
        <div className="absolute top-3 right-3 z-30 text-xs text-gray-300 font-mono">
          {round + 1}/{ROUNDS}
        </div>
      )}

      {/* Intro */}
      {phase === 'intro' && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-3">⚡</div>
            <h2 className="text-2xl font-bold text-pancake-brown mb-2">Pancake Pop Reaction Test</h2>
            <p className="text-sm text-pancake-medium mb-4">
              The screen goes blank. After a moment, a tiny pancake pops up somewhere — tap it as fast as you can. Three rounds. Each one harder than the last.
            </p>
            {Number.isFinite(highBest) && (
              <p className="text-xs text-pancake-medium/80 mb-4">Best avg: {(highBest / 1000).toFixed(2)}s</p>
            )}
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105 transition"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* The pancake */}
      {phase === 'pancake' && (
        <button
          onPointerDown={(e) => { e.preventDefault(); handleTap(); }}
          style={{
            left: pos.x,
            top: pos.y,
            width: PANCAKE_SIZES[round],
            height: PANCAKE_SIZES[round],
            transform: 'translate(-50%, -50%)',
          }}
          className="absolute z-20 cursor-pointer bg-transparent border-0 flex items-center justify-center pop-in"
          aria-label="Tap the pancake"
        >
          <span style={{ fontSize: PANCAKE_SIZES[round], lineHeight: 1 }}>🥞</span>
        </button>
      )}

      {/* Rating overlay */}
      {phase === 'rating' && rating && lastReactionMs !== null && (
        <RatingOverlay rating={rating} ms={lastReactionMs} />
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold text-pancake-brown mb-2">Congratulations!</h2>
            <p className="text-base text-pancake-brown mb-2">
              Your average click speed: <span className="font-bold">{(avgMs / 1000).toFixed(2)}s</span>
            </p>
            <p className="text-xs text-pancake-medium mb-4">
              {reactions.map((r, i) => `R${i + 1}: ${(r / 1000).toFixed(2)}s`).join('  ·  ')}
            </p>
            {newBest && (
              <p className="text-xs text-pancake-gold font-bold mb-4">⭐ New best!</p>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl border-2 border-shop-border bg-pancake-warm text-pancake-brown font-bold cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={startGame}
                className="px-5 py-2.5 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pop-in {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
          70%  { transform: translate(-50%, -50%) scale(1.18); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        .pop-in { animation: pop-in 0.18s ease-out forwards; }

        @keyframes rating-pop {
          0%   { transform: scale(0.6); opacity: 0; }
          50%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .rating-pop { animation: rating-pop 0.35s ease-out forwards; }

        @keyframes sparkle-burst {
          0%   { transform: scale(0) rotate(0deg);   opacity: 1; }
          100% { transform: scale(2.4) rotate(180deg); opacity: 0; }
        }
        .sparkle-burst { animation: sparkle-burst 0.9s ease-out forwards; }

        @keyframes flash-fade {
          0%   { opacity: 0.55; }
          100% { opacity: 0; }
        }
        .flash-fade { animation: flash-fade 0.7s ease-out forwards; }

        @keyframes ring-pulse {
          0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
        }
        .ring-pulse { animation: ring-pulse 0.85s ease-out forwards; }

        @keyframes smoke-puff {
          0%   { transform: translateY(0) scale(0.7);    opacity: 0.7; }
          100% { transform: translateY(-70px) scale(1.7); opacity: 0; }
        }
        .smoke-puff { animation: smoke-puff 1.1s ease-out forwards; }
      `}</style>
    </div>
  );
}

function RatingOverlay({ rating, ms }: { rating: Rating; ms: number }) {
  const colorClass = {
    PERFECT: 'text-yellow-500',
    GREAT: 'text-green-500',
    GOOD: 'text-blue-500',
    HORRIBLE: 'text-gray-500',
  }[rating];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 overflow-hidden">
      {/* PERFECT — golden sparkle burst */}
      {rating === 'PERFECT' && (
        <>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dx = Math.cos(angle) * 90;
            const dy = Math.sin(angle) * 90;
            return (
              <span
                key={i}
                className="absolute text-3xl sparkle-burst"
                style={{ transform: `translate(${dx}px, ${dy}px)` }}
              >
                ✨
              </span>
            );
          })}
        </>
      )}

      {/* GREAT — green flash overlay */}
      {rating === 'GREAT' && <div className="absolute inset-0 bg-green-400 flash-fade" />}

      {/* GOOD — blue pulsing rings */}
      {rating === 'GOOD' && (
        <>
          <div
            className="absolute w-32 h-32 rounded-full border-4 border-blue-400 ring-pulse"
            style={{ left: '50%', top: '50%' }}
          />
          <div
            className="absolute w-32 h-32 rounded-full border-4 border-blue-400 ring-pulse"
            style={{ left: '50%', top: '50%', animationDelay: '0.18s' }}
          />
        </>
      )}

      {/* HORRIBLE — gray smoke puff */}
      {rating === 'HORRIBLE' && (
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="absolute text-4xl smoke-puff"
              style={{
                left: `calc(50% + ${(i - 2) * 18}px)`,
                top: '52%',
                animationDelay: `${i * 0.06}s`,
              }}
            >
              💨
            </span>
          ))}
        </>
      )}

      {/* Rating text */}
      <div className={`relative text-center rating-pop ${colorClass}`}>
        <div
          className="text-6xl font-extrabold tracking-wider"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.18)' }}
        >
          {rating}{rating === 'PERFECT' || rating === 'GREAT' ? '!' : ''}
        </div>
        <div className="text-sm font-medium mt-1 opacity-80">{(ms / 1000).toFixed(2)}s</div>
      </div>
    </div>
  );
}

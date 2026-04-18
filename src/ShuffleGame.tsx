import { useCallback, useEffect, useRef, useState } from 'react';

interface ShuffleGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

type Phase = 'ready' | 'reveal' | 'shuffling' | 'picking' | 'reveal-result' | 'result';

const TRAY_COUNT = 3;
const REVEAL_MS = 1800;
const POINTS_PER_ROUND = 1000;

interface TrayState {
  id: number;
  position: number;
}

function randInt(n: number) {
  return Math.floor(Math.random() * n);
}

function shuffleRounds(round: number) {
  // Gradually ramp: 3 swaps in round 1, +1 each round, capped at 14.
  return Math.min(14, 3 + Math.floor(round * 0.9));
}

function swapDurationMs(round: number) {
  // Start relaxed (750ms), shrink by 35ms per round, floor at 140ms.
  return Math.max(140, 750 - round * 35);
}

export function ShuffleGame({ onBack, onScore }: ShuffleGameProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [trays, setTrays] = useState<TrayState[]>(
    Array.from({ length: TRAY_COUNT }, (_, i) => ({ id: i, position: i })),
  );
  const [targetId, setTargetId] = useState(0);
  const [swapDuration, setSwapDuration] = useState(750);
  const [pickedPosition, setPickedPosition] = useState<number | null>(null);
  const [pickCorrect, setPickCorrect] = useState(false);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('pancake-shuffle-high');
    return saved ? parseInt(saved) : 0;
  });

  const roundRef = useRef(0);
  const scoreRef = useRef(0);
  const targetRef = useRef(0);
  const trayWidthRef = useRef(96);
  const gapRef = useRef(16);
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  const computeLayout = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const width = c.clientWidth;
    // 3 trays with gaps. gap ~ 8% of width, tray = remaining / 3.
    const gap = Math.max(8, Math.min(20, Math.round(width * 0.04)));
    const tray = Math.max(64, Math.floor((width - 2 * gap) / 3));
    trayWidthRef.current = tray;
    gapRef.current = gap;
  }, []);

  useEffect(() => {
    computeLayout();
    const onResize = () => computeLayout();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [computeLayout]);

  const resetTrays = useCallback(() => {
    setTrays(Array.from({ length: TRAY_COUNT }, (_, i) => ({ id: i, position: i })));
  }, []);

  const endGame = useCallback(() => {
    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('pancake-shuffle-high', String(finalScore));
      onScore?.('shuffle', finalScore);
    }
    setPhase('result');
  }, [highScore, onScore]);

  const startRound = useCallback(async (nextRound: number) => {
    if (cancelRef.current) return;
    roundRef.current = nextRound;
    setRound(nextRound);

    // Pick a new target tray id for this round.
    const newTargetId = randInt(TRAY_COUNT);
    targetRef.current = newTargetId;
    setTargetId(newTargetId);

    // Reset tray positions (id === position) so the reveal shows the target at a known spot.
    resetTrays();
    setPickedPosition(null);
    setPickCorrect(false);
    setPhase('reveal');

    // Wait for reveal window.
    await sleep(REVEAL_MS);
    if (cancelRef.current) return;

    // Lids close — a quick beat before shuffling.
    setPhase('shuffling');
    await sleep(350);
    if (cancelRef.current) return;

    // Perform swaps.
    const swaps = shuffleRounds(nextRound);
    const duration = swapDurationMs(nextRound);
    setSwapDuration(duration);

    for (let i = 0; i < swaps; i++) {
      if (cancelRef.current) return;
      // Pick two distinct trays by their CURRENT positions.
      const a = randInt(TRAY_COUNT);
      let b = randInt(TRAY_COUNT);
      while (b === a) b = randInt(TRAY_COUNT);

      setTrays(prev => prev.map(t => {
        if (t.position === a) return { ...t, position: b };
        if (t.position === b) return { ...t, position: a };
        return t;
      }));
      await sleep(duration);
    }

    if (cancelRef.current) return;
    setPhase('picking');
  }, [resetTrays]);

  const startGame = useCallback(() => {
    cancelRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    startRound(1);
  }, [startRound]);

  useEffect(() => {
    return () => { cancelRef.current = true; };
  }, []);

  const handleBack = () => {
    cancelRef.current = true;
    onBack();
  };

  const handlePick = useCallback((slotPosition: number) => {
    if (phase !== 'picking') return;
    const trayAtSlot = trays.find(t => t.position === slotPosition);
    if (!trayAtSlot) return;
    const correct = trayAtSlot.id === targetRef.current;

    setPickedPosition(slotPosition);
    setPickCorrect(correct);
    setPhase('reveal-result');

    if (correct) {
      scoreRef.current += POINTS_PER_ROUND;
      setScore(scoreRef.current);
      // After a short celebration, start the next round.
      setTimeout(() => {
        if (cancelRef.current) return;
        startRound(roundRef.current + 1);
      }, 1400);
    } else {
      setTimeout(() => {
        if (cancelRef.current) return;
        endGame();
      }, 1800);
    }
  }, [phase, trays, endGame, startRound]);

  // Show pancake contents when: reveal phase (all), reveal-result (all), or result (all open).
  const lidsUp = phase === 'reveal' || phase === 'reveal-result' || phase === 'result' || phase === 'ready';
  const isShuffling = phase === 'shuffling';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Pancake Toppings Shuffle</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Find the berry pancake. Don't lose it!</p>
          </div>
          <button
            onClick={handleBack}
            className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0"
          >
            ✕
          </button>
        </div>

        {phase !== 'ready' && phase !== 'result' && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
            <div>
              <span className="text-pancake-medium">Round: </span>
              <span className="font-bold text-pancake-brown text-lg">{round}</span>
            </div>
            <div>
              <span className="text-pancake-medium">Score: </span>
              <span className="font-bold text-pancake-gold text-lg tabular-nums">{score}</span>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="relative select-none"
          style={{
            height: 360,
            background: 'linear-gradient(180deg, #FFF7D6 0%, #FFE6B8 100%)',
            touchAction: 'manipulation',
          }}
        >
          {/* Counter surface */}
          <div
            className="absolute left-0 right-0"
            style={{
              bottom: 0,
              height: 80,
              background: 'linear-gradient(180deg, rgba(139,105,20,0.08) 0%, rgba(139,105,20,0.2) 100%)',
              borderTop: '2px solid rgba(139,105,20,0.25)',
            }}
          />

          {/* Status banner */}
          <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none z-20">
            <StatusBanner phase={phase} pickCorrect={pickCorrect} />
          </div>

          {/* Trays */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative"
              style={{
                width: 3 * trayWidthRef.current + 2 * gapRef.current,
                height: 200,
              }}
            >
              {trays.map(tray => {
                const x = tray.position * (trayWidthRef.current + gapRef.current);
                const isTarget = tray.id === targetId;
                const picked = pickedPosition !== null && tray.position === pickedPosition;
                return (
                  <Tray
                    key={tray.id}
                    x={x}
                    width={trayWidthRef.current}
                    duration={isShuffling ? swapDuration : 220}
                    lidUp={lidsUp}
                    hasBerries={isTarget}
                    highlight={
                      phase === 'reveal-result'
                        ? (picked ? (pickCorrect ? 'correct' : 'wrong') : (isTarget ? 'target' : 'none'))
                        : 'none'
                    }
                    clickable={phase === 'picking'}
                    bob={phase === 'picking'}
                    onPick={() => handlePick(tray.position)}
                  />
                );
              })}
            </div>
          </div>

          {/* Ready overlay */}
          {phase === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/85 z-30 p-5">
              <div className="text-5xl mb-2">🎩</div>
              <div className="text-lg font-bold text-pancake-brown">Pancake Toppings Shuffle</div>
              <p className="text-xs text-pancake-medium text-center mt-1 mb-3 px-4">
                Watch the berry pancake, then track it as the trays shuffle.
                Pick right: +{POINTS_PER_ROUND} and the next round speeds up.
                Pick wrong and it's game over!
              </p>
              <button
                onClick={startGame}
                className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0"
              >
                Tap to Start
              </button>
              {highScore > 0 && (
                <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}</p>
              )}
            </div>
          )}

          {/* Result overlay */}
          {phase === 'result' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/90 z-30 p-5">
              <div className="text-4xl mb-1">
                {score > 0 && score >= highScore ? '🏆' : '💥'}
              </div>
              <div className="text-base font-bold text-pancake-brown">
                {score > 0 && score >= highScore ? 'New Record!' : 'Wrong tray!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold my-1 tabular-nums">{score}</div>
              <div className="text-xs text-pancake-medium">Made it to round {round}</div>
              <button
                onClick={startGame}
                className="mt-3 px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

interface TrayProps {
  x: number;
  width: number;
  duration: number;
  lidUp: boolean;
  hasBerries: boolean;
  highlight: 'none' | 'correct' | 'wrong' | 'target';
  clickable: boolean;
  bob: boolean;
  onPick: () => void;
}

function Tray({ x, width, duration, lidUp, hasBerries, highlight, clickable, bob, onPick }: TrayProps) {
  const height = Math.round(width * 1.6);
  const lidHeight = Math.round(width * 0.45);
  const trayBase = height - lidHeight;

  const ringColor =
    highlight === 'correct' ? '#43A047'
      : highlight === 'wrong' ? '#E53935'
      : highlight === 'target' ? '#FFB300'
      : 'transparent';

  return (
    <button
      onPointerDown={e => { e.preventDefault(); if (clickable) onPick(); }}
      disabled={!clickable}
      className="absolute border-0 bg-transparent p-0 cursor-pointer disabled:cursor-default"
      style={{
        left: 0,
        top: 0,
        width,
        height,
        transform: `translateX(${x}px)`,
        transition: `transform ${duration}ms cubic-bezier(0.45, 0.05, 0.55, 0.95)`,
        filter: highlight === 'wrong' ? 'saturate(0.9)' : undefined,
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          animation: bob ? `tray-bob 1.8s ease-in-out infinite` : undefined,
          animationDelay: bob ? `${x * 0.002}s` : undefined,
        }}
      >
        {/* Tray glow */}
        {ringColor !== 'transparent' && (
          <div
            className="absolute inset-0 rounded-[28%]"
            style={{
              boxShadow: `0 0 0 4px ${ringColor}, 0 0 24px ${ringColor}`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Tray base */}
        <div
          className="absolute left-0 right-0"
          style={{
            bottom: 0,
            height: trayBase,
          }}
        >
          {/* Shadow under tray */}
          <div
            className="absolute left-[10%] right-[10%] rounded-full"
            style={{
              bottom: -6,
              height: 10,
              background: 'rgba(0,0,0,0.22)',
              filter: 'blur(4px)',
            }}
          />

          {/* Metal tray body */}
          <div
            className="absolute inset-0 rounded-b-[24%] rounded-t-[12%]"
            style={{
              background: 'linear-gradient(180deg, #E0E0E0 0%, #BDBDBD 50%, #9E9E9E 100%)',
              border: '2px solid #757575',
              boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.5), inset 0 -4px 6px rgba(0,0,0,0.2)',
            }}
          />
          {/* Tray inner rim */}
          <div
            className="absolute left-[6%] right-[6%] rounded-[30%_30%_20%_20%]"
            style={{
              top: '18%',
              bottom: '14%',
              background: 'radial-gradient(ellipse at 50% 30%, #F0F0F0 0%, #C8C8C8 70%, #A0A0A0 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
            }}
          />

          {/* Pancake on tray (visible when lid is up) */}
          {lidUp && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: width * 0.75, height: width * 0.45 }}
            >
              <PancakeArt width={width * 0.75} berries={hasBerries} />
            </div>
          )}
        </div>

        {/* Lid */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: 0,
            height: lidHeight,
            transform: lidUp ? `translateY(-${lidHeight * 0.9}px) scale(1.02)` : 'translateY(0) scale(1)',
            transformOrigin: 'bottom center',
            transition: 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            pointerEvents: 'none',
          }}
        >
          {/* Lid dome */}
          <div
            className="absolute inset-0 rounded-t-[48%] rounded-b-[12%]"
            style={{
              background: 'linear-gradient(180deg, #F5F5F5 0%, #D0D0D0 45%, #9E9E9E 100%)',
              border: '2px solid #757575',
              boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.7), inset 0 -4px 8px rgba(0,0,0,0.25)',
            }}
          />
          {/* Lid shine */}
          <div
            className="absolute rounded-full"
            style={{
              top: '12%',
              left: '20%',
              width: '28%',
              height: '18%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0))',
              filter: 'blur(1px)',
              pointerEvents: 'none',
            }}
          />
          {/* Handle knob */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: -Math.round(lidHeight * 0.16), width: Math.round(width * 0.18), height: Math.round(width * 0.14) }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: 'radial-gradient(ellipse at 40% 35%, #FFFFFF 0%, #BDBDBD 60%, #757575 100%)',
                border: '2px solid #616161',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 3px rgba(0,0,0,0.25)',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tray-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </button>
  );
}

function PancakeArt({ width, berries }: { width: number; berries: boolean }) {
  const h = width * 0.6;
  return (
    <svg viewBox="0 0 100 60" width={width} height={h} className="drop-shadow-md">
      <ellipse cx="50" cy="42" rx="42" ry="10" fill="#A0722C" opacity="0.35" />
      <ellipse cx="50" cy="36" rx="42" ry="17" fill="#D4A044" />
      <ellipse cx="50" cy="34" rx="40" ry="15" fill="#E8B84C" />
      <ellipse cx="50" cy="31" rx="38" ry="13" fill="#F0C85C" />
      <ellipse cx="50" cy="31" rx="38" ry="13" fill="url(#trayShine)" />
      {/* Plain pancake: butter + light spots */}
      {!berries && (
        <>
          <rect x="42" y="22" width="16" height="10" rx="2" fill="#FFE082" />
          <rect x="43" y="23" width="14" height="8" rx="2" fill="#FFEE99" />
          <circle cx="30" cy="30" r="2" fill="#D4A044" opacity="0.5" />
          <circle cx="70" cy="32" r="2" fill="#D4A044" opacity="0.5" />
          <circle cx="55" cy="38" r="1.8" fill="#D4A044" opacity="0.5" />
        </>
      )}
      {/* Berry pancake: blueberries + strawberry */}
      {berries && (
        <>
          {/* Strawberry (red with green top) */}
          <path
            d="M 46 20 Q 42 21 43 25 Q 45 32 50 32 Q 55 32 57 25 Q 58 21 54 20 Z"
            fill="#E53935"
          />
          <path d="M 46 19 L 48 21 L 50 18 L 52 21 L 54 19 L 53 22 L 47 22 Z" fill="#43A047" />
          <circle cx="46" cy="26" r="0.8" fill="#FFF59D" />
          <circle cx="50" cy="29" r="0.8" fill="#FFF59D" />
          <circle cx="54" cy="26" r="0.8" fill="#FFF59D" />
          {/* Blueberries */}
          <circle cx="34" cy="28" r="3" fill="#3F51B5" />
          <circle cx="33.2" cy="27" r="1" fill="#9FA8DA" opacity="0.7" />
          <circle cx="38" cy="34" r="2.8" fill="#283593" />
          <circle cx="37.4" cy="33" r="0.9" fill="#9FA8DA" opacity="0.7" />
          <circle cx="65" cy="32" r="3" fill="#3F51B5" />
          <circle cx="64.2" cy="31" r="1" fill="#9FA8DA" opacity="0.7" />
          <circle cx="62" cy="38" r="2.6" fill="#1A237E" />
          <circle cx="42" cy="38" r="2.4" fill="#283593" />
        </>
      )}
      <defs>
        <radialGradient id="trayShine" cx="38%" cy="30%">
          <stop offset="0%" stopColor="#FFE082" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#C89532" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function StatusBanner({ phase, pickCorrect }: { phase: Phase; pickCorrect: boolean }) {
  let text = '';
  let bg = 'rgba(255,215,0,0.9)';
  if (phase === 'reveal') { text = 'Remember the berry pancake!'; }
  else if (phase === 'shuffling') { text = 'Shuffling…'; bg = 'rgba(200,149,50,0.9)'; }
  else if (phase === 'picking') { text = 'Pick a tray!'; bg = 'rgba(255,215,0,0.95)'; }
  else if (phase === 'reveal-result') { text = pickCorrect ? '+1000! Great eye!' : 'Oh no!'; bg = pickCorrect ? 'rgba(76,175,80,0.95)' : 'rgba(229,57,53,0.9)'; }
  else return null;
  return (
    <div
      className="px-4 py-1.5 rounded-full text-pancake-brown text-xs font-bold shadow"
      style={{ background: bg }}
    >
      {text}
    </div>
  );
}

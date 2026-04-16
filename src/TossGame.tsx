import { useState, useEffect, useRef, useCallback } from 'react';

interface TossGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

const WIDTH = 320;
const HEIGHT = 420;
const PAN_Y = HEIGHT - 80;
const PAN_WIDTH = 130;
const PANCAKE_SIZE = 54;
const CATCH_TOLERANCE = 20;

type Phase = 'ready' | 'tossing' | 'result';

export function TossGame({ onBack, onScore }: TossGameProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [catches, setCatches] = useState(0);
  const [pancakeY, setPancakeY] = useState(PAN_Y);
  const [vy, setVy] = useState(-10);
  const [inAir, setInAir] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-toss-high');
    return saved ? parseInt(saved) : 0;
  });

  const vyRef = useRef(-10);
  const yRef = useRef(PAN_Y);
  const inAirRef = useRef(false);
  const catchesRef = useRef(0);

  const endGame = useCallback(() => {
    const final = catchesRef.current;
    if (final > highScore) {
      setHighScore(final);
      localStorage.setItem('pancake-toss-high', String(final));
      onScore?.('toss', final);
    }
    setPhase('result');
  }, [highScore, onScore]);

  const toss = useCallback(() => {
    const power = -10 - Math.min(catchesRef.current * 0.6, 9);
    vyRef.current = power;
    setVy(power);
    inAirRef.current = true;
    setInAir(true);
  }, []);

  const startGame = useCallback(() => {
    yRef.current = PAN_Y;
    setPancakeY(PAN_Y);
    catchesRef.current = 0;
    setCatches(0);
    setPhase('tossing');
    setTimeout(() => toss(), 300);
  }, [toss]);

  // Physics loop
  useEffect(() => {
    if (phase !== 'tossing') return;
    let raf = 0;
    const tick = () => {
      if (inAirRef.current) {
        vyRef.current += 0.45; // gravity
        yRef.current += vyRef.current;
        if (yRef.current >= PAN_Y) {
          // Landed without a catch = game over
          yRef.current = PAN_Y;
          inAirRef.current = false;
          setInAir(false);
          setPancakeY(PAN_Y);
          setVy(vyRef.current);
          setTimeout(endGame, 200);
          return;
        }
        setPancakeY(yRef.current);
        setVy(vyRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, endGame]);

  const attemptCatch = useCallback(() => {
    if (phase !== 'tossing' || !inAirRef.current) return;
    // Must catch near the pan and while descending
    const descending = vyRef.current > 0;
    const nearPan = Math.abs(yRef.current - PAN_Y) < CATCH_TOLERANCE;
    if (descending && nearPan) {
      catchesRef.current += 1;
      setCatches(catchesRef.current);
      inAirRef.current = false;
      setInAir(false);
      yRef.current = PAN_Y;
      setPancakeY(PAN_Y);
      setTimeout(() => toss(), 250);
    } else {
      // Missed: ends the game
      inAirRef.current = false;
      setInAir(false);
      setTimeout(endGame, 100);
    }
  }, [phase, toss, endGame]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (phase === 'tossing') attemptCatch();
        else if (phase === 'ready' || phase === 'result') startGame();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, attemptCatch, startGame]);

  const catchable = inAir && vy > 0 && Math.abs(pancakeY - PAN_Y) < CATCH_TOLERANCE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Pancake Toss & Catch</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Tap to catch as it comes back down!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {phase === 'tossing' && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
            <div>
              <span className="text-pancake-medium">Catches: </span>
              <span className="font-bold text-pancake-brown text-lg">{catches}</span>
            </div>
            <div className="text-xs text-pancake-medium">
              Tap when the pancake returns to the pan
            </div>
          </div>
        )}

        <div
          className="relative select-none overflow-hidden"
          style={{ width: '100%', height: HEIGHT, background: 'linear-gradient(180deg, #FFF9E6 0%, #FFE6B8 100%)', touchAction: 'none' }}
          onPointerDown={() => {
            if (phase === 'tossing') attemptCatch();
            else startGame();
          }}
        >
          <div className="absolute inset-0 flex justify-center">
            <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
              {/* Pan */}
              <div
                className="absolute rounded-b-full"
                style={{
                  left: (WIDTH - PAN_WIDTH) / 2,
                  top: PAN_Y + PANCAKE_SIZE / 2 - 8,
                  width: PAN_WIDTH,
                  height: 20,
                  background: 'linear-gradient(180deg, #3a3a3a 0%, #111 100%)',
                  boxShadow: '0 6px 10px rgba(0,0,0,0.25)',
                }}
              />
              {/* Pan handle */}
              <div
                className="absolute"
                style={{
                  left: (WIDTH + PAN_WIDTH) / 2 - 4,
                  top: PAN_Y + PANCAKE_SIZE / 2,
                  width: 60,
                  height: 8,
                  background: '#222',
                  borderRadius: 4,
                }}
              />

              {/* Catch-window indicator */}
              {catchable && (
                <div
                  className="absolute rounded-full border-2 border-green-400"
                  style={{
                    left: WIDTH / 2 - (PANCAKE_SIZE + 24) / 2,
                    top: PAN_Y - 12,
                    width: PANCAKE_SIZE + 24,
                    height: PANCAKE_SIZE + 24,
                    animation: 'pulse-green 0.35s ease-in-out infinite alternate',
                  }}
                />
              )}

              {/* Pancake */}
              {(phase === 'tossing' || phase === 'ready') && (
                <div
                  className="absolute rounded-full"
                  style={{
                    left: WIDTH / 2 - PANCAKE_SIZE / 2,
                    top: pancakeY,
                    width: PANCAKE_SIZE,
                    height: PANCAKE_SIZE,
                    background: 'radial-gradient(ellipse at 40% 35%, #F5C864 0%, #D4A030 50%, #B8860B 100%)',
                    boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.2), 0 4px 10px rgba(139,105,20,0.4)',
                    transition: phase === 'ready' ? 'top 0.2s' : 'none',
                    transform: `rotate(${vy * 10}deg)`,
                  }}
                />
              )}

              {phase === 'ready' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
                  <div className="text-5xl mb-2">🥞</div>
                  <div className="text-lg font-bold text-pancake-brown">Pancake Toss & Catch</div>
                  <p className="text-xs text-pancake-medium text-center px-6 mt-1 mb-3">
                    Tap right as the pancake comes back down. Each catch tosses it higher!
                  </p>
                  <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                    Tap to Start
                  </button>
                  {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}</p>}
                </div>
              )}

              {phase === 'result' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
                  <div className="text-4xl mb-1">{catches >= highScore && catches > 0 ? '🏆' : '🥞'}</div>
                  <div className="text-base font-bold text-pancake-brown">{catches >= highScore && catches > 0 ? 'New Record!' : 'Missed!'}</div>
                  <div className="text-3xl font-bold text-pancake-gold my-1">{catches}</div>
                  <p className="text-xs text-pancake-medium mb-3">catch{catches === 1 ? '' : 'es'}</p>
                  <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse-green {
            from { transform: scale(1); opacity: 0.6; }
            to   { transform: scale(1.15); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';

interface PourGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

const TOTAL_ROUNDS = 10;
const MAX_WEIGHT = 100;
const POUR_RATE = 1.4; // units per frame

type Phase = 'ready' | 'playing' | 'result';

export function PourGame({ onBack, onScore }: PourGameProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState(50);
  const [weight, setWeight] = useState(0);
  const [pouring, setPouring] = useState(false);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-pour-high');
    return saved ? parseInt(saved) : 0;
  });

  const pouringRef = useRef(false);
  const weightRef = useRef(0);
  const scoreRef = useRef(0);

  const randomTarget = () => Math.floor(20 + Math.random() * 65); // 20–84

  const startGame = useCallback(() => {
    setRound(1);
    setTarget(randomTarget());
    setWeight(0);
    weightRef.current = 0;
    scoreRef.current = 0;
    setTotalScore(0);
    setLastDelta(null);
    setLastPoints(null);
    setPouring(false);
    pouringRef.current = false;
    setPhase('playing');
  }, []);

  const endRound = useCallback(() => {
    const delta = Math.abs(weightRef.current - target);
    const points = Math.max(0, Math.round(100 - delta * 2));
    scoreRef.current += points;
    setTotalScore(scoreRef.current);
    setLastDelta(Math.round(delta * 10) / 10);
    setLastPoints(points);

    if (round >= TOTAL_ROUNDS) {
      const final = scoreRef.current;
      if (final > highScore) {
        setHighScore(final);
        localStorage.setItem('pancake-pour-high', String(final));
        onScore?.('pour', final);
      }
      setTimeout(() => setPhase('result'), 800);
    } else {
      setTimeout(() => {
        setRound(r => r + 1);
        setTarget(randomTarget());
        weightRef.current = 0;
        setWeight(0);
        setLastDelta(null);
        setLastPoints(null);
      }, 800);
    }
  }, [round, target, highScore, onScore]);

  // Pour loop
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    const tick = () => {
      if (pouringRef.current && weightRef.current < MAX_WEIGHT) {
        weightRef.current = Math.min(MAX_WEIGHT, weightRef.current + POUR_RATE);
        setWeight(weightRef.current);
        if (weightRef.current >= MAX_WEIGHT) {
          pouringRef.current = false;
          setPouring(false);
          endRound();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, endRound]);

  const startPour = () => {
    if (phase !== 'playing') return;
    if (lastDelta !== null) return; // locked during result display
    if (weightRef.current > 0) return;
    pouringRef.current = true;
    setPouring(true);
  };

  const stopPour = () => {
    if (!pouringRef.current) return;
    pouringRef.current = false;
    setPouring(false);
    endRound();
  };

  useEffect(() => {
    const up = () => stopPour();
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  });

  const pct = (weight / MAX_WEIGHT) * 100;
  const targetPct = (target / MAX_WEIGHT) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Batter Pour Precision</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Hold to pour, release at the target!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {phase === 'playing' && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
            <div>
              <span className="text-pancake-medium">Round: </span>
              <span className="font-bold text-pancake-brown">{round}/{TOTAL_ROUNDS}</span>
            </div>
            <div>
              <span className="text-pancake-medium">Score: </span>
              <span className="font-bold text-pancake-brown text-lg">{totalScore}</span>
            </div>
          </div>
        )}

        <div className="p-6 flex flex-col items-center" style={{ background: 'linear-gradient(180deg, #FFF9E6 0%, #FFF0DB 100%)' }}>
          {phase === 'playing' && (
            <>
              <div className="text-center mb-2">
                <p className="text-xs text-pancake-medium">Target</p>
                <p className="text-2xl font-bold text-pancake-brown">{target}g</p>
              </div>

              <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-pancake-medium/30 bg-white/50">
                {/* Target line */}
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-green-500 z-10"
                  style={{ bottom: `${targetPct}%` }}
                >
                  <span className="absolute -top-5 right-2 text-xs font-bold text-green-600 bg-white/80 px-1 rounded">
                    {target}g
                  </span>
                </div>
                {/* Fill */}
                <div
                  className="absolute left-0 right-0 bottom-0 transition-none"
                  style={{
                    height: `${pct}%`,
                    background: 'linear-gradient(180deg, #F5DEB3 0%, #D4A030 100%)',
                    boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.1)',
                  }}
                />
                {/* Pouring jug */}
                {pouring && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ top: -2, fontSize: 38 }}
                  >
                    🫗
                  </div>
                )}
                {/* Reading */}
                <div className="absolute top-2 left-2 text-xs font-bold text-pancake-brown bg-white/80 px-2 py-0.5 rounded">
                  {Math.round(weight)}g
                </div>
              </div>

              <button
                onPointerDown={startPour}
                onPointerUp={stopPour}
                disabled={lastDelta !== null}
                className={`mt-4 w-full py-4 rounded-xl font-bold text-lg border-0 transition-all duration-75 cursor-pointer select-none disabled:opacity-60 ${
                  pouring ? 'bg-pancake-brown text-pancake-cream scale-95' : 'bg-pancake-gold text-pancake-brown'
                }`}
                style={{ touchAction: 'none' }}
              >
                {lastDelta !== null
                  ? `Off by ${lastDelta}g — +${lastPoints} pts`
                  : pouring ? 'Pouring… release!' : 'Hold to Pour'}
              </button>
            </>
          )}

          {phase === 'ready' && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="text-5xl mb-2">🫗</div>
              <div className="text-lg font-bold text-pancake-brown">Batter Pour Precision</div>
              <p className="text-xs text-pancake-medium px-6 mt-1 mb-3">
                Hold to pour, release exactly at the target weight. 10 rounds.
              </p>
              <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                Tap to Start
              </button>
              {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}</p>}
            </div>
          )}

          {phase === 'result' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-4xl mb-1">{totalScore >= highScore && totalScore > 0 ? '🏆' : '🫗'}</div>
              <div className="text-base font-bold text-pancake-brown">
                {totalScore >= highScore && totalScore > 0 ? 'New Record!' : 'All done!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold my-1">{totalScore}</div>
              <p className="text-xs text-pancake-medium mb-3">out of {TOTAL_ROUNDS * 100}</p>
              <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

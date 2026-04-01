import { useState, useRef, useCallback, useEffect } from 'react';

interface SplitGameProps {
  onBack: () => void;
}

interface Round {
  clickPercent: number;
  accuracy: number;
}

function randomPancake() {
  // Scale pancake to fit small screens
  const maxW = Math.min(320, window.innerWidth - 80);
  const minW = Math.min(240, maxW - 40);
  return {
    width: minW + Math.random() * (maxW - minW),
    offsetX: (Math.random() - 0.5) * 30,
    height: 100 + Math.random() * 50,
    skew: (Math.random() - 0.5) * 6,
  };
}

export function SplitGame({ onBack }: SplitGameProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [bestAccuracy, setBestAccuracy] = useState(() => {
    const saved = localStorage.getItem('pancake-split-best');
    return saved ? parseFloat(saved) : 0;
  });
  const [pancake, setPancake] = useState(randomPancake);
  const [cutResult, setCutResult] = useState<{ percent: number; accuracy: number } | null>(null);
  const [knifePos, setKnifePos] = useState<{ x: number; stage: 'slash' | 'done' } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const pancakeRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Clean up timers on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!pancakeRef.current || knifePos) return; // ignore clicks during animation
    const rect = pancakeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rawPercent = (x / rect.width) * 100;
    const percent = Math.round(rawPercent * 10) / 10; // one decimal precision
    const clamped = Math.max(0.1, Math.min(99.9, percent));
    const accuracy = Math.round((100 - Math.abs(50 - clamped) * 2) * 10) / 10;

    const xPercent = (x / rect.width) * 100;

    // Start knife animation
    setKnifePos({ x: xPercent, stage: 'slash' });
    setCutResult({ percent: clamped, accuracy });

    // After slash animation, show the split result
    setTimeout(() => {
      setKnifePos(prev => prev ? { ...prev, stage: 'done' } : null);
      setShowResult(true);
    }, 400);

    // Record the round
    setRounds(prev => [...prev, { clickPercent: clamped, accuracy }]);
    if (accuracy > bestAccuracy) {
      setBestAccuracy(accuracy);
      localStorage.setItem('pancake-split-best', String(accuracy));
    }

    // Clear everything and serve a new pancake
    timerRef.current = setTimeout(() => {
      setKnifePos(null);
      setCutResult(null);
      setShowResult(false);
      setPancake(randomPancake());
    }, 2000);
  }, [bestAccuracy, knifePos]);

  const reset = () => {
    setRounds([]);
    setCutResult(null);
    setKnifePos(null);
    setShowResult(false);
    setPancake(randomPancake());
  };

  const avgAccuracy = rounds.length > 0
    ? Math.round(rounds.reduce((s, r) => s + r.accuracy, 0) / rounds.length * 10) / 10
    : 0;

  const resultLabel = cutResult ? getResultLabel(cutResult.accuracy) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Split the Pancake</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Click to cut it exactly in half!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-pancake-medium text-xs">Best</div>
              <div className="font-bold text-pancake-gold">{bestAccuracy}%</div>
            </div>
            <div className="text-center">
              <div className="text-pancake-medium text-xs">Rounds</div>
              <div className="font-bold text-pancake-brown">{rounds.length}</div>
            </div>
            <div className="text-center">
              <div className="text-pancake-medium text-xs">Avg Accuracy</div>
              <div className="font-bold text-pancake-brown">{avgAccuracy}%</div>
            </div>
          </div>

          {/* The Pancake */}
          <div className="relative select-none w-full" style={{ maxWidth: 340, height: 200 }}>
            <div
              ref={pancakeRef}
              onClick={handleClick}
              className="absolute rounded-[50%] cursor-crosshair overflow-hidden"
              style={{
                width: pancake.width,
                height: pancake.height,
                left: `calc(50% - ${pancake.width / 2}px + ${pancake.offsetX}px)`,
                top: `calc(50% - ${pancake.height / 2}px)`,
                transform: `rotate(${pancake.skew}deg)`,
                background: 'radial-gradient(ellipse at 40% 35%, #F5C864 0%, #D4A030 50%, #B8860B 100%)',
                boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.15), 0 8px 24px rgba(139,105,20,0.3)',
              }}
            >
              {/* Surface dots */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'radial-gradient(circle 3px, #8B6914 20%, transparent 20%)',
                backgroundSize: '18px 16px',
                backgroundPosition: '0 0, 9px 8px',
              }} />

              {/* Split percentages (fade in after knife) */}
              {showResult && cutResult && (
                <>
                  <div
                    className="absolute inset-y-0 left-0 flex items-center justify-center animate-fade-in"
                    style={{ width: `${cutResult.percent}%` }}
                  >
                    <span className={`font-bold text-xl drop-shadow-lg ${
                      cutResult.accuracy >= 98 ? 'text-green-400' : 'text-white'
                    }`}>
                      {cutResult.percent}%
                    </span>
                  </div>
                  <div
                    className="absolute inset-y-0 right-0 flex items-center justify-center animate-fade-in"
                    style={{ width: `${100 - cutResult.percent}%` }}
                  >
                    <span className={`font-bold text-xl drop-shadow-lg ${
                      cutResult.accuracy >= 98 ? 'text-green-400' : 'text-white'
                    }`}>
                      {Math.round((100 - cutResult.percent) * 10) / 10}%
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Knife animation */}
            {knifePos && (
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  left: `calc(${pancakeRef.current ? (pancakeRef.current.offsetLeft + pancakeRef.current.offsetWidth * knifePos.x / 100) : 0}px)`,
                  top: knifePos.stage === 'slash' ? '-10%' : undefined,
                  animation: knifePos.stage === 'slash' ? 'knife-slash 0.4s ease-in forwards' : undefined,
                  opacity: knifePos.stage === 'done' ? 0 : 1,
                  transition: 'opacity 0.3s',
                }}
              >
                <span className="text-4xl" style={{ display: 'block', transform: 'rotate(45deg)' }}>🔪</span>
              </div>
            )}
          </div>

          {/* Result text */}
          {showResult && resultLabel ? (
            <div className="text-center animate-fade-in">
              <div className={`text-lg font-bold ${resultLabel.color}`}>
                {resultLabel.text}
              </div>
            </div>
          ) : !knifePos ? (
            <p className="text-sm text-pancake-medium animate-pulse">Click on the pancake to cut it!</p>
          ) : null}

          {rounds.length > 0 && (
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg border-2 border-shop-border bg-pancake-warm text-pancake-brown text-sm font-bold cursor-pointer hover:bg-pancake-light/30"
            >
              Reset Rounds
            </button>
          )}
        </div>

        <style>{`
          @keyframes knife-slash {
            0% { top: -30px; opacity: 0; transform: translateX(-50%); }
            30% { opacity: 1; }
            100% { top: 200px; opacity: 0.3; transform: translateX(-50%); }
          }
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}

function getResultLabel(accuracy: number): { text: string; color: string } {
  if (accuracy >= 100) return { text: 'PERFECT CUT! 100%', color: 'text-green-500' };
  if (accuracy >= 98) return { text: `Surgeon precision! ${accuracy}%`, color: 'text-green-400' };
  if (accuracy >= 94) return { text: `Amazing! ${accuracy}%`, color: 'text-green-400' };
  if (accuracy >= 88) return { text: `Great cut! ${accuracy}%`, color: 'text-pancake-gold' };
  if (accuracy >= 76) return { text: `Not bad — ${accuracy}%`, color: 'text-pancake-medium' };
  if (accuracy >= 60) return { text: `A bit off — ${accuracy}%`, color: 'text-orange-400' };
  return { text: `Way off center — ${accuracy}%`, color: 'text-red-400' };
}

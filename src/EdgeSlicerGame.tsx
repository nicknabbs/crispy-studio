import { useState, useRef, useCallback, useEffect } from 'react';

interface EdgeSlicerGameProps {
  onBack: () => void;
}

interface Round {
  clickPercent: number;
  edgeScore: number; // how close to the edge (lower = better)
}

function randomPancake() {
  const maxW = Math.min(320, window.innerWidth - 80);
  const minW = Math.min(240, maxW - 40);
  return {
    width: minW + Math.random() * (maxW - minW),
    offsetX: (Math.random() - 0.5) * 30,
    height: 100 + Math.random() * 50,
    skew: (Math.random() - 0.5) * 6,
  };
}

export function EdgeSlicerGame({ onBack }: EdgeSlicerGameProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [bestEdge, setBestEdge] = useState(() => {
    const saved = localStorage.getItem('pancake-edge-best');
    return saved ? parseFloat(saved) : 50;
  });
  const [pancake, setPancake] = useState(randomPancake);
  const [cutResult, setCutResult] = useState<{ percent: number; edgeScore: number } | null>(null);
  const [knifePos, setKnifePos] = useState<{ x: number; stage: 'slash' | 'done' } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const pancakeRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!pancakeRef.current || knifePos) return;
    const rect = pancakeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rawPercent = (x / rect.width) * 100;
    const percent = Math.round(rawPercent * 10) / 10;
    const clamped = Math.max(0.1, Math.min(99.9, percent));
    // Edge score = distance from nearest edge (lower = better, min 0.1)
    const edgeScore = Math.round(Math.min(clamped, 100 - clamped) * 10) / 10;

    const xPercent = (x / rect.width) * 100;

    setKnifePos({ x: xPercent, stage: 'slash' });
    setCutResult({ percent: clamped, edgeScore });

    setTimeout(() => {
      setKnifePos(prev => prev ? { ...prev, stage: 'done' } : null);
      setShowResult(true);
    }, 400);

    setRounds(prev => [...prev, { clickPercent: clamped, edgeScore }]);
    if (edgeScore < bestEdge) {
      setBestEdge(edgeScore);
      localStorage.setItem('pancake-edge-best', String(edgeScore));
    }

    timerRef.current = setTimeout(() => {
      setKnifePos(null);
      setCutResult(null);
      setShowResult(false);
      setPancake(randomPancake());
    }, 2000);
  }, [bestEdge, knifePos]);

  const reset = () => {
    setRounds([]);
    setCutResult(null);
    setKnifePos(null);
    setShowResult(false);
    setPancake(randomPancake());
  };

  const avgEdge = rounds.length > 0
    ? Math.round(rounds.reduce((s, r) => s + r.edgeScore, 0) / rounds.length * 10) / 10
    : 0;

  const resultLabel = cutResult ? getEdgeLabel(cutResult.edgeScore) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Edge Slicer</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Cut as close to the edge as possible!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-pancake-medium text-xs">Best Edge</div>
              <div className="font-bold text-pancake-gold">{bestEdge}%</div>
            </div>
            <div className="text-center">
              <div className="text-pancake-medium text-xs">Rounds</div>
              <div className="font-bold text-pancake-brown">{rounds.length}</div>
            </div>
            <div className="text-center">
              <div className="text-pancake-medium text-xs">Avg Edge</div>
              <div className="font-bold text-pancake-brown">{avgEdge}%</div>
            </div>
          </div>

          {/* Target indicator */}
          <div className="text-xs text-pancake-medium text-center">
            Goal: Get as close to <span className="font-bold text-red-400">0.1%</span> as you can!
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

              {/* Split percentages */}
              {showResult && cutResult && (
                <>
                  <div
                    className="absolute inset-y-0 left-0 flex items-center justify-center animate-fade-in"
                    style={{ width: `${cutResult.percent}%` }}
                  >
                    <span className={`font-bold text-xl drop-shadow-lg ${
                      cutResult.edgeScore <= 1 ? 'text-green-400' : 'text-white'
                    }`}>
                      {cutResult.percent}%
                    </span>
                  </div>
                  <div
                    className="absolute inset-y-0 right-0 flex items-center justify-center animate-fade-in"
                    style={{ width: `${100 - cutResult.percent}%` }}
                  >
                    <span className={`font-bold text-xl drop-shadow-lg ${
                      cutResult.edgeScore <= 1 ? 'text-green-400' : 'text-white'
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
            <p className="text-sm text-pancake-medium animate-pulse">Click as close to the edge as you can!</p>
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

function getEdgeLabel(edgeScore: number): { text: string; color: string } {
  if (edgeScore <= 0.1) return { text: 'IMPOSSIBLE! 0.1%', color: 'text-green-500' };
  if (edgeScore <= 0.5) return { text: `Razor thin! ${edgeScore}%`, color: 'text-green-400' };
  if (edgeScore <= 1.5) return { text: `Paper thin! ${edgeScore}%`, color: 'text-green-400' };
  if (edgeScore <= 3) return { text: `Sliver! ${edgeScore}%`, color: 'text-pancake-gold' };
  if (edgeScore <= 6) return { text: `Pretty close — ${edgeScore}%`, color: 'text-pancake-medium' };
  if (edgeScore <= 12) return { text: `Not that close — ${edgeScore}%`, color: 'text-orange-400' };
  if (edgeScore <= 25) return { text: `Too much pancake — ${edgeScore}%`, color: 'text-red-400' };
  return { text: `That's basically the middle — ${edgeScore}%`, color: 'text-red-400' };
}

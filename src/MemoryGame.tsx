import { useState, useEffect, useCallback, useRef } from 'react';

interface MemoryGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

const COLORS = [
  { id: 0, name: 'Blueberry', bg: '#4A90E2', glow: '#7FB3FF' },
  { id: 1, name: 'Strawberry', bg: '#E85A71', glow: '#FF8FA3' },
  { id: 2, name: 'Banana', bg: '#F5D547', glow: '#FFEB80' },
  { id: 3, name: 'Matcha', bg: '#7CB342', glow: '#ABD57E' },
];

type Phase = 'ready' | 'showing' | 'input' | 'result';

export function MemoryGame({ onBack, onScore }: MemoryGameProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [pattern, setPattern] = useState<number[]>([]);
  const [inputIdx, setInputIdx] = useState(0);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-memory-high');
    return saved ? parseInt(saved) : 0;
  });

  const patternRef = useRef<number[]>([]);

  const playPattern = useCallback(async (seq: number[]) => {
    const slow = localStorage.getItem('pancake-hack-memory-slow') === 'true';
    const mult = slow ? 2 : 1;
    setPhase('showing');
    await new Promise(r => setTimeout(r, 600));
    for (const id of seq) {
      setFlashId(id);
      await new Promise(r => setTimeout(r, 450 * mult));
      setFlashId(null);
      await new Promise(r => setTimeout(r, 180 * mult));
    }
    setPhase('input');
    setInputIdx(0);
  }, []);

  const nextRound = useCallback(async () => {
    const newStep = Math.floor(Math.random() * COLORS.length);
    const newPattern = [...patternRef.current, newStep];
    patternRef.current = newPattern;
    setPattern(newPattern);
    setRound(newPattern.length);
    await playPattern(newPattern);
  }, [playPattern]);

  const startGame = useCallback(async () => {
    patternRef.current = [];
    setPattern([]);
    setInputIdx(0);
    setPhase('showing');
    await nextRound();
  }, [nextRound]);

  const endGame = useCallback((score: number) => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('pancake-memory-high', String(score));
      onScore?.('memory', score);
    }
    setPhase('result');
  }, [highScore, onScore]);

  const tapColor = async (colorId: number) => {
    if (phase !== 'input') return;
    setFlashId(colorId);
    setTimeout(() => setFlashId(null), 200);

    if (patternRef.current[inputIdx] !== colorId) {
      endGame(patternRef.current.length - 1);
      return;
    }

    const nextIdx = inputIdx + 1;
    if (nextIdx >= patternRef.current.length) {
      setPhase('showing');
      await new Promise(r => setTimeout(r, 500));
      await nextRound();
    } else {
      setInputIdx(nextIdx);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== 'input') return;
      if (e.key >= '1' && e.key <= '4') {
        tapColor(parseInt(e.key) - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Short Stack Memory</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Watch the pattern, then tap it back!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {(phase === 'showing' || phase === 'input') && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
            <div>
              <span className="text-pancake-medium">Round: </span>
              <span className="font-bold text-pancake-brown text-lg">{round}</span>
            </div>
            <div className="text-pancake-medium text-xs">
              {phase === 'showing' ? 'Watch...' : `Step ${inputIdx + 1}/${pattern.length}`}
            </div>
          </div>
        )}

        <div className="p-6 flex flex-col items-center" style={{ background: 'linear-gradient(180deg, #FFF9E6 0%, #FFF0DB 100%)' }}>
          {(phase === 'showing' || phase === 'input') && (
            <div className="grid grid-cols-2 gap-4">
              {COLORS.map(c => {
                const active = flashId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => tapColor(c.id)}
                    disabled={phase !== 'input'}
                    className="rounded-full border-0 cursor-pointer flex items-center justify-center font-bold text-white text-lg transition-all duration-100 disabled:cursor-default"
                    style={{
                      width: 120, height: 120,
                      background: active ? c.glow : c.bg,
                      boxShadow: active
                        ? `0 0 30px ${c.glow}, inset 0 -6px 12px rgba(0,0,0,0.15)`
                        : 'inset 0 -6px 12px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.15)',
                      transform: active ? 'scale(1.05)' : 'scale(1)',
                      opacity: phase !== 'input' && !active ? 0.75 : 1,
                    }}
                  >
                    🥞
                  </button>
                );
              })}
            </div>
          )}

          {phase === 'ready' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-5xl mb-2">🥞</div>
              <div className="text-lg font-bold text-pancake-brown">Short Stack Memory</div>
              <p className="text-xs text-pancake-medium px-6 mt-1 mb-3">
                Watch the colored pancakes flash, then tap them back in the same order. Patterns get longer each round.
              </p>
              <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                Tap to Start
              </button>
              {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore} steps</p>}
            </div>
          )}

          {phase === 'result' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-4xl mb-1">{(pattern.length - 1) >= highScore && pattern.length > 1 ? '🏆' : '🥞'}</div>
              <div className="text-base font-bold text-pancake-brown">
                {(pattern.length - 1) >= highScore && pattern.length > 1 ? 'New Record!' : 'Oops, wrong pancake!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold my-1">{pattern.length - 1}</div>
              <p className="text-xs text-pancake-medium mb-3">steps recalled</p>
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

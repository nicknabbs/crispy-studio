import { useState, useEffect, useRef, useCallback } from 'react';

interface BerryGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

interface Berry {
  id: number;
  x: number;
  y: number;
  rotten: boolean;
  speed: number;
}

const WIDTH = 320;
const HEIGHT = 380;
const BERRY_SIZE = 44;
const CATCH_Y = HEIGHT - 70;
const START_LIVES = 3;

export function BerryGame({ onBack, onScore }: BerryGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'result'>('ready');
  const [berries, setBerries] = useState<Berry[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-berry-high');
    return saved ? parseInt(saved) : 0;
  });

  const nextIdRef = useRef(0);
  const livesRef = useRef(START_LIVES);
  const scoreRef = useRef(0);
  const spawnRateRef = useRef(1100);
  const fallSpeedRef = useRef(1.6);

  const endGame = useCallback(() => {
    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('pancake-berry-high', String(finalScore));
      onScore?.('berry', finalScore);
    }
    setGameState('result');
  }, [highScore, onScore]);

  const startGame = useCallback(() => {
    setBerries([]);
    setScore(0);
    setLives(START_LIVES);
    setCombo(0);
    nextIdRef.current = 0;
    livesRef.current = START_LIVES;
    scoreRef.current = 0;
    spawnRateRef.current = 1100;
    fallSpeedRef.current = 1.6;
    setGameState('playing');
  }, []);

  // Spawn berries
  useEffect(() => {
    if (gameState !== 'playing') return;
    let alive = true;
    const spawn = () => {
      if (!alive) return;
      const id = nextIdRef.current++;
      const allGood = localStorage.getItem('pancake-hack-berry-allgood') === 'true';
      const rotten = !allGood && Math.random() < 0.55;
      const berry: Berry = {
        id,
        x: 20 + Math.random() * (WIDTH - 40 - BERRY_SIZE),
        y: -BERRY_SIZE,
        rotten,
        speed: fallSpeedRef.current + Math.random() * 0.6,
      };
      setBerries(prev => [...prev, berry]);
      spawnRateRef.current = Math.max(450, spawnRateRef.current - 18);
      fallSpeedRef.current = Math.min(4.5, fallSpeedRef.current + 0.04);
      setTimeout(spawn, spawnRateRef.current);
    };
    const t = setTimeout(spawn, 500);
    return () => { alive = false; clearTimeout(t); };
  }, [gameState]);

  // Fall loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    let raf = 0;
    const tick = () => {
      setBerries(prev => {
        const next: Berry[] = [];
        let livesLost = 0;
        for (const b of prev) {
          const ny = b.y + b.speed;
          if (ny > HEIGHT) {
            // Missed: rotten reaching ground is fine, good berry lost = life
            if (!b.rotten) livesLost++;
            continue;
          }
          next.push({ ...b, y: ny });
        }
        if (livesLost > 0) {
          livesRef.current -= livesLost;
          setLives(livesRef.current);
          setCombo(0);
          if (livesRef.current <= 0) {
            setTimeout(endGame, 0);
          }
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gameState, endGame]);

  const tapBerry = (id: number) => {
    if (gameState !== 'playing') return;
    setBerries(prev => {
      const hit = prev.find(b => b.id === id);
      if (!hit) return prev;
      if (hit.rotten) {
        // Tapped rotten = bad, lose a life
        livesRef.current -= 1;
        setLives(livesRef.current);
        setCombo(0);
        if (livesRef.current <= 0) setTimeout(endGame, 0);
      } else {
        // Tapped good = +1 score + combo
        setCombo(c => {
          const nc = c + 1;
          const gain = 1 + Math.floor(nc / 5);
          scoreRef.current += gain;
          setScore(scoreRef.current);
          return nc;
        });
      }
      return prev.filter(b => b.id !== id);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Blueberry Sort</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Tap the good berries, let rotten ones fall!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {gameState === 'playing' && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
            <div>
              <span className="text-pancake-medium">Score: </span>
              <span className="font-bold text-pancake-brown text-lg">{score}</span>
              {combo >= 3 && <span className="ml-2 text-xs text-pancake-gold font-bold">x{1 + Math.floor(combo / 5)}</span>}
            </div>
            <div>
              {Array.from({ length: START_LIVES }).map((_, i) => (
                <span key={i} className="text-lg">{i < lives ? '❤️' : '🤍'}</span>
              ))}
            </div>
          </div>
        )}

        <div
          className="relative select-none overflow-hidden"
          style={{ width: '100%', height: HEIGHT, background: 'linear-gradient(180deg, #FFF9E6 0%, #FFE6B8 100%)', touchAction: 'none' }}
        >
          <div className="absolute inset-0 flex justify-center">
            <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
              {/* Catch zone guide */}
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-pancake-medium/40"
                style={{ top: CATCH_Y }}
              />
              <div className="absolute left-2 text-xs text-pancake-medium/70" style={{ top: CATCH_Y - 16 }}>
                ↓ let rotten fall past ↓
              </div>

              {berries.map(b => (
                <button
                  key={b.id}
                  onPointerDown={e => { e.preventDefault(); tapBerry(b.id); }}
                  className="absolute cursor-pointer border-0 bg-transparent p-0 select-none"
                  style={{
                    left: b.x,
                    top: b.y,
                    width: BERRY_SIZE,
                    height: BERRY_SIZE,
                    fontSize: BERRY_SIZE - 4,
                    lineHeight: 1,
                    filter: b.rotten ? 'grayscale(0.7) brightness(0.6)' : undefined,
                    touchAction: 'none',
                  }}
                >
                  🫐
                  {b.rotten && (
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">🚫</span>
                  )}
                </button>
              ))}

              {gameState === 'ready' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
                  <div className="text-5xl mb-2">🫐</div>
                  <div className="text-lg font-bold text-pancake-brown">Blueberry Sort</div>
                  <p className="text-xs text-pancake-medium text-center px-6 mt-1 mb-3">
                    Tap the ripe blueberries. Let rotten ones (🚫) fall past!
                  </p>
                  <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                    Tap to Start
                  </button>
                  {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}</p>}
                </div>
              )}

              {gameState === 'result' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
                  <div className="text-4xl mb-1">{score >= highScore && score > 0 ? '🏆' : '🫐'}</div>
                  <div className="text-base font-bold text-pancake-brown">{score >= highScore && score > 0 ? 'New Record!' : 'Out of lives!'}</div>
                  <div className="text-3xl font-bold text-pancake-gold my-1">{score}</div>
                  <button onClick={startGame} className="mt-2 px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

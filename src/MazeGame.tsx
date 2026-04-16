import { useState, useEffect, useCallback, useRef } from 'react';

interface MazeGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

// 8-col x 10-row mazes. 0=open, 1=wall, 2=syrup, 3=burnt, 9=exit. Start is always (0,0).
const MAZES: number[][][] = [
  [
    [0,0,1,0,0,0,2,0],
    [1,0,1,0,1,1,1,0],
    [0,0,0,0,0,2,0,0],
    [0,1,1,1,1,1,1,0],
    [0,0,2,0,3,0,0,0],
    [1,1,1,0,1,0,1,1],
    [0,0,0,0,1,0,2,0],
    [0,1,1,1,1,0,1,0],
    [0,2,0,0,0,0,0,0],
    [0,1,1,1,3,1,1,9],
  ],
  [
    [0,0,0,0,2,0,0,0],
    [1,1,1,0,1,1,1,0],
    [2,0,0,0,0,0,0,0],
    [0,1,1,3,1,1,1,1],
    [0,0,2,0,0,0,0,0],
    [1,1,1,1,1,1,3,0],
    [0,0,0,0,0,0,1,0],
    [0,1,1,1,1,0,1,2],
    [0,0,0,2,1,0,0,0],
    [1,1,0,1,1,1,1,9],
  ],
  [
    [0,1,0,0,2,0,0,0],
    [0,1,0,1,1,1,1,0],
    [0,0,0,0,2,0,0,0],
    [1,1,1,0,1,1,1,3],
    [2,0,0,0,0,0,0,0],
    [0,1,0,1,3,1,1,1],
    [0,1,0,1,0,0,2,0],
    [0,0,0,1,0,1,1,0],
    [1,1,0,0,0,0,0,0],
    [0,0,0,1,1,1,0,9],
  ],
];

const TIME_LIMIT = 30;
const CELL = 30;

export function MazeGame({ onBack, onScore }: MazeGameProps) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [grid, setGrid] = useState<number[][]>(MAZES[0].map(r => [...r]));
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [time, setTime] = useState(TIME_LIMIT);
  const [syrupCollected, setSyrupCollected] = useState(0);
  const [finishedScore, setFinishedScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-maze-high');
    return saved ? parseInt(saved) : 0;
  });

  const posRef = useRef({ r: 0, c: 0 });
  const gridRef = useRef<number[][]>([]);
  const syrupRef = useRef(0);
  const timeRef = useRef(TIME_LIMIT);
  const phaseRef = useRef<'ready' | 'playing' | 'result'>('ready');
  const holdTimerRef = useRef<number | null>(null);

  const endGame = useCallback((reachedExit: boolean) => {
    const timeBonus = reachedExit ? Math.round(timeRef.current * 3) : 0;
    const score = syrupRef.current * 10 + timeBonus;
    setFinishedScore(score);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('pancake-maze-high', String(score));
      onScore?.('maze', score);
    }
    phaseRef.current = 'result';
    setPhase('result');
  }, [highScore, onScore]);

  const startGame = useCallback(() => {
    const pick = MAZES[Math.floor(Math.random() * MAZES.length)];
    const fresh = pick.map(r => [...r]);
    gridRef.current = fresh;
    setGrid(fresh);
    setPos({ r: 0, c: 0 });
    posRef.current = { r: 0, c: 0 };
    setTime(TIME_LIMIT);
    timeRef.current = TIME_LIMIT;
    setSyrupCollected(0);
    syrupRef.current = 0;
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  const move = useCallback((dr: number, dc: number) => {
    if (phaseRef.current !== 'playing') return;
    const { r, c } = posRef.current;
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= 10 || nc < 0 || nc >= 8) return;
    const cell = gridRef.current[nr][nc];
    if (cell === 1) return; // wall
    posRef.current = { r: nr, c: nc };
    setPos({ r: nr, c: nc });
    if (cell === 2) {
      syrupRef.current += 1;
      setSyrupCollected(syrupRef.current);
      gridRef.current[nr][nc] = 0;
      setGrid(gridRef.current.map(row => [...row]));
    } else if (cell === 3) {
      timeRef.current = Math.max(0, timeRef.current - 5);
      setTime(timeRef.current);
      gridRef.current[nr][nc] = 0;
      setGrid(gridRef.current.map(row => [...row]));
    } else if (cell === 9) {
      endGame(true);
    }
  }, [endGame]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      timeRef.current = Math.max(0, timeRef.current - 0.1);
      setTime(Math.round(timeRef.current * 10) / 10);
      if (timeRef.current <= 0 && phaseRef.current === 'playing') {
        endGame(false);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, endGame]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return;
      if (e.key === 'ArrowUp') { e.preventDefault(); move(-1, 0); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(1, 0); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); move(0, -1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); move(0, 1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move]);

  // Press-and-hold movement
  const startHold = useCallback((dr: number, dc: number) => {
    move(dr, dc);
    if (holdTimerRef.current !== null) window.clearInterval(holdTimerRef.current);
    holdTimerRef.current = window.setInterval(() => move(dr, dc), 130);
  }, [move]);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const stop = () => stopHold();
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      stopHold();
    };
  }, [stopHold]);

  // Swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
    if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1);
    else move(dy > 0 ? 1 : -1, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Pancake Maze Roll</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Swipe/arrow keys. Grab syrup, dodge burnt, reach 🏁!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {phase === 'playing' && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
            <div>🍯 <span className="font-bold text-pancake-brown">{syrupCollected}</span></div>
            <div className={`font-bold text-lg ${time <= 5 ? 'text-red-500 animate-pulse' : 'text-pancake-brown'}`}>
              {time.toFixed(1)}s
            </div>
          </div>
        )}

        <div className="p-4 flex flex-col items-center" style={{ background: 'linear-gradient(180deg, #FFF9E6 0%, #FFF0DB 100%)' }}>
          {phase === 'playing' && (
            <>
              <div
                className="relative rounded-lg overflow-hidden"
                style={{ width: 8 * CELL, height: 10 * CELL, touchAction: 'none' }}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {grid.map((row, r) => row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: c * CELL, top: r * CELL, width: CELL, height: CELL,
                      background: cell === 1 ? '#5C3A10' : '#FFF9E6',
                      border: '1px solid rgba(92,58,16,0.08)',
                      fontSize: 16,
                    }}
                  >
                    {cell === 2 && '🍯'}
                    {cell === 3 && '🔥'}
                    {cell === 9 && '🏁'}
                  </div>
                )))}
                {/* Player */}
                <div
                  className="absolute rounded-full transition-all duration-75"
                  style={{
                    left: pos.c * CELL + 3,
                    top: pos.r * CELL + 3,
                    width: CELL - 6,
                    height: CELL - 6,
                    background: 'radial-gradient(ellipse at 40% 35%, #F5C864 0%, #D4A030 50%, #B8860B 100%)',
                    boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(139,105,20,0.4)',
                  }}
                />
              </div>

              {/* Mobile d-pad — press and hold to keep moving */}
              <div className="mt-3 grid grid-cols-3 gap-1" style={{ width: 180, touchAction: 'none' }}>
                <div />
                <button
                  onPointerDown={e => { e.preventDefault(); startHold(-1, 0); }}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  className="py-2 rounded bg-pancake-gold text-pancake-brown font-bold border-0 cursor-pointer select-none"
                >↑</button>
                <div />
                <button
                  onPointerDown={e => { e.preventDefault(); startHold(0, -1); }}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  className="py-2 rounded bg-pancake-gold text-pancake-brown font-bold border-0 cursor-pointer select-none"
                >←</button>
                <button
                  onPointerDown={e => { e.preventDefault(); startHold(1, 0); }}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  className="py-2 rounded bg-pancake-gold text-pancake-brown font-bold border-0 cursor-pointer select-none"
                >↓</button>
                <button
                  onPointerDown={e => { e.preventDefault(); startHold(0, 1); }}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  className="py-2 rounded bg-pancake-gold text-pancake-brown font-bold border-0 cursor-pointer select-none"
                >→</button>
              </div>
            </>
          )}

          {phase === 'ready' && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="text-5xl mb-2">🥞</div>
              <div className="text-lg font-bold text-pancake-brown">Pancake Maze Roll</div>
              <p className="text-xs text-pancake-medium px-6 mt-1 mb-3">
                Roll through the maze, collect 🍯, avoid 🔥 (−5s), reach 🏁 before time runs out.
              </p>
              <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                Tap to Start
              </button>
              {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}</p>}
            </div>
          )}

          {phase === 'result' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-4xl mb-1">{finishedScore >= highScore && finishedScore > 0 ? '🏆' : '🥞'}</div>
              <div className="text-base font-bold text-pancake-brown">
                {finishedScore >= highScore && finishedScore > 0 ? 'New Record!' : time <= 0 ? 'Time up!' : 'Made it!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold my-1">{finishedScore}</div>
              <p className="text-xs text-pancake-medium mb-3">{syrupCollected} syrup × 10 + time bonus</p>
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

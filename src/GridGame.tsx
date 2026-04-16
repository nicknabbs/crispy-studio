import { useState, useEffect, useCallback, useRef } from 'react';

interface GridGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

const COLS = 6;
const ROWS = 10;
const CELL = 32;

type Cell = 0 | 1;

// Simple pancake-shaped pieces (array of [r,c] offsets from top-left)
const PIECES: { name: string; cells: [number, number][] }[] = [
  { name: 'square', cells: [[0,0],[0,1],[1,0],[1,1]] },
  { name: 'L', cells: [[0,0],[1,0],[2,0],[2,1]] },
  { name: 'line', cells: [[0,0],[0,1],[0,2],[0,3]] },
  { name: 'T', cells: [[0,0],[0,1],[0,2],[1,1]] },
  { name: 'S', cells: [[0,1],[0,2],[1,0],[1,1]] },
];

function pieceWidth(cells: [number, number][]): number {
  return Math.max(...cells.map(c => c[1])) + 1;
}

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0)) as Cell[][];
}

function collides(board: Cell[][], cells: [number,number][], r: number, c: number): boolean {
  for (const [dr, dc] of cells) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return true;
    if (board[nr][nc]) return true;
  }
  return false;
}

function place(board: Cell[][], cells: [number,number][], r: number, c: number): Cell[][] {
  const next = board.map(row => [...row]);
  for (const [dr, dc] of cells) next[r + dr][c + dc] = 1;
  return next;
}

function clearRows(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const kept = board.filter(row => !row.every(c => c === 1));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(0) as Cell[]);
  return { board: kept, cleared };
}

type Phase = 'ready' | 'playing' | 'result';

export function GridGame({ onBack, onScore }: GridGameProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [board, setBoard] = useState<Cell[][]>(emptyBoard());
  const [piece, setPiece] = useState(PIECES[0]);
  const [pieceR, setPieceR] = useState(0);
  const [pieceC, setPieceC] = useState(2);
  const [score, setScore] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-grid-high');
    return saved ? parseInt(saved) : 0;
  });

  const boardRef = useRef<Cell[][]>(emptyBoard());
  const pieceRef = useRef(PIECES[0]);
  const posRef = useRef({ r: 0, c: 2 });
  const scoreRef = useRef(0);
  const placedRef = useRef(0);
  const phaseRef = useRef<Phase>('ready');

  const spawnPiece = useCallback(() => {
    const p = PIECES[Math.floor(Math.random() * PIECES.length)];
    pieceRef.current = p;
    setPiece(p);
    const startC = Math.max(0, Math.floor((COLS - pieceWidth(p.cells)) / 2));
    posRef.current = { r: 0, c: startC };
    setPieceR(0);
    setPieceC(startC);
    if (collides(boardRef.current, p.cells, 0, startC)) {
      const final = scoreRef.current;
      if (final > highScore) {
        setHighScore(final);
        localStorage.setItem('pancake-grid-high', String(final));
        onScore?.('grid', final);
      }
      phaseRef.current = 'result';
      setPhase('result');
    }
  }, [highScore, onScore]);

  const startGame = useCallback(() => {
    const fresh = emptyBoard();
    boardRef.current = fresh;
    setBoard(fresh);
    scoreRef.current = 0;
    placedRef.current = 0;
    setScore(0);
    setPlaced(0);
    phaseRef.current = 'playing';
    setPhase('playing');
    spawnPiece();
  }, [spawnPiece]);

  const dropStep = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const { r, c } = posRef.current;
    const p = pieceRef.current;
    if (!collides(boardRef.current, p.cells, r + 1, c)) {
      posRef.current = { r: r + 1, c };
      setPieceR(r + 1);
      return;
    }
    // Land
    const landed = place(boardRef.current, p.cells, r, c);
    const { board: cleared, cleared: n } = clearRows(landed);
    boardRef.current = cleared;
    setBoard(cleared);
    placedRef.current += 1;
    scoreRef.current += 1 + n * 10;
    setPlaced(placedRef.current);
    setScore(scoreRef.current);
    spawnPiece();
  }, [spawnPiece]);

  // Auto-drop every 700ms (2000ms with hack)
  useEffect(() => {
    if (phase !== 'playing') return;
    const slow = localStorage.getItem('pancake-hack-grid-ghost') === 'true';
    const id = setInterval(() => dropStep(), slow ? 2000 : 700);
    return () => clearInterval(id);
  }, [phase, dropStep]);

  const tryMove = (dc: number) => {
    if (phaseRef.current !== 'playing') return;
    const { r, c } = posRef.current;
    if (!collides(boardRef.current, pieceRef.current.cells, r, c + dc)) {
      posRef.current = { r, c: c + dc };
      setPieceC(c + dc);
    }
  };

  const softDrop = () => {
    if (phaseRef.current !== 'playing') return;
    // Drop all the way
    const p = pieceRef.current;
    let { r, c } = posRef.current;
    while (!collides(boardRef.current, p.cells, r + 1, c)) r++;
    posRef.current = { r, c };
    setPieceR(r);
    dropStep();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); tryMove(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); tryMove(1); }
      else if (e.key === 'ArrowDown' || e.code === 'Space') { e.preventDefault(); softDrop(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Composite rendering: board + piece overlay
  const activeCells = new Set(piece.cells.map(([dr, dc]) => `${pieceR + dr}-${pieceC + dc}`));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Griddle Grid Puzzle</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Fit pancakes, clear rows!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {phase === 'playing' && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
            <div>
              <span className="text-pancake-medium">Score: </span>
              <span className="font-bold text-pancake-brown text-lg">{score}</span>
            </div>
            <div>
              <span className="text-pancake-medium">Placed: </span>
              <span className="font-bold text-pancake-brown">{placed}</span>
            </div>
          </div>
        )}

        <div className="p-4 flex flex-col items-center" style={{ background: 'linear-gradient(180deg, #FFF9E6 0%, #FFF0DB 100%)' }}>
          {phase === 'playing' && (
            <>
              <div
                className="relative rounded-lg overflow-hidden"
                style={{ width: COLS * CELL, height: ROWS * CELL, background: '#2b2b2b' }}
              >
                {board.map((row, r) => row.map((c, ci) => {
                  const key = `${r}-${ci}`;
                  const isActive = activeCells.has(key);
                  const filled = c === 1 || isActive;
                  return (
                    <div
                      key={key}
                      className="absolute"
                      style={{
                        left: ci * CELL, top: r * CELL, width: CELL, height: CELL,
                        padding: 2,
                      }}
                    >
                      {filled && (
                        <div
                          className="w-full h-full rounded"
                          style={{
                            background: isActive
                              ? 'radial-gradient(ellipse at 40% 35%, #F5C864 0%, #D4A030 50%, #B8860B 100%)'
                              : 'radial-gradient(ellipse at 40% 35%, #E0B050 0%, #B88820 50%, #8B6914 100%)',
                            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2)',
                          }}
                        />
                      )}
                    </div>
                  );
                }))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1" style={{ width: 240 }}>
                <button onClick={() => tryMove(-1)} className="py-3 rounded bg-pancake-gold text-pancake-brown font-bold border-0 cursor-pointer">←</button>
                <button onClick={softDrop} className="py-3 rounded bg-pancake-brown text-pancake-cream font-bold border-0 cursor-pointer">DROP</button>
                <button onClick={() => tryMove(1)} className="py-3 rounded bg-pancake-gold text-pancake-brown font-bold border-0 cursor-pointer">→</button>
              </div>
            </>
          )}

          {phase === 'ready' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-5xl mb-2">🥞</div>
              <div className="text-lg font-bold text-pancake-brown">Griddle Grid Puzzle</div>
              <p className="text-xs text-pancake-medium px-6 mt-1 mb-3">
                Arrange falling pancake shapes on the griddle. Clear full rows for bonus points!
              </p>
              <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                Tap to Start
              </button>
              {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}</p>}
            </div>
          )}

          {phase === 'result' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-4xl mb-1">{score >= highScore && score > 0 ? '🏆' : '🥞'}</div>
              <div className="text-base font-bold text-pancake-brown">
                {score >= highScore && score > 0 ? 'New Record!' : 'Griddle full!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold my-1">{score}</div>
              <p className="text-xs text-pancake-medium mb-3">{placed} pancakes placed</p>
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

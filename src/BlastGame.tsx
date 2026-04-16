import { useState, useEffect, useCallback, useRef } from 'react';

interface BlastGameProps {
  onBack: () => void;
  onScore?: (gameId: string, score: number) => void;
}

const GRID = 8;
const CELL = 34;

type Cell = 0 | 1;
type Shape = [number, number][];

// Pool of block shapes — Block Blast-style: small, varied, no rotation needed in play
const SHAPES: { name: string; cells: Shape }[] = [
  { name: '1',       cells: [[0,0]] },
  { name: '2h',      cells: [[0,0],[0,1]] },
  { name: '2v',      cells: [[0,0],[1,0]] },
  { name: '3h',      cells: [[0,0],[0,1],[0,2]] },
  { name: '3v',      cells: [[0,0],[1,0],[2,0]] },
  { name: '4h',      cells: [[0,0],[0,1],[0,2],[0,3]] },
  { name: '4v',      cells: [[0,0],[1,0],[2,0],[3,0]] },
  { name: '5h',      cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },
  { name: 'sq2',     cells: [[0,0],[0,1],[1,0],[1,1]] },
  { name: 'sq3',     cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]] },
  { name: 'L',       cells: [[0,0],[1,0],[2,0],[2,1]] },
  { name: 'Lmini',   cells: [[0,0],[1,0],[1,1]] },
  { name: 'Jmini',   cells: [[0,1],[1,0],[1,1]] },
  { name: 'Tmini',   cells: [[0,0],[0,1],[0,2],[1,1]] },
  { name: 'plus',    cells: [[0,1],[1,0],[1,1],[1,2],[2,1]] },
  { name: 'diag2',   cells: [[0,0],[1,1]] },
];

function emptyBoard(): Cell[][] {
  return Array.from({ length: GRID }, () => Array(GRID).fill(0) as Cell[]);
}

function fits(board: Cell[][], cells: Shape, r: number, c: number): boolean {
  for (const [dr, dc] of cells) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return false;
    if (board[nr][nc]) return false;
  }
  return true;
}

function anyFit(board: Cell[][], cells: Shape): boolean {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (fits(board, cells, r, c)) return true;
    }
  }
  return false;
}

function place(board: Cell[][], cells: Shape, r: number, c: number): Cell[][] {
  const next = board.map(row => [...row]);
  for (const [dr, dc] of cells) next[r + dr][c + dc] = 1;
  return next;
}

function clearLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const fullRows = new Set<number>();
  const fullCols = new Set<number>();
  for (let r = 0; r < GRID; r++) if (board[r].every(c => c === 1)) fullRows.add(r);
  for (let c = 0; c < GRID; c++) {
    let all = true;
    for (let r = 0; r < GRID; r++) if (board[r][c] === 0) { all = false; break; }
    if (all) fullCols.add(c);
  }
  const cleared = fullRows.size + fullCols.size;
  if (cleared === 0) return { board, cleared: 0 };
  const next = board.map(row => [...row]);
  for (const r of fullRows) for (let c = 0; c < GRID; c++) next[r][c] = 0;
  for (const c of fullCols) for (let r = 0; r < GRID; r++) next[r][c] = 0;
  return { board: next, cleared };
}

function pickThree(): (typeof SHAPES[number])[] {
  return [0, 1, 2].map(() => SHAPES[Math.floor(Math.random() * SHAPES.length)]);
}

type Phase = 'ready' | 'playing' | 'result';

export function BlastGame({ onBack, onScore }: BlastGameProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [board, setBoard] = useState<Cell[][]>(emptyBoard());
  const [tray, setTray] = useState<(typeof SHAPES[number] | null)[]>([null, null, null]);
  const [activeTrayIdx, setActiveTrayIdx] = useState<number | null>(null);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-blast-high');
    return saved ? parseInt(saved) : 0;
  });

  const boardRef = useRef<Cell[][]>(emptyBoard());
  const trayRef = useRef<(typeof SHAPES[number] | null)[]>([null, null, null]);
  const scoreRef = useRef(0);
  const phaseRef = useRef<Phase>('ready');

  const endGame = useCallback(() => {
    const final = scoreRef.current;
    if (final > highScore) {
      setHighScore(final);
      localStorage.setItem('pancake-blast-high', String(final));
      onScore?.('blast', final);
    }
    phaseRef.current = 'result';
    setPhase('result');
  }, [highScore, onScore]);

  const refillIfEmpty = useCallback(() => {
    const t = trayRef.current;
    if (t.every(p => p === null)) {
      const fresh = pickThree();
      trayRef.current = fresh;
      setTray(fresh);
    }
  }, []);

  const checkGameOver = useCallback(() => {
    const t = trayRef.current;
    const remaining = t.filter((p): p is typeof SHAPES[number] => p !== null);
    if (remaining.length === 0) return false; // will refill
    const canPlay = remaining.some(p => anyFit(boardRef.current, p.cells));
    if (!canPlay) {
      endGame();
      return true;
    }
    return false;
  }, [endGame]);

  const startGame = useCallback(() => {
    const fresh = emptyBoard();
    boardRef.current = fresh;
    setBoard(fresh);
    scoreRef.current = 0;
    setScore(0);
    setCombo(0);
    setActiveTrayIdx(null);
    setHover(null);
    const initial = pickThree();
    trayRef.current = initial;
    setTray(initial);
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  const tryPlace = (r: number, c: number) => {
    if (phaseRef.current !== 'playing') return;
    if (activeTrayIdx === null) return;
    const piece = trayRef.current[activeTrayIdx];
    if (!piece) return;
    if (!fits(boardRef.current, piece.cells, r, c)) return;
    const afterPlace = place(boardRef.current, piece.cells, r, c);
    const { board: afterClear, cleared } = clearLines(afterPlace);
    boardRef.current = afterClear;
    setBoard(afterClear);
    const gain = piece.cells.length + cleared * 20 + (cleared >= 2 ? 20 : 0);
    scoreRef.current += gain;
    setScore(scoreRef.current);
    setCombo(cleared > 0 ? cleared : 0);

    // remove piece from tray
    const newTray = [...trayRef.current];
    newTray[activeTrayIdx] = null;
    trayRef.current = newTray;
    setTray(newTray);
    setActiveTrayIdx(null);
    setHover(null);

    refillIfEmpty();
    setTimeout(checkGameOver, 0);
  };

  // When tray is all null, refill happens. Re-check game over after refill.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (trayRef.current.every(p => p !== null)) {
      checkGameOver();
    }
  }, [tray, phase, checkGameOver]);

  const canPlaceHere =
    activeTrayIdx !== null && hover !== null
      ? fits(boardRef.current, trayRef.current[activeTrayIdx]!.cells, hover.r, hover.c)
      : false;

  const previewCells = new Set<string>();
  if (activeTrayIdx !== null && hover !== null) {
    const piece = trayRef.current[activeTrayIdx];
    if (piece) {
      for (const [dr, dc] of piece.cells) {
        const nr = hover.r + dr, nc = hover.c + dc;
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) previewCells.add(`${nr}-${nc}`);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Pancake Blast</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Place pancake pieces, clear rows or columns!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {phase === 'playing' && (
          <div className="px-4 py-2 bg-pancake-warm border-b border-shop-border/20 flex justify-between items-center text-sm">
            <div>
              <span className="text-pancake-medium">Score: </span>
              <span className="font-bold text-pancake-brown text-lg">{score}</span>
            </div>
            {combo > 0 && <div className="text-xs font-bold text-pancake-gold">+{combo} line{combo > 1 ? 's' : ''} cleared!</div>}
          </div>
        )}

        <div className="p-4 flex flex-col items-center gap-4" style={{ background: 'linear-gradient(180deg, #FFF9E6 0%, #FFF0DB 100%)' }}>
          {phase === 'playing' && (
            <>
              {/* Grid */}
              <div
                className="relative rounded-lg overflow-hidden"
                style={{ width: GRID * CELL, height: GRID * CELL, background: '#2b2b2b', touchAction: 'none' }}
              >
                {Array.from({ length: GRID }).map((_, r) => (
                  Array.from({ length: GRID }).map((_, c) => {
                    const key = `${r}-${c}`;
                    const filled = board[r][c] === 1;
                    const preview = previewCells.has(key);
                    return (
                      <div
                        key={key}
                        onPointerEnter={() => activeTrayIdx !== null && setHover({ r, c })}
                        onPointerDown={() => {
                          if (activeTrayIdx !== null) {
                            setHover({ r, c });
                            tryPlace(r, c);
                          }
                        }}
                        className="absolute cursor-pointer"
                        style={{
                          left: c * CELL, top: r * CELL, width: CELL, height: CELL,
                          padding: 2,
                          background: (r + c) % 2 === 0 ? '#333' : '#2b2b2b',
                        }}
                      >
                        {filled && (
                          <div className="w-full h-full rounded" style={{
                            background: 'radial-gradient(ellipse at 40% 35%, #E0B050 0%, #B88820 50%, #8B6914 100%)',
                            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2)',
                          }} />
                        )}
                        {!filled && preview && (
                          <div className="w-full h-full rounded" style={{
                            background: canPlaceHere
                              ? 'radial-gradient(ellipse at 40% 35%, rgba(245,200,100,0.5) 0%, rgba(184,136,32,0.35) 100%)'
                              : 'rgba(255,80,80,0.35)',
                          }} />
                        )}
                      </div>
                    );
                  })
                ))}
              </div>

              {/* Tray */}
              <div className="flex gap-3 items-center">
                {tray.map((piece, i) => (
                  <button
                    key={i}
                    onClick={() => piece && setActiveTrayIdx(activeTrayIdx === i ? null : i)}
                    disabled={!piece}
                    className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                      activeTrayIdx === i
                        ? 'border-pancake-gold bg-pancake-gold/30 scale-105'
                        : 'border-pancake-medium bg-pancake-warm hover:bg-pancake-light/30'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                    style={{ width: 90, height: 90 }}
                  >
                    {piece && <PiecePreview cells={piece.cells} />}
                  </button>
                ))}
              </div>

              <p className="text-xs text-pancake-medium text-center">
                Tap a piece to pick it, then tap the grid to drop it.
              </p>
            </>
          )}

          {phase === 'ready' && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="text-5xl mb-2">🧱</div>
              <div className="text-lg font-bold text-pancake-brown">Pancake Blast</div>
              <p className="text-xs text-pancake-medium px-6 mt-1 mb-3">
                Place pancake pieces on the 8×8 grid. Fill a row OR column to clear it! Game ends when no piece fits.
              </p>
              <button onClick={startGame} className="px-6 py-2 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm cursor-pointer border-0">
                Tap to Start
              </button>
              {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}</p>}
            </div>
          )}

          {phase === 'result' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-4xl mb-1">{score >= highScore && score > 0 ? '🏆' : '🧱'}</div>
              <div className="text-base font-bold text-pancake-brown">
                {score >= highScore && score > 0 ? 'New Record!' : 'No room left!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold my-1">{score}</div>
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

function PiecePreview({ cells }: { cells: Shape }) {
  const rows = Math.max(...cells.map(c => c[0])) + 1;
  const cols = Math.max(...cells.map(c => c[1])) + 1;
  const size = Math.min(70 / Math.max(rows, cols), 16);
  const set = new Set(cells.map(([r, c]) => `${r}-${c}`));
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${size}px)`,
          gridTemplateRows: `repeat(${rows}, ${size}px)`,
          gap: 2,
        }}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <div
              key={`${r}-${c}`}
              style={{
                width: size, height: size,
                background: set.has(`${r}-${c}`)
                  ? 'radial-gradient(ellipse at 40% 35%, #F5C864 0%, #D4A030 60%, #B8860B 100%)'
                  : 'transparent',
                borderRadius: 3,
                boxShadow: set.has(`${r}-${c}`) ? 'inset 0 -1px 2px rgba(0,0,0,0.2)' : undefined,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

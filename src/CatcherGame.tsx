import { useState, useEffect, useRef, useCallback } from 'react';

interface CatcherGameProps {
  onBack: () => void;
}

interface Drop {
  id: number;
  x: number;      // 0-100 percent
  y: number;      // pixels from top
  type: 'batter' | 'burnt' | 'golden';
  caught?: boolean;
}

const GAME_W_MAX = 320;
const GAME_H = 400;
const PAN_W = 60;
const PAN_Y = GAME_H - 40;
const DROP_SIZE = 24;

export function CatcherGame({ onBack }: CatcherGameProps) {
  const [gameW, setGameW] = useState(GAME_W_MAX);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'over'>('ready');
  const [panX, setPanX] = useState(gameW / 2 - PAN_W / 2);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('pancake-catcher-high');
    return saved ? parseInt(saved) : 0;
  });
  const [lastCatch, setLastCatch] = useState<{ text: string; color: string } | null>(null);

  const gameWRef = useRef(GAME_W_MAX);
  const panXRef = useRef(gameW / 2 - PAN_W / 2);
  const dropsRef = useRef<Drop[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(5);
  const comboRef = useRef(0);
  const nextIdRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const levelRef = useRef(1);

  // Measure container width for responsive sizing
  useEffect(() => {
    const measure = () => {
      if (gameAreaRef.current) {
        const w = gameAreaRef.current.clientWidth;
        gameWRef.current = w;
        setGameW(w);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const startGame = useCallback(() => {
    const w = gameWRef.current;
    setPanX(w / 2 - PAN_W / 2);
    panXRef.current = w / 2 - PAN_W / 2;
    setDrops([]);
    dropsRef.current = [];
    setScore(0);
    scoreRef.current = 0;
    setLives(5);
    livesRef.current = 5;
    setCombo(0);
    comboRef.current = 0;
    setLevel(1);
    levelRef.current = 1;
    nextIdRef.current = 0;
    setLastCatch(null);
    setGameState('playing');
  }, []);

  // Mouse/touch tracking — listen on window so the pan follows even if cursor leaves the game area
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleMove = (clientX: number) => {
      if (!gameAreaRef.current) return;
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = clientX - rect.left - PAN_W / 2;
      const clamped = Math.max(0, Math.min(gameWRef.current - PAN_W, x));
      panXRef.current = clamped;
      setPanX(clamped);
    };

    const onMouse = (e: MouseEvent) => handleMove(e.clientX);
    const onTouch = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX); };

    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: false });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [gameState]);

  // Spawn drops
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawn = () => {
      const types: Drop['type'][] = ['batter', 'batter', 'batter', 'batter', 'golden', 'burnt'];
      if (levelRef.current > 3) types.push('burnt');
      if (levelRef.current > 6) types.push('burnt');
      const type = types[Math.floor(Math.random() * types.length)];
      const drop: Drop = {
        id: nextIdRef.current++,
        x: 10 + Math.random() * 80,
        y: -DROP_SIZE,
        type,
      };
      dropsRef.current = [...dropsRef.current, drop];
      setDrops([...dropsRef.current]);

      const interval = Math.max(350, 1400 - levelRef.current * 80);
      spawnTimerRef.current = setTimeout(spawn, interval + Math.random() * 400);
    };

    spawnTimerRef.current = setTimeout(spawn, 1200);
    return () => { if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current); };
  }, [gameState]);

  // Game loop — move drops, check collisions
  useEffect(() => {
    if (gameState !== 'playing') return;

    let lastTime = performance.now();
    const fallSpeed = () => 70 + levelRef.current * 20; // pixels/sec — starts slow, ramps up fast

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      let changed = false;
      let newDrops = dropsRef.current.map(d => {
        if (d.caught) return d;
        const newY = d.y + fallSpeed() * dt;

        // Check catch — is it at pan level?
        const dropCenterX = (d.x / 100) * gameWRef.current;
        const panLeft = panXRef.current;
        const panRight = panXRef.current + PAN_W;

        if (newY >= PAN_Y - DROP_SIZE && newY <= PAN_Y && !d.caught) {
          if (dropCenterX >= panLeft - 5 && dropCenterX <= panRight + 5) {
            changed = true;
            if (d.type === 'burnt') {
              livesRef.current -= 1;
              comboRef.current = 0;
              setLives(livesRef.current);
              setCombo(0);
              setLastCatch({ text: 'Burnt! -1 ❤️', color: 'text-red-400' });
              setTimeout(() => setLastCatch(null), 600);
            } else {
              const pts = d.type === 'golden' ? 25 + comboRef.current * 5 : 5 + comboRef.current * 2;
              scoreRef.current += pts;
              comboRef.current += 1;
              setScore(scoreRef.current);
              setCombo(comboRef.current);
              if (d.type === 'golden') {
                setLastCatch({ text: `⭐ +${pts}`, color: 'text-pancake-gold' });
              } else if (comboRef.current > 2) {
                setLastCatch({ text: `+${pts} x${comboRef.current}`, color: 'text-green-400' });
              } else {
                setLastCatch({ text: `+${pts}`, color: 'text-pancake-brown' });
              }
              setTimeout(() => setLastCatch(null), 500);
            }
            return { ...d, y: newY, caught: true };
          }
        }

        // Missed — fell off screen
        if (newY > GAME_H + DROP_SIZE) {
          changed = true;
          if (d.type !== 'burnt') {
            livesRef.current -= 1;
            comboRef.current = 0;
            setLives(livesRef.current);
            setCombo(0);
            setLastCatch({ text: 'Missed!', color: 'text-red-300' });
            setTimeout(() => setLastCatch(null), 500);
          }
          return { ...d, caught: true }; // mark as done
        }

        return { ...d, y: newY };
      });

      // Remove caught/done drops
      newDrops = newDrops.filter(d => !(d.caught && d.y > GAME_H));
      dropsRef.current = newDrops;
      if (changed || true) setDrops([...newDrops]);

      // Level up every 50 points
      const newLevel = Math.floor(scoreRef.current / 50) + 1;
      if (newLevel !== levelRef.current) {
        levelRef.current = newLevel;
        setLevel(newLevel);
      }

      // Game over check
      if (livesRef.current <= 0) {
        if (scoreRef.current > highScore) {
          setHighScore(scoreRef.current);
          localStorage.setItem('pancake-catcher-high', String(scoreRef.current));
        }
        setGameState('over');
        return;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, highScore]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream p-4 border-b-2 border-shop-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pancake-brown">Batter Catcher</h2>
            <p className="text-xs text-pancake-medium mt-0.5">Catch the batter, dodge the burnt drops!</p>
          </div>
          <button onClick={onBack} className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0">✕</button>
        </div>

        {/* Score bar */}
        <div className="flex justify-between items-center px-4 py-2 bg-pancake-warm border-b border-shop-border/20 text-sm">
          <div>
            <span className="text-pancake-medium">Score: </span>
            <span className="font-bold text-pancake-brown">{score}</span>
            {combo > 1 && <span className="text-pancake-gold font-bold ml-1">x{combo}</span>}
          </div>
          <div className="text-xs text-pancake-medium">Lvl {level}</div>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`text-base ${i < lives ? '' : 'opacity-20'}`}>❤️</span>
            ))}
          </div>
        </div>

        {/* Game area */}
        <div
          ref={gameAreaRef}
          className={`relative mx-auto select-none overflow-hidden ${gameState === 'playing' ? 'cursor-none' : 'cursor-pointer'}`}
          style={{ width: '100%', maxWidth: GAME_W_MAX, height: GAME_H, background: 'linear-gradient(180deg, #FFF9E6 0%, #FFF0DB 100%)' }}
          onClick={() => {
            if (gameState === 'ready' || gameState === 'over') startGame();
          }}
        >
          {/* Catch feedback */}
          {lastCatch && gameState === 'playing' && (
            <div className={`absolute z-20 font-bold text-sm ${lastCatch.color} pointer-events-none`}
              style={{ left: panXRef.current + PAN_W / 2 - 30, top: PAN_Y - 30, width: 60, textAlign: 'center' }}>
              {lastCatch.text}
            </div>
          )}

          {/* Drops */}
          {drops.filter(d => !d.caught).map(d => (
            <div
              key={d.id}
              className="absolute pointer-events-none"
              style={{
                left: `${d.x}%`,
                top: d.y,
                transform: 'translateX(-50%)',
                fontSize: DROP_SIZE,
                filter: d.type === 'burnt' ? 'saturate(0.3) brightness(0.5)' : d.type === 'golden' ? 'brightness(1.2)' : undefined,
              }}
            >
              {d.type === 'golden' ? '⭐' : d.type === 'burnt' ? '💩' : '🥛'}
            </div>
          ))}

          {/* Pan */}
          {gameState === 'playing' && (
            <div
              className="absolute"
              style={{ left: panX, top: PAN_Y, width: PAN_W, textAlign: 'center', fontSize: 32 }}
            >
              🍳
            </div>
          )}

          {/* Start overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
              <div className="text-5xl mb-3">🍳</div>
              <div className="text-xl font-bold text-pancake-brown mb-2">Batter Catcher</div>
              <p className="text-sm text-pancake-medium mb-1 px-6 text-center">Move your mouse/finger to catch batter drops!</p>
              <p className="text-xs text-pancake-medium mb-4 px-6 text-center">Catch 🥛 batter and ⭐ golden stars. Avoid 💩 burnt drops!</p>
              <div className="px-6 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm">
                Tap to Start
              </div>
              {highScore > 0 && <p className="text-xs text-pancake-gold mt-2 font-bold">Best: {highScore}</p>}
            </div>
          )}

          {gameState === 'over' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-pancake-cream/80">
              <div className="text-4xl mb-2">{score >= highScore && score > 0 ? '🏆' : '🍳'}</div>
              <div className="text-xl font-bold text-pancake-brown mb-1">
                {score >= highScore && score > 0 ? 'New High Score!' : 'Game Over!'}
              </div>
              <div className="text-3xl font-bold text-pancake-gold mb-1">{score}</div>
              <p className="text-sm text-pancake-medium mb-4">Level {level} reached</p>
              <div className="px-6 py-3 rounded-xl bg-pancake-gold text-pancake-brown font-bold text-sm">
                Tap to Try Again
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

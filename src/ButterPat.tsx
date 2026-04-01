import { useCallback, useEffect, useRef, useState } from 'react';

export interface ButterPatEffect {
  type: 'frenzy' | 'lucky';
  label: string;
  duration?: number;
  pancakeGain?: number;
}

interface ButterPatProps {
  cps: number;
  pancakes: number;
  onCatch: (effect: ButterPatEffect) => void;
  forceSpawn?: number;
  butterSpeedPercent?: number;   // reduce spawn interval by this %
  luckyMultiplier?: number;      // multiply lucky rewards
  frenzyDurationPercent?: number; // extend frenzy duration by this %
}

const MIN_INTERVAL = 120000; // 2 minutes
const MAX_INTERVAL = 180000; // 3 minutes
const DISPLAY_DURATION = 8000;

interface Particle {
  id: number;
  emoji: string;
  x: number;   // vw start
  y: number;   // vh start
  dx: number;  // vw offset at end
  dy: number;  // vh offset at end
  rot: number; // degrees rotation
  size: number; // rem
  delay: number; // ms
}

const PANCAKE_EMOJIS = ['🥞', '🥞', '🥞', '🥞', '🥞', '🧈', '🍳', '🍯'];

export function ButterPat({ cps, pancakes, onCatch, forceSpawn, butterSpeedPercent = 0, luckyMultiplier = 1, frenzyDurationPercent = 0 }: ButterPatProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [caught, setCaught] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [rewardLabel, setRewardLabel] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const particleIdRef = useRef(0);

  const scheduleNext = useCallback(() => {
    const speedMult = Math.max(0.1, 1 - butterSpeedPercent / 100);
    const delay = (MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL)) * speedMult;
    timeoutRef.current = setTimeout(() => {
      setPosition({
        top: 10 + Math.random() * 60,
        left: 5 + Math.random() * 70,
      });
      setCaught(false);
      setVisible(true);

      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        scheduleNext();
      }, DISPLAY_DURATION);
    }, delay);
  }, [butterSpeedPercent]);

  useEffect(() => {
    scheduleNext();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [scheduleNext]);

  // Force spawn from admin panel
  const prevForceSpawn = useRef(forceSpawn);
  useEffect(() => {
    if (forceSpawn !== undefined && forceSpawn !== prevForceSpawn.current) {
      prevForceSpawn.current = forceSpawn;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setPosition({
        top: 10 + Math.random() * 60,
        left: 5 + Math.random() * 70,
      });
      setCaught(false);
      setVisible(true);
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        scheduleNext();
      }, DISPLAY_DURATION);
    }
  }, [forceSpawn, scheduleNext]);

  const spawnExplosion = useCallback((label: string) => {
    const cx = position.left + 5;
    const cy = position.top + 3;
    const count = 16 + Math.floor(Math.random() * 6);
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 15 + Math.random() * 25;
      newParticles.push({
        id: particleIdRef.current++,
        emoji: PANCAKE_EMOJIS[Math.floor(Math.random() * PANCAKE_EMOJIS.length)],
        x: cx,
        y: cy,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist * 0.7 + 20,
        rot: (Math.random() - 0.5) * 720,
        size: 1.8 + Math.random() * 1.5,
        delay: Math.random() * 120,
      });
    }
    setParticles(newParticles);
    setRewardLabel(label);
    setTimeout(() => { setParticles([]); setRewardLabel(null); }, 2200);
  }, [position]);

  const handleClick = () => {
    if (caught) return;
    setCaught(true);

    let label: string;
    if (Math.random() < 0.5) {
      const dur = Math.round(30 * (1 + frenzyDurationPercent / 100));
      label = `Butter Rush! 7x for ${dur}s!`;
      onCatch({ type: 'frenzy', label, duration: dur });
    } else {
      const baseGain = Math.max(
        Math.floor(cps * 900),
        Math.floor(pancakes * 0.15),
        100
      );
      const gain = Math.floor(baseGain * luckyMultiplier);
      label = `Lucky! +${formatGain(gain)} pancakes!`;
      onCatch({ type: 'lucky', label, pancakeGain: gain });
    }

    spawnExplosion(label);

    setTimeout(() => {
      setVisible(false);
      scheduleNext();
    }, 2200);
  };

  return (
    <>
      {/* Pancake explosion particles */}
      {particles.length > 0 && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {/* Reward label */}
          {rewardLabel && (
            <div className="absolute inset-0 flex items-center justify-center z-10 reward-label-anim">
              <div className="text-2xl md:text-3xl font-bold text-pancake-gold px-6 py-3 rounded-2xl"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 2px 4px rgba(0,0,0,0.5)',
                }}>
                {rewardLabel}
              </div>
            </div>
          )}

          {particles.map(p => (
            <div
              key={p.id}
              className="absolute pancake-particle"
              style={{
                left: `${p.x}vw`,
                top: `${p.y}vh`,
                fontSize: `${p.size}rem`,
                animationDelay: `${p.delay}ms`,
                '--dx': `${p.dx}vw`,
                '--dy': `${p.dy}vh`,
                '--rot': `${p.rot}deg`,
              } as React.CSSProperties}
            >
              {p.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Butter pat button */}
      {visible && (
        <button
          onClick={handleClick}
          className="fixed z-40 cursor-pointer border-0 bg-transparent p-0 animate-bounce"
          style={{
            top: `${position.top}%`,
            left: `${position.left}%`,
            animation: caught ? 'butter-catch 0.5s ease-out forwards' : 'butter-float 3s ease-in-out infinite, butter-shimmer 1s ease-in-out infinite',
          }}
        >
          <div className="relative">
            <svg viewBox="0 0 80 60" className="w-20 h-15 md:w-24 md:h-18 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.8))' }}>
              <rect x="8" y="8" width="64" height="44" rx="8" fill="#FFD700" />
              <rect x="11" y="11" width="58" height="38" rx="6" fill="#FFC107" />
              <rect x="11" y="11" width="58" height="38" rx="6" fill="url(#butterGradient)" />
              <rect x="18" y="18" width="20" height="4" rx="2" fill="#FFF9C4" opacity="0.7" />
              <rect x="18" y="26" width="12" height="3" rx="1.5" fill="#FFF9C4" opacity="0.5" />
              <text x="52" y="32" textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="#FFF8DC" opacity="0.9">✨</text>
              <defs>
                <radialGradient id="butterGradient" cx="30%" cy="30%">
                  <stop offset="0%" stopColor="#FFF176" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#F9A825" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </button>
      )}

      <style>{`
        @keyframes butter-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes butter-shimmer {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
        @keyframes butter-catch {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes pancake-burst {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(0.3);
            opacity: 1;
          }
          15% {
            transform: translate(calc(var(--dx) * 0.4), calc(var(--dy) * -0.15)) rotate(calc(var(--rot) * 0.3)) scale(1.3);
            opacity: 1;
          }
          40% {
            transform: translate(calc(var(--dx) * 0.75), calc(var(--dy) * 0.3)) rotate(calc(var(--rot) * 0.7)) scale(1);
            opacity: 0.9;
          }
          70% {
            transform: translate(var(--dx), calc(var(--dy) * 0.8)) rotate(var(--rot)) scale(0.7);
            opacity: 0.5;
          }
          100% {
            transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.4);
            opacity: 0;
          }
        }
        .pancake-particle {
          animation: pancake-burst 2s ease-out forwards;
          will-change: transform, opacity;
        }
        @keyframes reward-label {
          0% { opacity: 0; transform: scale(0.5); }
          10% { opacity: 1; transform: scale(1.1); }
          20% { transform: scale(1); }
          75% { opacity: 1; }
          100% { opacity: 0; transform: scale(0.9); }
        }
        .reward-label-anim {
          animation: reward-label 2.1s ease-out forwards;
        }
      `}</style>
    </>
  );
}

function formatGain(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1e6) return (n / 1e3).toFixed(1) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(1) + 'M';
  if (n < 1e12) return (n / 1e9).toFixed(1) + 'B';
  return (n / 1e12).toFixed(1) + 'T';
}

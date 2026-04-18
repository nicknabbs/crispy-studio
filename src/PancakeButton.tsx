import { useCallback, useRef, useState } from 'react';
import { DEFAULT_SKIN, renderSkinLayers, type PancakeSkin } from './skinEngine';

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
}

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
}

let particleId = 0;

export function PancakeButton({
  onClick,
  clickPower,
  frenzy,
  skin,
}: {
  onClick: () => void;
  clickPower: number;
  frenzy?: boolean;
  skin?: PancakeSkin | null;
}) {
  const [pressed, setPressed] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const activeSkin = skin ?? DEFAULT_SKIN;
  const { base, pattern, topping } = renderSkinLayers(activeSkin, 'big');

  const handleClick = useCallback((e: React.MouseEvent) => {
    onClick();

    setPressed(true);
    setTimeout(() => setPressed(false), 150);

    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const count = frenzy ? 12 : 6;
      const newParticles: Particle[] = Array.from({ length: count }, () => ({
        id: ++particleId,
        x: cx,
        y: cy,
        angle: Math.random() * 360,
        speed: (frenzy ? 60 : 40) + Math.random() * (frenzy ? 80 : 60),
      }));

      setParticles(prev => [...prev.slice(-30), ...newParticles]);
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.includes(p)));
      }, 600);

      const floatNum: FloatingNumber = {
        id: ++particleId,
        x: cx + (Math.random() - 0.5) * 30,
        y: cy - 10,
      };
      setFloats(prev => [...prev.slice(-8), floatNum]);
      setTimeout(() => {
        setFloats(prev => prev.filter(f => f !== floatNum));
      }, 800);
    }
  }, [onClick, frenzy]);

  const particleColors = frenzy
    ? ['#FFD700', '#FFC107', '#FFE082', '#FF9800']
    : [activeSkin.highlightColor, activeSkin.accentColor, '#FFE082', activeSkin.baseColor];

  const glow = activeSkin.glow;
  const frenzyShadow = 'drop-shadow(0 0 24px rgba(255, 215, 0, 0.8))';
  const glowShadow = glow ? `drop-shadow(0 0 18px ${glow})` : undefined;

  return (
    <div className="relative flex items-center justify-center">
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="relative w-52 h-52 md:w-64 md:h-64 rounded-full cursor-pointer border-0 bg-transparent p-0 focus:outline-none"
        style={{
          transform: pressed ? 'scale(0.92)' : 'scale(1)',
          transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: frenzy ? frenzyShadow : glowShadow,
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
          <defs>
            <radialGradient id="pancakeGradient" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#FFE082" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#C89532" stopOpacity="0" />
            </radialGradient>
            <clipPath id="pancakeClip">
              <ellipse cx="100" cy="95" rx="78" ry="45" />
            </clipPath>
          </defs>
          {base}
          {pattern}
          {topping}
        </svg>

        {particles.map(p => (
          <span
            key={p.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: (frenzy ? 8 : 6) + Math.random() * 4,
              height: (frenzy ? 8 : 6) + Math.random() * 4,
              background: particleColors[p.id % 4],
              animation: 'crumb-fly 0.6s ease-out forwards',
              '--angle': `${p.angle}deg`,
              '--dist': `${p.speed}px`,
            } as React.CSSProperties}
          />
        ))}

        {floats.map(f => (
          <span
            key={f.id}
            className="absolute pointer-events-none font-bold text-xl"
            style={{
              left: f.x,
              top: f.y,
              color: frenzy ? '#FFD700' : '#8B6914',
              textShadow: frenzy
                ? '0 0 8px rgba(255,215,0,0.6), 0 1px 2px rgba(0,0,0,0.2)'
                : '0 1px 2px rgba(0,0,0,0.2)',
              animation: 'float-up 0.8s ease-out forwards',
              fontSize: frenzy ? '1.5rem' : undefined,
            }}
          >
            +{clickPower}
          </span>
        ))}
      </button>

      <style>{`
        @keyframes crumb-fly {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% {
            opacity: 0;
            transform: translate(
              calc(cos(var(--angle)) * var(--dist)),
              calc(sin(var(--angle)) * var(--dist) - 20px)
            ) scale(0.3);
          }
        }
        @keyframes float-up {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(1.3); }
        }
      `}</style>
    </div>
  );
}

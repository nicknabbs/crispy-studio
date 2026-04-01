import { useCallback, useRef, useState } from 'react';

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

export function PancakeButton({ onClick, clickPower, frenzy }: { onClick: () => void; clickPower: number; frenzy?: boolean }) {
  const [pressed, setPressed] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    : ['#F5C864', '#C89532', '#FFE082', '#D4A844'];

  return (
    <div className="relative flex items-center justify-center">
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="relative w-52 h-52 md:w-64 md:h-64 rounded-full cursor-pointer border-0 bg-transparent p-0 focus:outline-none"
        style={{
          transform: pressed ? 'scale(0.92)' : 'scale(1)',
          transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: frenzy ? 'drop-shadow(0 0 24px rgba(255, 215, 0, 0.8))' : undefined,
        }}
      >
        {/* Pancake SVG */}
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
          {/* Shadow/depth */}
          <ellipse cx="100" cy="120" rx="88" ry="30" fill="#A0722C" opacity="0.3" />
          {/* Pancake body */}
          <ellipse cx="100" cy="105" rx="85" ry="55" fill="#D4A044" />
          <ellipse cx="100" cy="105" rx="82" ry="52" fill="#E8B84C" />
          {/* Top surface */}
          <ellipse cx="100" cy="95" rx="78" ry="45" fill="#F0C85C" />
          <ellipse cx="100" cy="95" rx="78" ry="45" fill="url(#pancakeGradient)" />
          {/* Surface bubbles */}
          <circle cx="70" cy="85" r="5" fill="#E8B84C" opacity="0.5" />
          <circle cx="120" cy="80" r="4" fill="#E8B84C" opacity="0.4" />
          <circle cx="90" cy="100" r="6" fill="#E8B84C" opacity="0.4" />
          <circle cx="130" cy="95" r="4" fill="#E8B84C" opacity="0.5" />
          <circle cx="75" cy="105" r="3" fill="#E8B84C" opacity="0.4" />
          <circle cx="110" cy="110" r="5" fill="#E8B84C" opacity="0.3" />
          <circle cx="55" cy="95" r="3.5" fill="#E8B84C" opacity="0.4" />
          <circle cx="140" cy="85" r="3" fill="#E8B84C" opacity="0.4" />
          {/* Edge ring */}
          <ellipse cx="100" cy="95" rx="78" ry="45" fill="none" stroke="#C89532" strokeWidth="2" opacity="0.4" />
          {/* Butter pat */}
          <rect x="85" y="72" width="30" height="20" rx="4" fill="#FFE082" />
          <rect x="87" y="74" width="26" height="16" rx="3" fill="#FFEE99" />
          <rect x="89" y="76" width="10" height="6" rx="2" fill="#FFF9C4" opacity="0.7" />
          {/* Syrup drizzle */}
          <path d="M 75 90 Q 85 87 95 92 Q 105 97 115 90 Q 125 83 135 88" fill="none" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
          <path d="M 65 100 Q 80 95 95 102 Q 110 109 125 100" fill="none" stroke="#8B6914" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
          <defs>
            <radialGradient id="pancakeGradient" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#FFE082" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#C89532" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        {/* Batter splash particles */}
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

        {/* Floating numbers */}
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

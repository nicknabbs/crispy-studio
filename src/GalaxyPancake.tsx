import { useState } from 'react';

interface GalaxyPancakeProps {
  isOpen: boolean;
  onClose: () => void;
  onGrantInfinity: () => void;
}

const GALAXY_PASSWORD = 'infinityflip';

export function GalaxyPancake({ isOpen, onClose, onGrantInfinity }: GalaxyPancakeProps) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('pancake-galaxy-unlocked') === 'true');
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [granted, setGranted] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setPwInput('');
    setPwError(false);
    setGranted(false);
    onClose();
  };

  const tryUnlock = () => {
    if (pwInput === GALAXY_PASSWORD) {
      setUnlocked(true);
      setPwInput('');
      setPwError(false);
      localStorage.setItem('pancake-galaxy-unlocked', 'true');
    } else {
      setPwError(true);
    }
  };

  const handleGrant = () => {
    onGrantInfinity();
    setGranted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border-2 border-fuchsia-500/40 bg-[radial-gradient(circle_at_30%_20%,#3b0764_0%,#1e1b4b_45%,#000_100%)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Twinkles */}
        <div className="relative">
          <div className="absolute top-2 left-6 w-1 h-1 rounded-full bg-white/80 animate-pulse" />
          <div className="absolute top-8 right-10 w-0.5 h-0.5 rounded-full bg-fuchsia-200 animate-pulse" style={{ animationDelay: '0.6s' }} />
          <div className="absolute top-16 left-12 w-1 h-1 rounded-full bg-purple-200/70 animate-pulse" style={{ animationDelay: '1.2s' }} />
          <div className="absolute bottom-4 right-6 w-1 h-1 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.3s' }} />

          {!unlocked ? (
            <div className="p-6 text-center relative">
              <div className="text-5xl mb-2">🌌🥞</div>
              <h2 className="text-xl font-bold text-white tracking-wide mb-1">
                Galaxy Pancake
              </h2>
              <p className="text-sm text-fuchsia-200/90 mb-4">
                Guess the password to unlock infinity pancakes for the base game
              </p>
              <input
                type="password"
                value={pwInput}
                onChange={e => { setPwInput(e.target.value); setPwError(false); }}
                onKeyDown={e => { if (e.key === 'Enter') tryUnlock(); }}
                placeholder="Password..."
                autoFocus
                className={`w-full px-4 py-3 rounded-xl border-2 text-center text-white placeholder-fuchsia-300/50 font-medium bg-black/40 outline-none ${
                  pwError ? 'border-red-400 animate-shake' : 'border-fuchsia-400/50 focus:border-fuchsia-300'
                }`}
              />
              {pwError && (
                <p className="text-red-300 text-sm mt-2 font-medium">Wrong password!</p>
              )}
              <button
                onClick={tryUnlock}
                className="mt-4 w-full py-3 rounded-xl border-2 border-fuchsia-400 bg-fuchsia-600 text-white font-bold cursor-pointer hover:bg-fuchsia-500 transition-all"
              >
                Unlock
              </button>
              <p className="text-xs text-fuchsia-300/70 mt-3">Click outside to cancel</p>
            </div>
          ) : (
            <div className="p-6 text-center relative">
              <div className="text-5xl mb-2">🌌🥞</div>
              <h2 className="text-xl font-bold text-white tracking-wide mb-4">
                Galaxy Pancake
              </h2>
              <button
                onClick={handleGrant}
                disabled={granted}
                className="w-full px-4 py-4 rounded-xl border-2 border-fuchsia-300 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white font-bold cursor-pointer hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-default shadow-[0_0_20px_rgba(217,70,239,0.5)]"
              >
                {granted ? '✨ Infinite pancakes granted! ✨' : 'Click this button and instantly get Infinite Pancakes.'}
              </button>
              <p className="text-xs text-fuchsia-200/80 mt-4 italic">
                Have fun — @Benjamin, creator of Pancake Stack
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

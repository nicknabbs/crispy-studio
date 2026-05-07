import { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, displayName: string) => Promise<void>;
  initialDisplayName?: string;
}

export function AuthModal({ isOpen, onClose, onSignIn, onSignUp, initialDisplayName }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await onSignIn(email.trim(), password);
      } else {
        await onSignUp(email.trim(), password, displayName.trim());
      }
      onClose();
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/45 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-pancake-warm border-b-2 border-pancake-gold/30 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-pancake-brown">Owner sign-in</h2>
            <p className="text-xs text-pancake-medium">Email-based account so ban authority works across devices.</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-pancake-gold/20">
          <button
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-3 text-sm font-bold cursor-pointer bg-transparent border-0 transition-colors ${
              mode === 'signin' ? 'text-pancake-brown border-b-2 border-pancake-gold' : 'text-pancake-medium'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-3 text-sm font-bold cursor-pointer bg-transparent border-0 transition-colors ${
              mode === 'signup' ? 'text-pancake-brown border-b-2 border-pancake-gold' : 'text-pancake-medium'
            }`}
          >
            Create Owner Account
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="px-3 py-2 rounded-lg border-2 border-pancake-gold/40 bg-white text-pancake-brown font-medium outline-none focus:border-pancake-gold"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="px-3 py-2 rounded-lg border-2 border-pancake-gold/40 bg-white text-pancake-brown font-medium outline-none focus:border-pancake-gold"
          />
          {mode === 'signup' && (
            <>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name (3–20 characters)"
                maxLength={20}
                className="px-3 py-2 rounded-lg border-2 border-pancake-gold/40 bg-white text-pancake-brown font-medium outline-none focus:border-pancake-gold"
              />
              <p className="text-xs text-pancake-medium">
                Letters, numbers, spaces, hyphens, underscores. Locks to your account — only changeable once every 7 days.
              </p>
            </>
          )}
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || !email.trim() || !password.trim() || (mode === 'signup' && !displayName.trim())}
            className="w-full py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? '…' : mode === 'signin' ? 'Sign In' : 'Create Owner Account'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 underline"
          >
            Cancel — stay as guest
          </button>
          <p className="text-xs text-pancake-medium text-center">
            This account is for the game's owner. Regular players don't need it —
            they're already playing under their guest profile.
          </p>
        </div>
      </div>
    </div>
  );
}

interface BanScreenProps {
  reason?: string | null;
  onSignOut: () => void;
}

export function BanScreen({ reason, onSignOut }: BanScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border-4 border-red-500">
        <div className="text-6xl mb-3">🚫</div>
        <h1 className="text-2xl font-extrabold text-red-600 mb-2">You are banned</h1>
        <p className="text-sm text-pancake-brown mb-4">
          The owner has banned this name from Pancake Stack.
        </p>
        {reason && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 mb-4 text-left">
            <div className="text-xs font-bold text-red-700 mb-1">Reason</div>
            <div className="text-sm text-red-800 break-words">{reason}</div>
          </div>
        )}
        <p className="text-xs text-pancake-medium mb-4">
          Think this is a mistake? Reach out to the owner. You can pick a different name and keep playing.
        </p>
        <button
          onClick={onSignOut}
          className="w-full py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105"
        >
          Pick a different name
        </button>
      </div>
    </div>
  );
}

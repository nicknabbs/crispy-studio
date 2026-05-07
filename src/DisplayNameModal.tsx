import { useEffect, useState } from 'react';

interface DisplayNameModalProps {
  isOpen: boolean;
  initialName?: string;
  onSubmit: (name: string) => Promise<void>;
}

export function DisplayNameModal({ isOpen, initialName, onSubmit }: DisplayNameModalProps) {
  const [name, setName] = useState(initialName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName ?? '');
      setError(null);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await onSubmit(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        <div className="bg-pancake-warm border-b-2 border-pancake-gold/30 p-4">
          <h2 className="text-lg font-bold text-pancake-brown">Pick your pancake name</h2>
          <p className="text-xs text-pancake-medium mt-1">
            This is how you'll show up on the leaderboard. Save it once and it's yours — only changeable once a week.
          </p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(null); }}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) submit(); }}
            placeholder="3–20 characters"
            maxLength={20}
            autoFocus
            className="px-3 py-3 rounded-lg border-2 border-pancake-gold/40 bg-white text-pancake-brown font-medium outline-none focus:border-pancake-gold text-base"
          />
          <p className="text-xs text-pancake-medium">
            Letters, numbers, spaces, hyphens, underscores, and @.
          </p>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="w-full py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {busy ? '…' : 'Save name'}
          </button>
        </div>
      </div>
    </div>
  );
}

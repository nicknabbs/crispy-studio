import type { ActivePlayer } from './usePlayerCount';
import { openPlayerProfile } from './profileViewer';

interface ActivePlayersModalProps {
  players: ActivePlayer[];
  onClose: () => void;
}

export function ActivePlayersModal({ players, onClose }: ActivePlayersModalProps) {
  const named = players.filter(p => p.name !== 'Guest');
  const guests = players.filter(p => p.name === 'Guest');
  const ordered = [...named, ...guests];

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-pancake-warm border-b-2 border-pancake-gold/30 p-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-pancake-brown">🥞 Playing right now</h2>
            <p className="text-xs text-pancake-medium mt-1">
              {players.length === 1 ? '1 player' : `${players.length} players`} connected.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-pancake-brown/70 hover:text-pancake-brown text-xl leading-none cursor-pointer bg-transparent border-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <ul className="p-3 max-h-[60vh] overflow-y-auto flex flex-col gap-1">
          {ordered.map(p => (
            <li key={p.playerId}>
              <button
                onClick={() => openPlayerProfile(p.playerId, p.name)}
                className={`w-full px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer text-left bg-transparent border-0 hover:bg-white/40 ${
                  p.isSelf
                    ? 'bg-pancake-gold/25 text-pancake-brown font-bold border border-pancake-gold/40'
                    : p.name === 'Guest'
                      ? 'text-pancake-brown/55 italic'
                      : 'text-pancake-brown'
                }`}
                title={`View ${p.name}'s profile`}
              >
                {p.isSelf && <span className="text-xs uppercase tracking-wide opacity-70">you:</span>}
                <span className="truncate">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 border-t border-pancake-gold/20 text-[10px] text-pancake-medium text-center">
          Updates live as people join and leave.
        </div>
      </div>
    </div>
  );
}

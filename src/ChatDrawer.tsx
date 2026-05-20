import { ChatPanel } from './ChatPanel';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
}

// Centered modal styled like the other player-facing dialogs (DisplayNameModal,
// ActivePlayersModal, GiftNotification). Tall + narrow so a long chat history
// has room without dominating the screen.
export function ChatDrawer({ isOpen, onClose, playerId, playerName }: ChatDrawerProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col"
        style={{ height: 'min(80vh, 640px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-pancake-warm border-b-2 border-pancake-gold/30 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-pancake-brown">💬 Live Chat</h2>
            <p className="text-[11px] text-pancake-medium">
              Everyone playing right now can see this. Keep it nice.
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
        <ChatPanel playerId={playerId} playerName={playerName || 'Guest'} variant="player" />
      </div>
    </div>
  );
}

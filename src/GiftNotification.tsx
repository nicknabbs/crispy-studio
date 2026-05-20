interface GiftNotificationProps {
  message: string;
  remainingCount: number;       // how many more gifts are queued after this one
  onDismiss: () => void;
}

// Center-screen pop-up shown to a gift recipient. Supports multi-line content
// (password gifts include a newline so the password sits on its own row).
export function GiftNotification({ message, remainingCount, onDismiss }: GiftNotificationProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-4 border-pancake-gold"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-pancake-gold/30 px-5 py-3 text-center">
          <div className="text-3xl">🎁</div>
          <h2 className="text-pancake-brown font-extrabold text-lg mt-1">You got a gift!</h2>
        </div>
        <div className="p-5">
          <p
            className="text-pancake-brown text-base font-medium text-center break-words"
            style={{ whiteSpace: 'pre-line' }}
          >
            {message}
          </p>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-extrabold cursor-pointer hover:brightness-105 transition-all"
          >
            Awesome, thanks!
          </button>
          {remainingCount > 0 && (
            <p className="text-pancake-medium text-xs text-center">
              {remainingCount} more gift{remainingCount === 1 ? '' : 's'} waiting…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

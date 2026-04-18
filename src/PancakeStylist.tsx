import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SKIN, renderSkinLayers, sanitizeSkin, type PancakeSkin } from './skinEngine';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PancakeStylistProps {
  isOpen: boolean;
  onClose: () => void;
  skin: PancakeSkin | null;
  onSkinChange: (skin: PancakeSkin | null) => void;
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm Pancake. Tell me what kind of pancake you want and I'll flip one up. Try \"rainbow sprinkles\", \"dragon fire\", or \"pizza pancake\".",
};

export function PancakeStylist({ isOpen, onClose, skin, onSkinChange }: PancakeStylistProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  if (!isOpen) return null;

  const previewSkin = skin ?? DEFAULT_SKIN;
  const { pattern, topping } = renderSkinLayers(previewSkin, 'preview');

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await fetch('/.netlify/functions/pancake-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          currentSkin: skin,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Request failed (${res.status})`);
      }

      const data = await res.json() as { reply?: string; skin?: unknown };
      const reply = typeof data.reply === 'string' && data.reply.length > 0
        ? data.reply
        : "Okay! Check out your pancake.";

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      if (data.skin) {
        const parsed = sanitizeSkin(data.skin);
        if (parsed) onSkinChange(parsed);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops, my griddle's cold. Try again in a sec!",
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    onSkinChange(null);
    setMessages(prev => [...prev, { role: 'assistant', content: "Back to a plain pancake! 🥞" }]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream rounded-t-2xl border-b-2 border-pancake-gold/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-pancake-gold/20 flex items-center justify-center text-2xl">
              🥞
            </div>
            <div>
              <h2 className="text-lg font-bold text-pancake-brown leading-tight">Pancake</h2>
              <p className="text-xs text-pancake-medium">Your pancake stylist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-pancake-gold/20 bg-pancake-warm">
          <div className="w-16 h-16 flex-shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow">
              <defs>
                <radialGradient id="previewGradient" cx="40%" cy="35%">
                  <stop offset="0%" stopColor="#FFE082" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#C89532" stopOpacity="0" />
                </radialGradient>
                <clipPath id="previewClip">
                  <ellipse cx="100" cy="95" rx="78" ry="45" />
                </clipPath>
              </defs>
              <g>
                <ellipse cx="100" cy="120" rx="88" ry="30" fill="#000" opacity="0.2" />
                <ellipse cx="100" cy="105" rx="85" ry="55" fill={previewSkin.baseColor} />
                <ellipse cx="100" cy="105" rx="82" ry="52" fill={previewSkin.accentColor} opacity="0.9" />
                <ellipse cx="100" cy="95" rx="78" ry="45" fill={previewSkin.highlightColor} />
                <ellipse
                  cx="100"
                  cy="95"
                  rx="78"
                  ry="45"
                  fill="none"
                  stroke={previewSkin.accentColor}
                  strokeWidth="2"
                  opacity="0.45"
                />
              </g>
              {pattern}
              {topping}
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-pancake-brown truncate">{previewSkin.name}</div>
            <button
              onClick={reset}
              className="text-xs text-pancake-medium hover:text-pancake-brown underline cursor-pointer bg-transparent border-0 p-0 mt-0.5"
            >
              Reset to plain pancake
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[180px] max-h-[45vh]"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm leading-snug whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-pancake-gold/80 text-pancake-brown rounded-br-sm'
                    : 'bg-white text-pancake-brown rounded-bl-sm border border-pancake-gold/20'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="px-3 py-2 rounded-2xl bg-white border border-pancake-gold/20 text-pancake-brown text-sm">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pancake-medium animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-pancake-medium animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-pancake-medium animate-bounce [animation-delay:0.3s]" />
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 pb-2 text-xs text-red-600">{error}</div>
        )}

        <div className="p-3 border-t border-pancake-gold/20 bg-pancake-warm rounded-b-2xl flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={sending ? 'Pancake is flipping…' : 'Describe your pancake…'}
            disabled={sending}
            maxLength={200}
            className="flex-1 px-3 py-2 rounded-full border border-pancake-gold/40 bg-white text-pancake-brown text-sm focus:outline-none focus:border-pancake-gold disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="px-4 py-2 rounded-full bg-pancake-gold text-pancake-brown font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pancake-light transition cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

interface StylistButtonProps {
  onClick: () => void;
}

export function PancakeStylistButton({ onClick }: StylistButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute top-1/2 -translate-y-1/2 right-3 md:right-6 z-20
                 w-14 h-14 md:w-16 md:h-16 rounded-full
                 border-0 cursor-pointer p-0
                 shadow-[0_4px_0_rgba(139,105,20,0.35),0_8px_16px_rgba(0,0,0,0.15)]
                 hover:scale-110 active:scale-95 transition-transform"
      style={{ animation: 'stylist-bob 2.4s ease-in-out infinite' }}
      title="Pancake Stylist — chat with Pancake"
      aria-label="Open pancake stylist chat"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id="miniGradient" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#FFE082" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C89532" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="62" rx="44" ry="14" fill="#000" opacity="0.22" />
        <ellipse cx="50" cy="52" rx="42" ry="28" fill="#D4A044" />
        <ellipse cx="50" cy="50" rx="40" ry="26" fill="#E8B84C" />
        <ellipse cx="50" cy="46" rx="38" ry="22" fill="#F0C85C" />
        <ellipse cx="50" cy="46" rx="38" ry="22" fill="url(#miniGradient)" />
        <circle cx="38" cy="43" r="3" fill="#4A3728" />
        <circle cx="62" cy="43" r="3" fill="#4A3728" />
        <circle cx="37" cy="42" r="1" fill="#fff" />
        <circle cx="61" cy="42" r="1" fill="#fff" />
        <path
          d="M 38 54 Q 50 62 62 54"
          fill="none"
          stroke="#4A3728"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx="32" cy="52" rx="4" ry="2.5" fill="#F48FB1" opacity="0.55" />
        <ellipse cx="68" cy="52" rx="4" ry="2.5" fill="#F48FB1" opacity="0.55" />
      </svg>
      <style>{`
        @keyframes stylist-bob {
          0%, 100% { transform: translateY(-50%) rotate(-4deg); }
          50% { transform: translateY(calc(-50% - 6px)) rotate(4deg); }
        }
      `}</style>
    </button>
  );
}

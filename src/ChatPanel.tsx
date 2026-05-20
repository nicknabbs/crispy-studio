import { useEffect, useRef, useState } from 'react';
import {
  useChatStream,
  useChatReactionsMap,
  pushLocalChatMessage,
  reconcileLocalChatId,
  removeLocalChatMessage,
  applyLocalReactionToggle,
} from './useChatStream';
import { sendChatMessage, type ChatMessage } from './chatApi';
import { toggleChatReaction, REACTION_EMOJIS, type ReactionEmoji } from './chatReactionsApi';
import { openPlayerProfile } from './profileViewer';
import { openPeerGift } from './peerGifter';

interface ChatPanelProps {
  playerId: string;
  playerName: string;
  variant: 'player' | 'owner';
  // Constrain the message-list height. Caller (modal/section) decides.
  listClassName?: string;
}

export function ChatPanel({ playerId, playerName, variant, listClassName }: ChatPanelProps) {
  const messages = useChatStream();
  const reactionsMap = useChatReactionsMap();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerForMsgId, setPickerForMsgId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages — unless the user has scrolled up
  // to read history, in which case we leave them alone.
  const lastLenRef = useRef(0);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const stuckToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    const newOnes = messages.length > lastLenRef.current;
    lastLenRef.current = messages.length;
    if (newOnes && stuckToBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // First mount: jump to the bottom regardless of scroll position.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const submit = async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setError(null);
    setSending(true);
    // Huge positive id so the optimistic row sorts after every real BIGSERIAL
    // row in the cache. reconcileLocalChatId swaps it to the real id once the
    // RPC returns; sortAndCap re-orders correctly.
    const optimisticId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    try {
      // Optimistic add so the sender sees their message instantly.
      const optimistic: ChatMessage = {
        id: optimisticId,
        player_id: playerId,
        player_name: playerName || 'Guest',
        is_owner: variant === 'owner',
        text: txt,
        created_at: new Date().toISOString(),
        kind: 'user',
      };
      pushLocalChatMessage(optimistic);
      setInput('');
      const realId = await sendChatMessage({ playerId, playerName: playerName || 'Guest', text: txt });
      // Swap the optimistic row's id to the real one so the realtime echo
      // (de-duped by id) collapses to a single entry.
      reconcileLocalChatId(optimisticId, realId);
    } catch (e) {
      // Roll back the optimistic placeholder so the rejected text disappears
      // from the visible list when profanity/rate-limit blocks the send.
      removeLocalChatMessage(optimisticId);
      setInput(txt);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const styles = variant === 'owner' ? OWNER_STYLES : PLAYER_STYLES;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={listRef}
        className={`flex-1 min-h-0 overflow-y-auto ${listClassName ?? ''} ${styles.listBg}`}
      >
        {messages.length === 0 && (
          <div className={`px-4 py-8 text-center text-sm ${styles.empty}`}>
            No messages yet. Say hi!
          </div>
        )}
        <ul className="flex flex-col gap-1 p-2">
          {messages.map(m => {
            // System messages render as full-width centered banners with
            // no sender attribution and no reactions — they're for
            // donations (yellow) and live-event announcements (orange).
            if (m.kind === 'donation' || m.kind === 'event') {
              return (
                <li
                  key={m.id}
                  className={`px-3 py-2 rounded-lg text-sm text-center font-bold ${
                    m.kind === 'donation'
                      ? 'bg-yellow-200/85 text-yellow-900 border border-yellow-400'
                      : 'bg-orange-200/85 text-orange-900 border border-orange-400'
                  }`}
                >
                  <span className="mr-1">{m.kind === 'donation' ? '🎁' : '📣'}</span>
                  {m.text}
                </li>
              );
            }
            const perMsg = reactionsMap.get(m.id);
            const crownPlayers = perMsg?.get('👑');
            // OwnerPanel chat view: surface messages where players hit the
            // 👑 reaction (their "calling the owner" signal) with a gold
            // border so Nick can scan and find them.
            const summonsOwner = variant === 'owner' && (crownPlayers?.size ?? 0) > 0;
            return (
              <li
                key={m.id}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  m.is_owner ? styles.ownerMsg : styles.msg
                } ${m.player_id === playerId ? styles.selfMsg : ''} ${
                  summonsOwner ? 'ring-2 ring-yellow-300/80 shadow-[0_0_12px_rgba(255,221,120,0.5)]' : ''
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <button
                    onClick={() => openPlayerProfile(m.player_id, m.player_name)}
                    className={`font-bold truncate max-w-[40%] cursor-pointer bg-transparent border-0 p-0 text-left hover:underline ${m.is_owner ? styles.ownerName : styles.name}`}
                    title={`View ${m.player_name}'s profile`}
                  >
                    {m.is_owner && '👑 '}
                    {m.player_name}
                    {m.player_id === playerId && (
                      <span className={`ml-1 font-normal text-[10px] ${styles.youTag}`}>(you)</span>
                    )}
                  </button>
                  <span className={`flex-1 break-words whitespace-pre-wrap ${styles.text}`}>{m.text}</span>
                </div>

                {/* Reaction row: existing badges + picker trigger */}
                <ReactionRow
                  messageId={m.id}
                  perMsg={perMsg}
                  playerId={playerId}
                  playerName={playerName}
                  variant={variant}
                  pickerOpen={pickerForMsgId === m.id}
                  onTogglePicker={(open) => setPickerForMsgId(open ? m.id : null)}
                  showOwnerCallTag={summonsOwner}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className={`p-3 border-t ${styles.inputBar}`}>
        {error && (
          <p className={`text-xs mb-2 ${styles.error}`}>{error}</p>
        )}
        <div className="flex gap-2">
          {variant === 'player' && (
            <button
              onClick={() => openPeerGift(null)}
              title="Send pancakes to another player"
              className={`px-3 py-2 rounded-lg border-2 font-bold cursor-pointer ${styles.sendBtn}`}
            >
              🎁
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); if (error) setError(null); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={variant === 'owner' ? 'Type a reply…' : 'Type a message…'}
            maxLength={500}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg border-2 outline-none ${styles.input}`}
            disabled={sending}
          />
          <button
            onClick={submit}
            disabled={sending || input.trim().length === 0}
            className={`px-4 py-2 rounded-lg border-2 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${styles.sendBtn}`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReactionRowProps {
  messageId: number;
  perMsg: Map<ReactionEmoji, Set<string>> | undefined;
  playerId: string;
  playerName: string;
  variant: 'player' | 'owner';
  pickerOpen: boolean;
  onTogglePicker: (open: boolean) => void;
  showOwnerCallTag: boolean;
}

function ReactionRow({
  messageId, perMsg, playerId, playerName, variant,
  pickerOpen, onTogglePicker, showOwnerCallTag,
}: ReactionRowProps) {
  const ownerView = variant === 'owner';
  const badgeBase = ownerView
    ? 'bg-white/10 hover:bg-white/20 border border-white/15 text-white'
    : 'bg-white/70 hover:bg-white/90 border border-pancake-gold/30 text-pancake-brown';
  const badgeSelf = ownerView
    ? 'bg-fuchsia-500/40 hover:bg-fuchsia-500/50 border border-fuchsia-300/80 text-white'
    : 'bg-pancake-gold/40 hover:bg-pancake-gold/60 border border-pancake-gold text-pancake-brown';

  const onReact = async (emoji: ReactionEmoji) => {
    if (!playerId) return;
    const players = perMsg?.get(emoji);
    const wasReacted = !!players?.has(playerId);
    // Optimistic flip
    applyLocalReactionToggle({ messageId, playerId, emoji, nowReacted: !wasReacted });
    onTogglePicker(false);
    try {
      const nowOn = await toggleChatReaction({
        messageId, playerId, playerName: playerName || 'Guest', emoji,
      });
      // If the server disagrees with our optimistic state, correct it.
      if (nowOn !== !wasReacted) {
        applyLocalReactionToggle({ messageId, playerId, emoji, nowReacted: nowOn });
      }
    } catch {
      // Revert on error
      applyLocalReactionToggle({ messageId, playerId, emoji, nowReacted: wasReacted });
    }
  };

  // Existing badges (ordered to match REACTION_EMOJIS so they look stable)
  const badges = REACTION_EMOJIS
    .map(emoji => ({ emoji, players: perMsg?.get(emoji) }))
    .filter(b => (b.players?.size ?? 0) > 0);

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1 relative">
      {showOwnerCallTag && (
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-yellow-200 bg-yellow-700/50 px-1.5 py-0.5 rounded">
          👑 Called you
        </span>
      )}
      {badges.map(({ emoji, players }) => {
        const selfReacted = players!.has(playerId);
        return (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] leading-none cursor-pointer transition-colors ${
              selfReacted ? badgeSelf : badgeBase
            }`}
            title={selfReacted ? 'Tap to un-react' : 'Tap to react'}
          >
            <span>{emoji}</span>
            <span className="font-bold tabular-nums">{players!.size}</span>
          </button>
        );
      })}
      <button
        onClick={() => onTogglePicker(!pickerOpen)}
        className={`px-1.5 py-0.5 rounded-full text-[11px] leading-none cursor-pointer ${badgeBase}`}
        title="Add a reaction"
      >
        😊<span className="ml-0.5">+</span>
      </button>
      {pickerOpen && (
        <div
          className={`absolute top-full left-0 mt-1 z-20 flex gap-1 px-2 py-1.5 rounded-full shadow-lg ${
            ownerView ? 'bg-black/80 border border-fuchsia-400/40' : 'bg-pancake-cream border border-pancake-gold/50'
          }`}
        >
          {REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className="text-lg leading-none px-1 py-0.5 rounded hover:scale-125 transition-transform cursor-pointer bg-transparent border-0"
              title={emoji === '👑' ? 'Call the owner' : `React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const PLAYER_STYLES = {
  listBg: 'bg-pancake-cream',
  empty: 'text-pancake-medium',
  msg: 'bg-white/60 text-pancake-brown',
  ownerMsg: 'bg-pancake-gold/30 text-pancake-brown border border-pancake-gold/50',
  selfMsg: 'ring-1 ring-pancake-gold/40',
  name: 'text-pancake-brown',
  ownerName: 'text-pancake-brown font-extrabold',
  text: 'text-pancake-brown',
  youTag: 'text-pancake-medium',
  inputBar: 'border-pancake-gold/30 bg-pancake-warm',
  error: 'text-red-600 font-medium',
  input: 'border-pancake-gold/40 bg-white text-pancake-brown placeholder-pancake-medium focus:border-pancake-gold',
  sendBtn: 'border-pancake-gold bg-pancake-gold text-pancake-brown hover:brightness-105',
} as const;

const OWNER_STYLES = {
  listBg: 'bg-black/30',
  empty: 'text-fuchsia-200/70',
  msg: 'bg-white/5 text-white',
  ownerMsg: 'bg-fuchsia-500/20 text-white border border-fuchsia-300/50',
  selfMsg: 'ring-1 ring-fuchsia-300/40',
  name: 'text-fuchsia-200',
  ownerName: 'text-yellow-200 font-extrabold',
  text: 'text-white',
  youTag: 'text-fuchsia-200/60',
  inputBar: 'border-fuchsia-400/30 bg-black/40',
  error: 'text-red-300 font-medium',
  input: 'border-fuchsia-400/40 bg-black/40 text-white placeholder-fuchsia-300/50 focus:border-fuchsia-300',
  sendBtn: 'border-fuchsia-300 bg-fuchsia-500 text-white hover:bg-fuchsia-400',
} as const;

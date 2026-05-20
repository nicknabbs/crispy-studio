import { useEffect, useMemo, useState } from 'react';
import { formatNumber } from './gameData';
import { listAllPlayers, sendPeerGift, type GiftableplayerRow } from './giftsApi';

interface PeerGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderPlayerId: string;
  senderName: string;
  senderPancakes: number;
  // Called once the sender's local pancake count needs to drop by `amount`
  // (after RPC confirmation). The caller wires this to setDirectState.
  onDeduct: (amount: number) => void;
  // Pre-selected recipient — set when opening from a profile. Skips the
  // recipient-picker step entirely.
  presetRecipient?: { player_id: string; player_name: string } | null;
}

type Step = 'pick' | 'compose' | 'sending' | 'done';

export function PeerGiftModal({
  isOpen, onClose,
  senderPlayerId, senderName, senderPancakes,
  onDeduct, presetRecipient,
}: PeerGiftModalProps) {
  const [step, setStep] = useState<Step>('compose');
  const [recipient, setRecipient] = useState<GiftableplayerRow | null>(null);
  const [players, setPlayers] = useState<GiftableplayerRow[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [playersFetched, setPlayersFetched] = useState(false);
  const [search, setSearch] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the modal opens. If a preset recipient was passed, jump
  // straight to the compose step.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setAmountStr('');
    setMessage('');
    setSearch('');
    if (presetRecipient) {
      setRecipient({
        player_id: presetRecipient.player_id,
        player_name: presetRecipient.player_name,
        last_seen: '',
      });
      setStep('compose');
    } else {
      setRecipient(null);
      setStep('pick');
    }
  }, [isOpen, presetRecipient]);

  // Lazy-load the player directory once we hit the pick step.
  useEffect(() => {
    if (!isOpen || step !== 'pick' || playersFetched || loadingPlayers) return;
    setLoadingPlayers(true);
    setPlayersError(null);
    listAllPlayers()
      .then(rows => setPlayers(rows.filter(r => r.player_id !== senderPlayerId)))
      .catch(e => setPlayersError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setLoadingPlayers(false);
        setPlayersFetched(true);
      });
  }, [isOpen, step, playersFetched, loadingPlayers, senderPlayerId]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter(p => p.player_name.toLowerCase().includes(q));
  }, [players, search]);

  // Tiered cap: rich players can gift more per send, but never an unbounded
  // amount in one shot. Below 1 duodecillion (1e39) you can send up to 5B;
  // at/above 1e39 you can send up to 10B. The server enforces 10B as a
  // hard ceiling regardless.
  const STACK_CAP_BREAKPOINT = 1e39;
  const SEND_CAP_NORMAL = 5e9;
  const SEND_CAP_RICH = 1e10;
  const sendCap = senderPancakes >= STACK_CAP_BREAKPOINT ? SEND_CAP_RICH : SEND_CAP_NORMAL;
  const effectiveMax = Math.min(senderPancakes, sendCap);

  const amount = parseFloat(amountStr);
  const amountValid = Number.isFinite(amount) && amount > 0 && amount <= effectiveMax;
  const tooLow = amountStr.length > 0 && Number.isFinite(amount) && amount <= 0;
  const overStack = amountStr.length > 0 && Number.isFinite(amount) && amount > senderPancakes;
  const overCap = amountStr.length > 0 && Number.isFinite(amount) && amount > sendCap && !overStack;

  const send = async () => {
    if (!recipient || !amountValid) return;
    setError(null);
    setStep('sending');
    try {
      await sendPeerGift({
        senderPlayerId,
        senderName: senderName || 'Guest',
        recipientPlayerId: recipient.player_id,
        recipientName: recipient.player_name,
        amount,
        message: message.trim(),
      });
      // Only deduct AFTER the RPC accepts — otherwise we'd have to refund on
      // every rate-limit / profanity rejection.
      onDeduct(amount);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep('compose');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[58] flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-4 border-pancake-gold flex flex-col"
        style={{ maxHeight: 'min(90vh, 720px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-pancake-warm border-b-2 border-pancake-gold/30 px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-pancake-brown">🎁 Gift Pancakes</h2>
            <p className="text-[11px] text-pancake-medium">
              Your stack: <span className="font-bold">{formatNumber(senderPancakes)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-pancake-brown/70 hover:text-pancake-brown text-xl leading-none cursor-pointer bg-transparent border-0"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {step === 'pick' && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search players by name…"
                className="w-full px-3 py-2 rounded-lg border-2 border-pancake-gold/40 bg-white text-pancake-brown outline-none focus:border-pancake-gold placeholder-pancake-medium"
                autoFocus
              />
              {loadingPlayers && <p className="text-pancake-medium text-sm">Loading players…</p>}
              {playersError && <p className="text-red-600 text-sm">Couldn't load players: {playersError}</p>}
              {!loadingPlayers && !playersError && (
                <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                  {filteredPlayers.length === 0 && (
                    <li className="text-pancake-medium italic text-sm px-2 py-3">
                      No matching players.
                    </li>
                  )}
                  {filteredPlayers.map(p => (
                    <li key={p.player_id}>
                      <button
                        onClick={() => { setRecipient(p); setStep('compose'); }}
                        className="w-full text-left px-3 py-2 rounded-lg bg-white/70 border border-pancake-gold/30 hover:bg-pancake-warm cursor-pointer transition-colors"
                      >
                        <span className="text-pancake-brown font-bold">{p.player_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === 'compose' && recipient && (
            <div className="flex flex-col gap-4">
              <div className="px-4 py-3 rounded-lg bg-pancake-warm border border-pancake-gold/40">
                <div className="text-[11px] uppercase tracking-wide text-pancake-medium font-bold">
                  Gifting to
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-pancake-brown text-lg font-extrabold truncate">
                    {recipient.player_name}
                  </span>
                  {!presetRecipient && (
                    <button
                      onClick={() => setStep('pick')}
                      className="text-pancake-medium text-xs cursor-pointer bg-transparent border-0 hover:underline"
                    >
                      change
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label className="text-xs uppercase tracking-wide text-pancake-medium font-bold">
                    How many pancakes?
                  </label>
                  <span className="text-[11px] text-pancake-medium">
                    Max this send: <span className="font-bold text-pancake-brown">{formatNumber(effectiveMax)}</span>
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={e => { setAmountStr(e.target.value); if (error) setError(null); }}
                  placeholder="e.g. 500000"
                  className={`w-full mt-1 px-3 py-2 rounded-lg border-2 bg-white text-pancake-brown font-bold outline-none focus:border-pancake-gold ${
                    overStack || overCap ? 'border-red-400' : 'border-pancake-gold/40'
                  }`}
                />
                {overStack && (
                  <p className="text-red-600 text-xs mt-1">
                    You only have {formatNumber(senderPancakes)} pancakes.
                  </p>
                )}
                {overCap && (
                  <p className="text-red-600 text-xs mt-1">
                    You can only send up to {formatNumber(sendCap)} pancakes at a time
                    {senderPancakes < STACK_CAP_BREAKPOINT
                      ? '. Reach a duodecillion to unlock the 10B cap.'
                      : '.'}
                  </p>
                )}
                {tooLow && (
                  <p className="text-red-600 text-xs mt-1">Pick a positive amount.</p>
                )}
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-pancake-medium font-bold block">
                  Friendly message <span className="text-pancake-medium font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => { setMessage(e.target.value); if (error) setError(null); }}
                  rows={3}
                  maxLength={200}
                  placeholder="Enjoy the pancakes! Nice work on the high score…"
                  className="w-full mt-1 px-3 py-2 rounded-lg border-2 border-pancake-gold/40 bg-white text-pancake-brown outline-none focus:border-pancake-gold placeholder-pancake-medium resize-none"
                />
                <p className="text-[10px] text-pancake-medium text-right">{message.length}/200</p>
              </div>

              {error && (
                <p className="text-red-600 text-sm font-medium text-center">{error}</p>
              )}

              <button
                onClick={send}
                disabled={!amountValid}
                className="w-full py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-extrabold cursor-pointer hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Send {amountValid ? formatNumber(amount) : '—'} 🥞
              </button>
            </div>
          )}

          {step === 'sending' && (
            <div className="py-8 text-center text-pancake-brown">
              <div className="text-3xl animate-pulse">🎁</div>
              <p className="mt-2 font-bold">Sending…</p>
            </div>
          )}

          {step === 'done' && recipient && (
            <div className="py-6 text-center text-pancake-brown">
              <div className="text-4xl">✅</div>
              <p className="mt-3 font-extrabold text-lg">
                {formatNumber(amount)} pancakes sent to {recipient.player_name}!
              </p>
              <p className="text-sm text-pancake-medium mt-2">
                They'll see it on their screen now (or next time they open the game).
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-4 py-2 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-bold cursor-pointer hover:brightness-105"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

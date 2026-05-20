import { useEffect, useMemo, useState } from 'react';
import { BUILDINGS, UPGRADES, CLICK_UPGRADES, formatNumber } from './gameData';
import {
  listGiftablePlayers,
  sendGift,
  type GiftableplayerRow,
  type GiftPayload,
} from './giftsApi';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Category =
  | 'pancakes'
  | 'building'
  | 'building_upgrade'
  | 'click_upgrade'
  | 'maple_stars'
  | 'passwords';

const CATEGORIES: { id: Category; label: string; desc: string }[] = [
  { id: 'pancakes',         label: '🥞 Pancakes',           desc: 'Drop pancakes directly into their stack' },
  { id: 'building',         label: '🏭 Buildings',          desc: 'Gift N of any shop building (no cost)' },
  { id: 'building_upgrade', label: '⬆️ Building Upgrades',  desc: 'Unlock a specific milestone upgrade' },
  { id: 'click_upgrade',    label: '👆 Click Upgrades',     desc: 'Unlock a click-power upgrade' },
  { id: 'maple_stars',      label: '🍁 Maple Stars',        desc: 'Hand out prestige stars (no prestige needed)' },
  { id: 'passwords',        label: '🔑 Passwords',          desc: 'Admin / Owner / Infinite Pancakes redemption' },
];

type Step = 'category' | 'item' | 'recipient' | 'confirm' | 'sending' | 'done';

export function GiftModal({ isOpen, onClose }: GiftModalProps) {
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState<string>('1');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [passwordKind, setPasswordKind] = useState<'admin_password' | 'owner_password' | 'infinite_pancakes_password' | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipient, setRecipient] = useState<GiftableplayerRow | null>(null);
  const [players, setPlayers] = useState<GiftableplayerRow[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [playersFetched, setPlayersFetched] = useState(false);
  const [itemFilter, setItemFilter] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  // Reset when reopened
  useEffect(() => {
    if (isOpen) {
      setStep('category');
      setCategory(null);
      setAmount('1');
      setSelectedItemId(null);
      setPasswordKind(null);
      setRecipientSearch('');
      setRecipient(null);
      setItemFilter('');
      setSendError(null);
      setPlayersFetched(false);
      setPlayersError(null);
      setPlayers([]);
    }
  }, [isOpen]);

  // Lazy-load recipient list the first time we hit the recipient step.
  // playersFetched gates against the obvious infinite-loop: an RPC error
  // would clear playersLoading, the dep-change would re-fire the effect,
  // which would re-fetch and re-error, forever.
  useEffect(() => {
    if (!isOpen) return;
    if (step !== 'recipient') return;
    if (playersFetched || playersLoading) return;
    setPlayersLoading(true);
    setPlayersError(null);
    listGiftablePlayers()
      .then(rows => setPlayers(rows))
      .catch(e => setPlayersError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setPlayersLoading(false);
        setPlayersFetched(true);
      });
  }, [isOpen, step, playersFetched, playersLoading]);

  const filteredPlayers = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return players;
    return players.filter(p => p.player_name.toLowerCase().includes(q));
  }, [players, recipientSearch]);

  const filteredItems = useMemo(() => {
    const q = itemFilter.trim().toLowerCase();
    if (category === 'building') {
      return BUILDINGS.filter(b => !q || b.name.toLowerCase().includes(q));
    }
    if (category === 'building_upgrade') {
      return UPGRADES.filter(u => !q || u.name.toLowerCase().includes(q));
    }
    if (category === 'click_upgrade') {
      return CLICK_UPGRADES.filter(u => !q || u.name.toLowerCase().includes(q));
    }
    return [];
  }, [category, itemFilter]);

  if (!isOpen) return null;

  const pickCategory = (c: Category) => {
    setCategory(c);
    setItemFilter('');
    setSelectedItemId(null);
    setPasswordKind(null);
    if (c === 'passwords') {
      setStep('item'); // pick which password
    } else if (c === 'pancakes' || c === 'maple_stars') {
      setStep('item'); // just an amount
    } else {
      setStep('item');
    }
  };

  const buildPayload = (): GiftPayload | null => {
    const n = parseFloat(amount);
    if (category === 'pancakes') {
      if (!Number.isFinite(n) || n <= 0) return null;
      return { kind: 'pancakes', amount: n };
    }
    if (category === 'maple_stars') {
      if (!Number.isFinite(n) || n <= 0) return null;
      return { kind: 'maple_stars', amount: Math.floor(n) };
    }
    if (category === 'building') {
      const b = BUILDINGS.find(x => x.id === selectedItemId);
      if (!b || !Number.isFinite(n) || n <= 0) return null;
      return { kind: 'building', buildingId: b.id, buildingName: b.name, amount: Math.floor(n) };
    }
    if (category === 'building_upgrade') {
      const u = UPGRADES.find(x => x.id === selectedItemId);
      if (!u) return null;
      return { kind: 'building_upgrade', upgradeId: u.id, upgradeName: u.name };
    }
    if (category === 'click_upgrade') {
      const u = CLICK_UPGRADES.find(x => x.id === selectedItemId);
      if (!u) return null;
      return { kind: 'click_upgrade', upgradeId: u.id, upgradeName: u.name };
    }
    if (category === 'passwords') {
      if (!passwordKind) return null;
      return { kind: passwordKind };
    }
    return null;
  };

  const giftSummary = (): string => {
    const p = buildPayload();
    if (!p) return '';
    switch (p.kind) {
      case 'pancakes': return `${formatNumber(p.amount)} pancakes`;
      case 'maple_stars': return `${p.amount} Maple Stars`;
      case 'building': return `${p.amount} × ${p.buildingName}`;
      case 'building_upgrade': return `the "${p.upgradeName}" upgrade`;
      case 'click_upgrade': return `the "${p.upgradeName}" click upgrade`;
      case 'admin_password': return 'the Admin Panel password';
      case 'owner_password': return 'the Owner Panel password';
      case 'infinite_pancakes_password': return 'the Infinite Pancakes password';
    }
  };

  const canProceedFromItem = (): boolean => {
    const payload = buildPayload();
    return payload !== null;
  };

  const doSend = async () => {
    const payload = buildPayload();
    if (!payload || !recipient) return;
    setStep('sending');
    setSendError(null);
    try {
      await sendGift({
        recipientPlayerId: recipient.player_id,
        recipientName: recipient.player_name,
        payload,
      });
      setStep('done');
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
      setStep('confirm');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #190028 0%, #0d0118 100%)',
          border: '2px solid rgba(255,0,200,0.45)',
          boxShadow: '0 0 40px rgba(255, 0, 200, 0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="border-b-2 p-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(90deg, #4a004a 0%, #1a0044 50%, #002848 100%)',
            borderColor: 'rgba(255,0,200,0.4)',
          }}
        >
          <h2 className="text-xl font-extrabold text-white tracking-wider">
            🎁 Gift a Player
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-white/80 hover:text-white cursor-pointer bg-transparent border-0 leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {step === 'category' && (
            <div className="flex flex-col gap-2">
              <p className="text-fuchsia-200/80 text-sm mb-2">Pick what to gift:</p>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => pickCategory(c.id)}
                  className="text-left px-4 py-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: 'rgba(255, 220, 255, 0.06)',
                    border: '1px solid rgba(255, 100, 220, 0.3)',
                  }}
                >
                  <div className="text-base font-bold text-white">{c.label}</div>
                  <div className="text-xs text-fuchsia-200/70">{c.desc}</div>
                </button>
              ))}
            </div>
          )}

          {step === 'item' && category && (
            <ItemStep
              category={category}
              amount={amount}
              setAmount={setAmount}
              selectedItemId={selectedItemId}
              setSelectedItemId={setSelectedItemId}
              passwordKind={passwordKind}
              setPasswordKind={setPasswordKind}
              itemFilter={itemFilter}
              setItemFilter={setItemFilter}
              filteredItems={filteredItems}
              onBack={() => setStep('category')}
              onNext={() => setStep('recipient')}
              canProceed={canProceedFromItem()}
            />
          )}

          {step === 'recipient' && (
            <div className="flex flex-col gap-3">
              <p className="text-fuchsia-200/80 text-sm">
                Gifting <span className="text-white font-bold">{giftSummary()}</span>. Choose a recipient:
              </p>
              <input
                type="text"
                value={recipientSearch}
                onChange={e => setRecipientSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-3 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-white outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
              />
              {playersLoading && <p className="text-fuchsia-200/70 text-sm">Loading players…</p>}
              {playersError && <p className="text-red-300 text-sm">Error: {playersError}</p>}
              {!playersLoading && !playersError && (
                <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                  {filteredPlayers.length === 0 && (
                    <li className="text-fuchsia-200/60 text-sm italic px-2 py-3">
                      No matching players.
                    </li>
                  )}
                  {filteredPlayers.map(p => (
                    <li key={p.player_id}>
                      <button
                        onClick={() => { setRecipient(p); setStep('confirm'); }}
                        className="w-full text-left px-3 py-2 rounded cursor-pointer transition-all"
                        style={{
                          background: 'rgba(255, 220, 255, 0.04)',
                          border: '1px solid rgba(255, 100, 220, 0.2)',
                        }}
                      >
                        <div className="text-white font-bold text-sm">{p.player_name}</div>
                        <div className="text-fuchsia-200/50 text-[10px]">
                          last seen {new Date(p.last_seen).toLocaleDateString()}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('item')}
                  className="px-4 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-fuchsia-200 font-bold cursor-pointer hover:bg-black/60"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && recipient && (
            <div className="flex flex-col gap-4">
              <div
                className="px-4 py-5 rounded-lg text-center"
                style={{
                  background: 'rgba(255, 220, 255, 0.08)',
                  border: '1px solid rgba(255, 100, 220, 0.35)',
                }}
              >
                <div className="text-fuchsia-200/80 text-sm">You're about to send</div>
                <div className="text-white text-lg font-extrabold mt-1">{giftSummary()}</div>
                <div className="text-fuchsia-200/80 text-sm mt-3">to</div>
                <div className="text-white text-lg font-extrabold mt-1">{recipient.player_name}</div>
              </div>
              {sendError && (
                <p className="text-red-300 text-sm text-center">Error: {sendError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('recipient')}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-fuchsia-200 font-bold cursor-pointer hover:bg-black/60"
                >
                  No, go back
                </button>
                <button
                  onClick={doSend}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-extrabold cursor-pointer hover:bg-fuchsia-400"
                >
                  Yes, gift it
                </button>
              </div>
            </div>
          )}

          {step === 'sending' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="text-3xl animate-pulse">🎁</div>
              <div className="text-fuchsia-200">Sending gift…</div>
            </div>
          )}

          {step === 'done' && recipient && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="text-4xl">✅</div>
              <div className="text-white text-lg font-bold text-center">
                Gift sent to {recipient.player_name}!
              </div>
              <p className="text-fuchsia-200/70 text-sm text-center max-w-xs">
                They'll see the notification next time they open the game (or
                right now if they're online).
              </p>
              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => { setStep('category'); setRecipient(null); }}
                  className="px-4 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-fuchsia-200 font-bold cursor-pointer hover:bg-black/60"
                >
                  Send another
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold cursor-pointer hover:bg-fuchsia-400"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ItemStepProps {
  category: Category;
  amount: string;
  setAmount: (v: string) => void;
  selectedItemId: string | null;
  setSelectedItemId: (v: string | null) => void;
  passwordKind: 'admin_password' | 'owner_password' | 'infinite_pancakes_password' | null;
  setPasswordKind: (v: 'admin_password' | 'owner_password' | 'infinite_pancakes_password' | null) => void;
  itemFilter: string;
  setItemFilter: (v: string) => void;
  filteredItems: Array<{ id: string; name: string }>;
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
}

function ItemStep(props: ItemStepProps) {
  const {
    category, amount, setAmount, selectedItemId, setSelectedItemId,
    passwordKind, setPasswordKind, itemFilter, setItemFilter, filteredItems,
    onBack, onNext, canProceed,
  } = props;

  const needsItemPick = category === 'building' || category === 'building_upgrade' || category === 'click_upgrade';
  const needsAmount = category === 'pancakes' || category === 'maple_stars' || category === 'building';
  const isPasswords = category === 'passwords';

  return (
    <div className="flex flex-col gap-3">
      {isPasswords && (
        <>
          <p className="text-fuchsia-200/80 text-sm">Pick a password to gift:</p>
          <div className="flex flex-col gap-2">
            {[
              { id: 'infinite_pancakes_password' as const, label: '♾️ Infinite Pancakes Password',
                desc: 'Recipient types it into the Admin Panel password box and gets ∞ pancakes.' },
              { id: 'admin_password' as const, label: '🛠️ Admin Panel Password',
                desc: 'Full Admin Panel access (capped values, all cheats).' },
              { id: 'owner_password' as const, label: '👑 Owner Panel Password',
                desc: 'Full Owner Panel access — DANGEROUS, grants live events + uncapped gifts.' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPasswordKind(p.id)}
                className="text-left px-4 py-3 rounded-lg cursor-pointer transition-all"
                style={{
                  background: passwordKind === p.id ? 'rgba(255, 100, 220, 0.18)' : 'rgba(255, 220, 255, 0.05)',
                  border: passwordKind === p.id ? '1px solid rgba(255, 100, 220, 0.7)' : '1px solid rgba(255, 100, 220, 0.25)',
                }}
              >
                <div className="text-white font-bold text-sm">{p.label}</div>
                <div className="text-fuchsia-200/70 text-xs">{p.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {needsItemPick && (
        <>
          <input
            type="text"
            value={itemFilter}
            onChange={e => setItemFilter(e.target.value)}
            placeholder={`Search ${category === 'building' ? 'buildings' : 'upgrades'}...`}
            className="w-full px-3 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-white outline-none focus:border-fuchsia-300 placeholder-fuchsia-300/50"
          />
          <ul className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {filteredItems.length === 0 && (
              <li className="text-fuchsia-200/60 text-sm italic px-2 py-3">No matches.</li>
            )}
            {filteredItems.map(it => (
              <li key={it.id}>
                <button
                  onClick={() => setSelectedItemId(it.id)}
                  className="w-full text-left px-3 py-2 rounded cursor-pointer transition-all"
                  style={{
                    background: selectedItemId === it.id ? 'rgba(255, 100, 220, 0.2)' : 'rgba(255, 220, 255, 0.04)',
                    border: selectedItemId === it.id ? '1px solid rgba(255, 100, 220, 0.65)' : '1px solid rgba(255, 100, 220, 0.2)',
                  }}
                >
                  <div className="text-white text-sm font-bold">{it.name}</div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {needsAmount && (
        <div className="flex flex-col gap-1">
          <label className="text-fuchsia-200/80 text-sm">
            {category === 'pancakes' && 'How many pancakes? (no cap — e.g. 1e50)'}
            {category === 'maple_stars' && 'How many Maple Stars?'}
            {category === 'building' && 'How many of this building?'}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="100"
            className="w-full px-3 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-white font-bold outline-none focus:border-fuchsia-300"
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg border-2 border-fuchsia-400/40 bg-black/40 text-fuchsia-200 font-bold cursor-pointer hover:bg-black/60"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 px-4 py-2 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 text-white font-bold cursor-pointer hover:bg-fuchsia-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pick recipient →
        </button>
      </div>
    </div>
  );
}

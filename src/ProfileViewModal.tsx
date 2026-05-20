import { useEffect, useState } from 'react';
import { DEFAULT_SKIN, renderSkinLayers, type PancakeSkin } from './skinEngine';
import { fetchPlayerProfile, type PlayerProfile } from './playerProfileApi';
import { formatNumber } from './gameData';
import { getPlayerId } from './leaderboardApi';
import { openPeerGift } from './peerGifter';

interface ProfileViewModalProps {
  isOpen: boolean;
  playerId: string | null;
  fallbackName?: string;   // shown while loading + if profile is empty
  onClose: () => void;
}

const FIRST_VIEW_KEY = 'pancake-profile-onboarding-seen';

export function ProfileViewModal({ isOpen, playerId, fallbackName, onClose }: ProfileViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isOpen || !playerId) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    fetchPlayerProfile(playerId)
      .then(p => setProfile(p))
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [isOpen, playerId]);

  // First-time onboarding tooltip — only the very first profile view, ever.
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (localStorage.getItem(FIRST_VIEW_KEY) !== 'true') {
        setShowOnboarding(true);
      }
    } catch { /* ignore */ }
  }, [isOpen]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try { localStorage.setItem(FIRST_VIEW_KEY, 'true'); } catch { /* ignore */ }
  };

  if (!isOpen) return null;

  const isSelf = playerId === getPlayerId();
  const skinForRender: PancakeSkin = profile?.favorite_skin ?? DEFAULT_SKIN;
  const displayName = profile?.player_name ?? fallbackName ?? 'Guest';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-pancake-cream rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-4 border-pancake-gold"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-pancake-warm border-b-2 border-pancake-gold/30 px-5 py-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-pancake-medium font-bold">
              {isSelf ? 'Your Pancake Profile' : 'Pancake Profile'}
            </p>
            <h2 className="text-xl font-extrabold text-pancake-brown truncate">{displayName}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-pancake-brown/70 hover:text-pancake-brown text-xl leading-none cursor-pointer bg-transparent border-0"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {loading && (
            <p className="text-center text-pancake-medium text-sm py-8">Loading profile…</p>
          )}
          {error && (
            <p className="text-center text-red-600 text-sm py-2">Couldn't load profile: {error}</p>
          )}
          {!loading && !error && (
            <>
              <div className="flex items-center gap-4">
                <SkinPreview skin={skinForRender} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-pancake-medium font-bold">
                    Favorite Skin
                  </p>
                  <p className="text-pancake-brown font-extrabold text-lg truncate">
                    {profile?.favorite_skin ? skinForRender.name : 'Classic Stack'}
                  </p>
                  {!profile?.favorite_skin && (
                    <p className="text-pancake-medium text-[11px] mt-0.5">
                      {isSelf ? "Change skins in the Pancake Stylist to update this." : 'No custom skin yet.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <StatRow
                  icon="🥞"
                  label="Most pancakes ever"
                  value={profile ? formatNumber(profile.peak_pancakes) : '—'}
                />
                <StatRow
                  icon="🏆"
                  label="Achievements unlocked"
                  value={profile ? Math.round(profile.achievements).toLocaleString() : '—'}
                />
                <StatRow
                  icon="📅"
                  label="Days playing Pancake Stack"
                  value={profile ? formatDaysPlayed(profile.days_played) : '—'}
                />
              </div>

              {!profile && (
                <p className="text-center text-pancake-medium text-sm italic pt-1">
                  Nothing on the leaderboard yet — say hi in chat to see them around.
                </p>
              )}

              {!isSelf && playerId && (
                <button
                  onClick={() => {
                    openPeerGift({ player_id: playerId, player_name: displayName });
                    onClose();
                  }}
                  className="w-full py-3 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-extrabold cursor-pointer hover:brightness-105 transition-all"
                >
                  🎁 Gift Pancakes
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showOnboarding && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={dismissOnboarding}
        >
          <div
            className="bg-pancake-cream rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border-2 border-pancake-gold"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 text-center">
              <div className="text-4xl">👀</div>
              <h3 className="font-extrabold text-pancake-brown text-lg mt-2">Pancake Profiles</h3>
              <p className="text-pancake-brown text-sm mt-2">
                This shows you everything other players know about a person, like:
              </p>
              <ul className="text-pancake-brown text-sm text-left mt-2 mx-auto max-w-xs">
                <li>· their favorite pancake skin</li>
                <li>· the most pancakes they've ever had</li>
                <li>· how long they've been playing</li>
                <li>· how many achievements they've unlocked</li>
              </ul>
              <p className="text-pancake-brown text-sm mt-3">
                Tap anyone's name in chat or the leaderboard to see theirs.
              </p>
              <button
                onClick={dismissOnboarding}
                className="mt-4 w-full py-2 rounded-xl border-2 border-pancake-gold bg-pancake-gold text-pancake-brown font-extrabold cursor-pointer hover:brightness-105"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/60 border border-pancake-gold/30">
      <span className="text-xl">{icon}</span>
      <span className="flex-1 text-pancake-brown text-sm">{label}</span>
      <span className="text-pancake-brown font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function SkinPreview({ skin }: { skin: PancakeSkin }) {
  // Self-contained SVG using the same renderer as the main pancake button.
  const { base, pattern, topping, text } = renderSkinLayers(skin, 'profile');
  return (
    <svg viewBox="0 0 200 200" className="w-24 h-24 drop-shadow">
      <defs>
        <radialGradient id="pancakeGradient" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#FFE082" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#C89532" stopOpacity="0" />
        </radialGradient>
        <clipPath id="pancakeClip">
          <ellipse cx="100" cy="95" rx="78" ry="45" />
        </clipPath>
      </defs>
      {base}
      {pattern}
      {topping}
      {text}
    </svg>
  );
}

function formatDaysPlayed(days: number): string {
  if (days <= 0) return 'Day 1';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? '~1 month' : `~${months} months`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? '~1 year' : `~${years} years`;
}

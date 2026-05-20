import { useGameState } from './useGameState';
import { PancakeButton } from './PancakeButton';
import { Shop } from './Shop';
import { UpgradesPanel } from './UpgradesPanel';
import { ButterPat } from './ButterPat';
import type { ButterPatEffect } from './ButterPat';
import { PrestigePanel } from './PrestigePanel';
import { AchievementsPanel } from './AchievementsPanel';
import { NewsTicker } from './NewsTicker';
import { ClickPanel } from './ClickPanel';
import { StatsPanel } from './StatsPanel';
import { AdminPanel } from './AdminPanel';
import { AdminPasswordChangeNotice } from './AdminPasswordChangeNotice';
import { MapleShop } from './MapleShop';
import { MiniGames } from './MiniGames';
import { OwnerPanel } from './OwnerPanel';
import { LiveEventsOverlay } from './LiveEventsOverlay';
import { Leaderboard } from './Leaderboard';
import { GalaxyPancake } from './GalaxyPancake';
import { PancakeStylist, PancakeStylistButton } from './PancakeStylist';
import Toast from './Toast';
import { useAuth } from './useAuth';
import { BanScreen } from './AuthModal';
import { DisplayNameModal } from './DisplayNameModal';
import { ActivePlayersModal } from './ActivePlayersModal';
import { useSkin } from './useSkin';
import { usePlayerCount } from './usePlayerCount';
import { usePlayerProfileSync } from './usePlayerProfileSync';
import { useGiftInbox } from './useGiftInbox';
import { describeGift, type ClaimedGift } from './giftsApi';
import { getPlayerId } from './leaderboardApi';
import { GiftNotification } from './GiftNotification';
import { ChatDrawer } from './ChatDrawer';
import { ProfileViewModal } from './ProfileViewModal';
import { setProfileOpener } from './profileViewer';
import { PeerGiftModal } from './PeerGiftModal';
import { setPeerGiftOpener } from './peerGifter';
import { PancakePassModal } from './PancakePassModal';
import { PancakePassCelebration } from './PancakePassCelebration';
import { usePancakePass } from './usePancakePass';
import { useSeasonalEvents } from './useSeasonalEvents';
import { EventBanner } from './EventBanner';
import { MissedEventNotice } from './MissedEventNotice';
import { usePancakeGarden } from './usePancakeGarden';
import { PancakeGardenModal } from './PancakeGardenModal';
import { formatNumber, formatCps } from './gameData';
import { playClick, playPurchase, playAchievement, playFrenzy, playButterCatch, ensureAudioReady, setMuted } from './sounds';
import { submitBaseGameScoresIfBetter } from './baseGameLeaderboard';
import { useCallback, useEffect, useRef, useState } from 'react';

const MILESTONES = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12];
const MILESTONE_LABELS = ['1,000', '10K', '100K', '1M', '10M', '100M', '1B', '10B', '100B', '1T'];

// Apply a single inbox gift to the player's local game state. Mirrors the
// uncapped mutations the OwnerPanel uses on itself. Passwords are display-only
// (rendered in the GiftNotification) so they don't mutate state here.
function applyGiftToState(
  gift: ClaimedGift,
  state: ReturnType<typeof useGameState>['state'],
  setDirectState: ReturnType<typeof useGameState>['setDirectState'],
) {
  const p = gift.payload as Record<string, unknown>;
  switch (gift.kind) {
    case 'pancakes': {
      const n = Number(p.amount);
      if (!Number.isFinite(n) || n <= 0) return;
      const next = state.cookies + n;
      setDirectState({
        cookies: next,
        totalBaked: state.totalBaked + n,
        lifetimeBaked: state.lifetimeBaked + n,
        peakCookies: Math.max(state.peakCookies, next),
      });
      return;
    }
    case 'building': {
      const id = String(p.buildingId ?? '');
      const n = Math.floor(Number(p.amount));
      if (!id || !Number.isFinite(n) || n <= 0) return;
      setDirectState({
        buildingCounts: { ...state.buildingCounts, [id]: (state.buildingCounts[id] ?? 0) + n },
      });
      return;
    }
    case 'building_upgrade': {
      const id = String(p.upgradeId ?? '');
      if (!id) return;
      setDirectState({
        purchasedUpgrades: { ...state.purchasedUpgrades, [id]: true },
      });
      return;
    }
    case 'click_upgrade': {
      const id = String(p.upgradeId ?? '');
      if (!id) return;
      setDirectState({
        purchasedClickUpgrades: { ...state.purchasedClickUpgrades, [id]: true },
      });
      return;
    }
    case 'maple_stars': {
      const n = Math.floor(Number(p.amount));
      if (!Number.isFinite(n) || n <= 0) return;
      setDirectState({ sugarStars: state.sugarStars + n });
      return;
    }
    case 'admin_password':
    case 'owner_password':
    case 'infinite_pancakes_password':
      // No state mutation — the GiftNotification reveals the password and
      // the recipient redeems it manually in the matching panel.
      return;
  }
}

function App() {
  const {
    state, cps, baseCps, clickPower, frenzyMult, frenzyEnd,
    newStarsOnPrestige, canPrestige,
    clickCookie, buyBuilding, buyUpgrade, buyClickUpgrade,
    prestige, activateFrenzy, addCookies, incrementGoldenCaught,
    buyPrestigeUpgrade, prestigeEffects,
    newAchievement, setNewAchievement, offlineCookies,
    setDirectState, grantAllAchievements, resetSave, simulateTime,
    cpsOverride, setCpsOverride, clickOverride, setClickOverride,
  } = useGameState();
  const [showWelcome, setShowWelcome] = useState(offlineCookies > 0);
  const [adminOpen, setAdminOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [mapleShopOpen, setMapleShopOpen] = useState(false);
  const [forceButterSpawn, setForceButterSpawn] = useState(0);
  const [miniGamesOpen, setMiniGamesOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [galaxyOpen, setGalaxyOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [stylistOpen, setStylistOpen] = useState(false);
  const { skin, setSkin, ownedSkinIds, addOwnedSkin } = useSkin();
  const auth = useAuth();
  const presenceLocalName = auth.profile?.display_name
    ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('pancake-player-name') ?? undefined : undefined);
  const presence = usePlayerCount(presenceLocalName);
  const playerCount = presence.count;
  const [activePlayersOpen, setActivePlayersOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState<{ playerId: string; name?: string } | null>(null);
  useEffect(() => {
    setProfileOpener((playerId, fallbackName) => setProfileTarget({ playerId, name: fallbackName }));
    return () => setProfileOpener(null);
  }, []);

  const [peerGiftPreset, setPeerGiftPreset] = useState<{ player_id: string; player_name: string } | null | undefined>(undefined);
  // undefined = modal closed; null = open with no preset; object = open with preset.
  useEffect(() => {
    setPeerGiftOpener(preset => setPeerGiftPreset(preset ?? null));
    return () => setPeerGiftOpener(null);
  }, []);

  // Pancake Pass: auto-claims any tier whose threshold is ≤ peakCookies,
  // applies the reward through setDirectState, and queues a celebration.
  const [passOpen, setPassOpen] = useState(false);
  const { newlyClaimed, dismissCelebration } = usePancakePass({ state, setDirectState });

  // Pancake Garden — real-time growing plot. Active passive bonuses are
  // mirrored to a module-level ref the CpS/click calc reads.
  const [gardenOpen, setGardenOpen] = useState(false);
  const garden = usePancakeGarden({ state, setDirectState, cps, addCookies });

  // Seasonal events: detect active event from DB, apply themes, claim
  // reward → add the limited-edition skin to ownedSkinIds. Also surfaces
  // events the player missed for the "come back next year" notice.
  const { activeEvent, missedQueue, dismissMissed } = useSeasonalEvents({
    playerId: getPlayerId(),
    onReward: (skinId) => {
      addOwnedSkin(skinId);
      setToast(`🎁 You earned a limited-edition skin! Open the Pancake Stylist to equip it.`);
      window.setTimeout(() => setToast(null), 5000);
    },
  });
  const rewardClaimedForActive = activeEvent
    ? ownedSkinIds.includes(activeEvent.reward_skin_id)
    : false;

  // First-time profile celebration: after the player claims a display name,
  // open their own profile once so they see what others will see. Gated by
  // localStorage so it only ever fires on the first claim.
  const claimedName = auth.profile?.display_name;
  useEffect(() => {
    if (!claimedName) return;
    try {
      if (localStorage.getItem('pancake-profile-celebrated') === 'true') return;
      localStorage.setItem('pancake-profile-celebrated', 'true');
    } catch { return; }
    setProfileTarget({ playerId: getPlayerId(), name: claimedName });
  }, [claimedName]);

  // Keep the public player profile (skin + name) in sync with the server so
  // other players see the current values when they click this user's name.
  usePlayerProfileSync({
    playerId: getPlayerId(),
    playerName: presenceLocalName ?? 'Guest',
    skin,
  });

  // Gift inbox — claim on boot, subscribe live, queue notifications, apply.
  // Kept in a ref-driven shape so the receiver hook closure always sees the
  // latest state when summing existing pancakes / building counts.
  const [giftQueue, setGiftQueue] = useState<ClaimedGift[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const handleIncomingGift = useCallback((g: ClaimedGift) => {
    applyGiftToState(g, stateRef.current, setDirectState);
    setGiftQueue(q => [...q, g]);
  }, [setDirectState]);
  useGiftInbox({ playerId: getPlayerId(), onGift: handleIncomingGift });

  // Init audio on first interaction
  useEffect(() => {
    const handler = () => {
      ensureAudioReady();
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Auto-submit base-game stats to leaderboard every 15s when a new high is reached.
  const baseStatsRef = useRef({ base_pancakes: 0, base_pps: 0, base_click: 0, base_achievements: 0 });
  baseStatsRef.current = {
    base_pancakes: state.peakCookies,
    base_pps: baseCps,
    base_click: clickPower,
    base_achievements: Object.keys(state.unlockedAchievements).filter(k => state.unlockedAchievements[k]).length,
  };
  useEffect(() => {
    const submit = () => submitBaseGameScoresIfBetter(baseStatsRef.current);
    const initial = setTimeout(submit, 5000);
    const id = setInterval(submit, 15000);
    return () => { clearTimeout(initial); clearInterval(id); };
  }, []);

  // // "Order up!" voice — disabled for now (browser TTS sounds bad)
  // useEffect(() => {
  //   if (!state.buildingCounts.cook || state.buildingCounts.cook < 1) return;
  //   const id = setInterval(() => {
  //     playOrderUp();
  //   }, 3000);
  //   return () => clearInterval(id);
  // }, [state.buildingCounts.cook]);

  // Milestone tracking
  const lastMilestoneIdx = useRef(-1);
  const totalBakedRef = useRef(state.totalBaked);
  totalBakedRef.current = state.totalBaked;

  useEffect(() => {
    // Initialize to current milestone level
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (totalBakedRef.current >= MILESTONES[i]) {
        lastMilestoneIdx.current = i;
        break;
      }
    }

    const id = setInterval(() => {
      for (let i = lastMilestoneIdx.current + 1; i < MILESTONES.length; i++) {
        if (totalBakedRef.current >= MILESTONES[i]) {
          lastMilestoneIdx.current = i;
          setCelebration(MILESTONE_LABELS[i]);
          playAchievement();
          setTimeout(() => setCelebration(null), 3000);
        } else {
          break;
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Welcome back
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // Achievement toast + sound
  useEffect(() => {
    if (newAchievement) {
      setToast(`🏆 ${newAchievement}!`);
      playAchievement();
      setNewAchievement(null);
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [newAchievement, setNewAchievement]);

  // Pancake click with sound + shake
  const handleClick = useCallback(() => {
    clickCookie();
    playClick();
    setShaking(true);
    setTimeout(() => setShaking(false), 100);
  }, [clickCookie]);

  // Building purchase with sound
  const handleBuyBuilding = useCallback((id: string, count: number) => {
    buyBuilding(id, count);
    playPurchase();
  }, [buyBuilding]);

  // Upgrade purchase with sound
  const handleBuyUpgrade = useCallback((id: string) => {
    buyUpgrade(id);
    playPurchase();
  }, [buyUpgrade]);

  const handleBuyClickUpgrade = useCallback((id: string) => {
    buyClickUpgrade(id);
    playPurchase();
  }, [buyClickUpgrade]);

  // Butter pat catch with sound + frenzy combo
  const handleButterPatCatch = useCallback((effect: ButterPatEffect) => {
    incrementGoldenCaught();
    playButterCatch();
    if (effect.type === 'frenzy' && effect.duration) {
      activateFrenzy(7, effect.duration);
      playFrenzy();
    } else if (effect.type === 'lucky' && effect.pancakeGain) {
      addCookies(effect.pancakeGain);
    }
    setToast(effect.label);
    setTimeout(() => setToast(null), 3000);
  }, [activateFrenzy, addCookies, incrementGoldenCaught]);

  const toggleMute = () => {
    const newMuted = !muted;
    setMutedState(newMuted);
    setMuted(newMuted);
  };

  const frenzySecondsLeft = frenzyEnd > 0 ? Math.max(0, Math.ceil((frenzyEnd - Date.now()) / 1000)) : 0;
  const isFrenzy = frenzyMult > 1;

  return (
    <div className="w-full h-full flex flex-col bg-pancake-bg">
      {/* News Ticker */}
      <NewsTicker cps={cps} totalBaked={state.totalBaked} />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Butter Pat */}
        <ButterPat
          cps={baseCps}
          pancakes={state.cookies}
          onCatch={handleButterPatCatch}
          forceSpawn={forceButterSpawn}
          butterSpeedPercent={prestigeEffects.butterSpeedPercent}
          luckyMultiplier={prestigeEffects.luckyMultiplier}
          frenzyDurationPercent={prestigeEffects.frenzyDurationPercent}
        />

        {/* Frenzy golden overlay */}
        {isFrenzy && (
          <div className="fixed inset-0 pointer-events-none z-30 bg-pancake-gold/8 animate-pulse" />
        )}

        {/* Toast notification */}
        {toast && (
          <Toast key={toast} message={toast} onDismiss={() => setToast(null)} />
        )}

        {/* Milestone celebration */}
        {celebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
              className="font-bold text-pancake-gold animate-bounce"
              style={{
                fontSize: 'clamp(3rem, 8vw, 6rem)',
                textShadow: '0 0 30px rgba(255,215,0,0.6), 0 4px 8px rgba(0,0,0,0.3)',
              }}
            >
              {celebration} pancakes!
            </div>
          </div>
        )}

        {/* Welcome back overlay */}
        {showWelcome && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowWelcome(false)}
          >
            <div className="bg-pancake-cream rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4">
              <div className="text-4xl mb-3">🥞</div>
              <h2 className="text-2xl font-bold text-pancake-brown mb-2">Welcome Back!</h2>
              <p className="text-pancake-dark text-lg">
                Your griddle made <span className="font-bold text-pancake-medium">{formatNumber(offlineCookies)}</span> pancakes while you were away!
              </p>
              <p className="text-pancake-medium text-sm mt-3">Tap to continue</p>
            </div>
          </div>
        )}

        {/* Main game area */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden"
          style={shaking ? { animation: 'screen-shake 0.1s ease-in-out' } : undefined}
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-10 left-10 text-6xl">🥞</div>
            <div className="absolute top-20 right-20 text-4xl">🥞</div>
            <div className="absolute bottom-20 left-20 text-5xl">🥞</div>
            <div className="absolute bottom-10 right-10 text-6xl">🥞</div>
          </div>

          {/* Top-left navigation cluster — pill buttons matching the live-
              player and chat badges so they feel like one toolbar, not a
              stray emoji floating in the corner. */}
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10">
            <button
              onClick={() => setMiniGamesOpen(true)}
              className="text-[11px] text-pancake-brown/90 bg-pancake-cream/85 backdrop-blur-sm rounded-full pl-1.5 pr-2.5 py-0.5 leading-tight whitespace-nowrap border border-pancake-gold/40 shadow-sm cursor-pointer hover:bg-pancake-cream hover:scale-105 transition-all flex items-center gap-1 font-bold"
              title="Mini Games — 17 quick games + leaderboards"
            >
              <span className="text-sm">🎮</span> Mini Games
            </button>
            <button
              onClick={() => setGardenOpen(true)}
              className="text-[11px] text-green-900/90 bg-green-50/85 backdrop-blur-sm rounded-full pl-1.5 pr-2.5 py-0.5 leading-tight whitespace-nowrap border border-green-400/40 shadow-sm cursor-pointer hover:bg-green-100 hover:scale-105 transition-all flex items-center gap-1 font-bold"
              title="Pancake Garden — grow plants over real time for passive bonuses"
            >
              <span className="text-sm">🌱</span> Garden
            </button>
            <button
              onClick={() => setActivePlayersOpen(true)}
              className="text-[10px] text-pancake-brown/85 bg-pancake-cream/80 backdrop-blur-sm rounded-full px-2 py-0.5 leading-tight whitespace-nowrap border border-pancake-gold/30 shadow-sm cursor-pointer hover:bg-pancake-cream transition-colors"
              title="See who's playing right now"
            >
              🥞 <span className="font-bold">{playerCount}</span> playing · including you
            </button>
            <button
              onClick={() => setChatOpen(true)}
              className="text-[10px] text-pancake-brown/85 bg-pancake-cream/80 backdrop-blur-sm rounded-full px-2 py-0.5 leading-tight whitespace-nowrap border border-pancake-gold/30 shadow-sm cursor-pointer hover:bg-pancake-cream transition-colors"
              title="Open live chat"
            >
              💬 Chat
            </button>
          </div>

          {/* Top-right buttons */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
            <div className="flex gap-1">
              {state.sugarStars > 0 && (
                <button
                  onClick={() => setMapleShopOpen(true)}
                  className="text-lg cursor-pointer bg-transparent border-0 opacity-60 hover:opacity-100 transition-opacity"
                  title="Maple Star Shop"
                >
                  🍁
                </button>
              )}
              <button
                onClick={() => setPassOpen(true)}
                className="text-lg cursor-pointer bg-transparent border-0 opacity-50 hover:opacity-100 transition-opacity"
                title="Pancake Pass"
              >
                🎖️
              </button>
              <button
                onClick={() => setLeaderboardOpen(true)}
                className="text-lg cursor-pointer bg-transparent border-0 opacity-50 hover:opacity-100 transition-opacity"
                title="Leaderboard"
              >
                🏆
              </button>
              {/* The "admin" button — disguised as a cryptic </> symbol to bait
                  the curious into trying the password. */}
              <button
                onClick={() => setAdminOpen(true)}
                className="font-mono font-extrabold text-base cursor-pointer bg-transparent border-0 opacity-65 hover:opacity-100 hover:scale-110 transition-all leading-none px-1 tracking-tighter"
                style={{
                  color: '#B8860B',
                  textShadow: '0 0 8px rgba(212,160,23,0.45)',
                  letterSpacing: '-0.05em',
                }}
                title="</>"
              >
                {'</>'}
              </button>
              {/* The glitchy </> — owner panel. Same shape as the admin button
                  so the curious see them as a pair. */}
              <button
                onClick={() => setOwnerOpen(true)}
                className="glitch-btn font-mono font-extrabold text-base cursor-pointer bg-transparent border-0 opacity-65 hover:opacity-100 hover:scale-110 transition-all leading-none px-1 tracking-tighter"
                style={{
                  color: '#B8860B',
                  letterSpacing: '-0.05em',
                }}
                title="</>"
                data-text="</>"
              >
                {'</>'}
              </button>
              <button
                onClick={toggleMute}
                className="text-lg cursor-pointer bg-transparent border-0 opacity-40 hover:opacity-100 transition-opacity"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </div>
            {/* Galaxy pancake — secret password gate to infinite pancakes */}
            <button
              onClick={() => setGalaxyOpen(true)}
              title="Galaxy Pancake"
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm cursor-pointer border border-fuchsia-400/40 bg-[radial-gradient(circle_at_30%_30%,#a855f7_0%,#7c3aed_25%,#1e1b4b_60%,#000_100%)] shadow-[0_0_8px_rgba(168,85,247,0.55)] hover:scale-110 transition-transform"
            >
              🥞
            </button>
          </div>

          {/* Butter Rush indicator */}
          {isFrenzy && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-pancake-gold/90 text-pancake-brown font-bold px-4 py-2 rounded-full text-sm shadow-lg animate-pulse">
              BUTTER RUSH x{frenzyMult} — {frenzySecondsLeft}s
            </div>
          )}

          {/* Title — Maple Star pill shrinks as the number grows so big
              prestige counts don't blow out the header on mobile. */}
          <h1 className="text-3xl md:text-4xl font-bold text-pancake-brown mb-1 tracking-tight flex items-baseline flex-wrap gap-2 justify-center">
            <span>Pancake Stack</span>
            {state.sugarStars > 0 && (
              <span
                className={`text-pancake-gold font-bold tabular-nums whitespace-nowrap ${
                  state.sugarStars >= 1e9   ? 'text-[10px]'
                : state.sugarStars >= 1e6   ? 'text-xs'
                : state.sugarStars >= 1e4   ? 'text-sm'
                : state.sugarStars >= 1000  ? 'text-base'
                                            : 'text-lg'
                }`}
                title={`${state.sugarStars.toLocaleString()} Maple Stars`}
              >
                🍁 {formatNumber(state.sugarStars)}
              </span>
            )}
          </h1>

          {/* Pancake count */}
          <div className="text-center mb-4">
            <div className="text-4xl md:text-5xl font-bold text-pancake-dark tabular-nums">
              🥞 {formatNumber(state.cookies)}
            </div>
            <div className="text-sm text-pancake-medium mt-1">
              {cps > 0 && `${formatCps(cps)} per second`}
              {clickPower > 1 && <span className="ml-2">| {formatNumber(clickPower)}/click</span>}
            </div>
          </div>

          {/* The Big Pancake */}
          <PancakeButton onClick={handleClick} clickPower={clickPower} frenzy={isFrenzy} skin={skin} />

          {/* Pancake stylist — smiley pancake sidekick */}
          <PancakeStylistButton onClick={() => setStylistOpen(true)} />

          {/* Stats bar */}
          <div className="mt-4 flex gap-4 text-xs text-pancake-medium">
            <span>Total flipped: {formatNumber(state.totalBaked)}</span>
            <span>Clicks: {formatNumber(state.totalClicks)}</span>
          </div>
        </div>

        {/* Shop panel */}
        <div className="w-full md:w-80 lg:w-96 bg-shop-bg border-t md:border-t-0 md:border-l-2 border-shop-border flex-shrink-0 h-[40vh] md:h-full overflow-y-auto">
          <ClickPanel
            clickPower={clickPower}
            cookies={state.cookies}
            purchasedClickUpgrades={state.purchasedClickUpgrades}
            totalClicks={state.totalClicks}
            totalBaked={state.totalBaked}
            cps={baseCps}
            onBuyClickUpgrade={handleBuyClickUpgrade}
          />
          <UpgradesPanel
            cookies={state.cookies}
            buildingCounts={state.buildingCounts}
            purchasedUpgrades={state.purchasedUpgrades}
            onBuyUpgrade={handleBuyUpgrade}
          />
          <Shop
            cookies={state.cookies}
            buildingCounts={state.buildingCounts}
            purchasedUpgrades={state.purchasedUpgrades}
            sugarStars={state.sugarStars}
            onBuy={handleBuyBuilding}
            cps={cps}
          />
          <PrestigePanel
            sugarStars={state.sugarStars}
            newStarsOnPrestige={newStarsOnPrestige}
            canPrestige={canPrestige}
            prestigeCount={state.prestigeCount}
            lifetimeBaked={state.lifetimeBaked}
            onPrestige={prestige}
          />
          <StatsPanel state={state} cps={cps} clickPower={clickPower} />
          <AchievementsPanel
            unlockedAchievements={state.unlockedAchievements}
          />
        </div>
      </div>

      <MiniGames
        isOpen={miniGamesOpen}
        onClose={() => setMiniGamesOpen(false)}
        onOpenGarden={() => setGardenOpen(true)}
      />

      <PancakeGardenModal
        isOpen={gardenOpen}
        onClose={() => setGardenOpen(false)}
        tiles={garden.tiles}
        bonuses={garden.bonuses}
        discovered={state.garden?.discovered ?? {}}
        cps={cps}
        onPlant={garden.plant}
        onHarvest={garden.harvest}
        onClear={garden.clear}
        discoveryNotice={garden.discoveryNotice}
        onDismissDiscovery={garden.dismissDiscovery}
      />

      <OwnerPanel
        isOpen={ownerOpen}
        onClose={() => setOwnerOpen(false)}
        state={state}
        cps={cps}
        clickPower={clickPower}
        frenzyMult={frenzyMult}
        setDirectState={setDirectState}
        grantAllAchievements={grantAllAchievements}
        resetSave={resetSave}
        simulateTime={simulateTime}
        activateFrenzy={activateFrenzy}
        onForceButterPat={() => setForceButterSpawn(n => n + 1)}
        onSetCpsOverride={setCpsOverride}
        onSetClickOverride={setClickOverride}
        cpsOverride={cpsOverride}
        clickOverride={clickOverride}
        ownerDisplayName={presenceLocalName ?? 'Owner'}
      />

      <LiveEventsOverlay />

      <DisplayNameModal
        isOpen={!auth.loading && auth.needsDisplayName}
        initialName={localStorage.getItem('pancake-player-name') ?? ''}
        onSubmit={auth.claimDisplayName}
      />

      {auth.ban.banned && (
        <BanScreen
          reason={auth.ban.reason}
          onSignOut={() => {
            try { localStorage.removeItem('pancake-player-name'); } catch { /* ignore */ }
            auth.signOut().finally(() => window.location.reload());
          }}
        />
      )}

      <Leaderboard
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
      />

      {activePlayersOpen && (
        <ActivePlayersModal
          players={presence.players}
          onClose={() => setActivePlayersOpen(false)}
        />
      )}

      {giftQueue.length > 0 && (
        <GiftNotification
          message={describeGift(giftQueue[0])}
          remainingCount={giftQueue.length - 1}
          onDismiss={() => setGiftQueue(q => q.slice(1))}
        />
      )}

      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        playerId={getPlayerId()}
        playerName={presenceLocalName ?? 'Guest'}
      />

      <ProfileViewModal
        isOpen={profileTarget !== null}
        playerId={profileTarget?.playerId ?? null}
        fallbackName={profileTarget?.name}
        onClose={() => setProfileTarget(null)}
      />

      {activeEvent && (
        <EventBanner event={activeEvent} rewardClaimed={rewardClaimedForActive} />
      )}

      {missedQueue.length > 0 && (
        <MissedEventNotice
          key={missedQueue[0].id}
          event={missedQueue[0]}
          remainingCount={missedQueue.length - 1}
          onDismiss={() => dismissMissed(missedQueue[0].id)}
        />
      )}

      <PancakePassModal
        isOpen={passOpen}
        onClose={() => setPassOpen(false)}
        peakCookies={state.peakCookies}
        claimed={state.pancakePassClaimed ?? {}}
      />

      {newlyClaimed.length > 0 && (
        <PancakePassCelebration
          key={newlyClaimed[0].key}
          tier={newlyClaimed[0]}
          onDismiss={() => dismissCelebration(newlyClaimed[0].key)}
        />
      )}

      <PeerGiftModal
        isOpen={peerGiftPreset !== undefined}
        onClose={() => setPeerGiftPreset(undefined)}
        senderPlayerId={getPlayerId()}
        senderName={presenceLocalName ?? 'Guest'}
        senderPancakes={state.cookies}
        onDeduct={(amount) => {
          const next = state.cookies - amount;
          setDirectState({
            cookies: next < 0 ? 0 : next,
            // Don't reduce totalBaked / peakCookies — those track all-time
            // achievement, not current spendable. Same convention as buying
            // a building.
          });
        }}
        presetRecipient={peerGiftPreset ?? null}
      />

      <GalaxyPancake
        isOpen={galaxyOpen}
        onClose={() => setGalaxyOpen(false)}
        onGrantInfinity={() => {
          // True Infinity. Galaxy Pancake is the ONLY path to this; the
          // Admin Panel clamps to 999e33 and the Owner Panel rejects
          // non-finite inputs, so no other unlock can reach this state.
          const inf = Number.POSITIVE_INFINITY;
          setDirectState({
            cookies: inf,
            totalBaked: inf,
            lifetimeBaked: inf,
            peakCookies: inf,
          });
        }}
      />

      <PancakeStylist
        isOpen={stylistOpen}
        onClose={() => setStylistOpen(false)}
        skin={skin}
        onSkinChange={setSkin}
        cookies={state.cookies}
        ownedSkinIds={ownedSkinIds}
        onPurchase={(shopSkin) => {
          if (state.cookies < shopSkin.price) return;
          const nextCookies = state.cookies === Number.POSITIVE_INFINITY
            ? Number.POSITIVE_INFINITY
            : state.cookies - shopSkin.price;
          setDirectState({ cookies: nextCookies });
          addOwnedSkin(shopSkin.id);
          setSkin(shopSkin.skin);
        }}
      />

      <MapleShop
        isOpen={mapleShopOpen}
        onClose={() => setMapleShopOpen(false)}
        sugarStars={state.sugarStars}
        purchasedPrestigeUpgrades={state.purchasedPrestigeUpgrades}
        onBuy={buyPrestigeUpgrade}
      />

      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        state={state}
        cps={cps}
        baseCps={baseCps}
        clickPower={clickPower}
        frenzyMult={frenzyMult}
        setDirectState={setDirectState}
        addCookies={addCookies}
        grantAllAchievements={grantAllAchievements}
        resetSave={resetSave}
        simulateTime={simulateTime}
        activateFrenzy={activateFrenzy}
        onForceButterPat={() => setForceButterSpawn(prev => prev + 1)}
        onSetCpsOverride={setCpsOverride}
        onSetClickOverride={setClickOverride}
        cpsOverride={cpsOverride}
        clickOverride={clickOverride}
        clickCookie={clickCookie}
      />

      <AdminPasswordChangeNotice addCookies={addCookies} />

      <style>{`
        @keyframes screen-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) translateY(1px); }
          50% { transform: translateX(2px) translateY(-1px); }
          75% { transform: translateX(-1px) translateY(1px); }
        }
      `}</style>
    </div>
  );
}

export default App;

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
import { MapleShop } from './MapleShop';
import { MiniGames } from './MiniGames';
import { formatNumber, formatCps } from './gameData';
import { playClick, playPurchase, playAchievement, playFrenzy, playButterCatch, playOrderUp, ensureAudioReady, isMuted, setMuted } from './sounds';
import { useCallback, useEffect, useRef, useState } from 'react';

const MILESTONES = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12];
const MILESTONE_LABELS = ['1,000', '10K', '100K', '1M', '10M', '100M', '1B', '10B', '100B', '1T'];

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
  const [mapleShopOpen, setMapleShopOpen] = useState(false);
  const [forceButterSpawn, setForceButterSpawn] = useState(0);
  const [miniGamesOpen, setMiniGamesOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);

  // Init audio on first interaction
  useEffect(() => {
    const handler = () => {
      ensureAudioReady();
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
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
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-pancake-gold text-pancake-brown font-bold px-6 py-3 rounded-full shadow-lg text-sm md:text-base animate-bounce whitespace-nowrap">
            {toast}
          </div>
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

          {/* Mini games button (top left) */}
          <button
            onClick={() => setMiniGamesOpen(true)}
            className="absolute top-2 left-2 text-lg cursor-pointer bg-transparent border-0 opacity-50 hover:opacity-100 transition-opacity z-10"
            title="Mini Games"
          >
            🎮
          </button>

          {/* Top-right buttons */}
          <div className="absolute top-2 right-2 flex gap-1 z-10">
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
              onClick={() => setAdminOpen(true)}
              className="text-lg cursor-pointer bg-transparent border-0 opacity-40 hover:opacity-100 transition-opacity"
              title="Admin Panel"
            >
              ⚙️
            </button>
            <button
              onClick={toggleMute}
              className="text-lg cursor-pointer bg-transparent border-0 opacity-40 hover:opacity-100 transition-opacity"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>

          {/* Butter Rush indicator */}
          {isFrenzy && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-pancake-gold/90 text-pancake-brown font-bold px-4 py-2 rounded-full text-sm shadow-lg animate-pulse">
              BUTTER RUSH x{frenzyMult} — {frenzySecondsLeft}s
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-pancake-brown mb-1 tracking-tight">
            Pancake Stack
            {state.sugarStars > 0 && (
              <span className="text-lg ml-2 text-pancake-gold">({state.sugarStars} Maple Stars)</span>
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
          <PancakeButton onClick={handleClick} clickPower={clickPower} frenzy={isFrenzy} />

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
      />

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

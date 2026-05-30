import { useEffect, useMemo, useState } from 'react';
import type { ActiveSeasonalEvent } from './seasonalEventsApi';
import { findSeasonalEvent } from './seasonalEvents';

// Visual layer for the active seasonal event:
//   * fullscreen tint wash (e.g. Halloween orange)
//   * themed emoji rain (e.g. 🎃 pumpkins, 🎄 trees, 💖 hearts)
//   * one-shot "EVENT JUST STARTED" announcement banner (auto-fades)
//
// All effects are local per-client. They mount when an ActiveSeasonalEvent
// is present and unmount when it goes null — so the parent (App) is
// responsible for toggling render based on the useSeasonalEvents hook.

const ANNOUNCE_DURATION_MS = 6000;
// localStorage key tracking the last event ID we showed the announce banner
// for. Prevents the banner re-popping every time the player closes/reopens
// the tab while an event is live.
const ANNOUNCED_KEY = 'pancake-seasonal-announced-v1';

interface SeasonalEffectProps {
  event: ActiveSeasonalEvent;
}

export function SeasonalEffect({ event }: SeasonalEffectProps) {
  const template = findSeasonalEvent(event.catalog_id);
  const theme = template?.themeConfig;
  const [showAnnounce, setShowAnnounce] = useState(false);

  useEffect(() => {
    if (!theme) return;
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(ANNOUNCED_KEY) === event.id;
    } catch { /* ignore */ }
    if (alreadySeen) return;
    setShowAnnounce(true);
    try { localStorage.setItem(ANNOUNCED_KEY, event.id); } catch { /* ignore */ }
    const id = window.setTimeout(() => setShowAnnounce(false), ANNOUNCE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [event.id, theme]);

  if (!theme) return null;

  return (
    <>
      <style>{SEASONAL_KEYFRAMES}</style>
      {/* Z-index sits above gameplay but below modals (modals use z-50/z-55).
          Pointer-events-none so the player can still tap through everything. */}
      <div className="fixed inset-0 z-[40] pointer-events-none overflow-hidden">
        <TintWash
          css={theme.tintCss}
          opacity={theme.tintOpacity}
          blendMode={theme.tintBlendMode}
        />
        <EmojiRain emoji={theme.fallEmoji} count={theme.fallCount} seed={event.id} />
      </div>
      {showAnnounce && (
        <AnnounceBanner
          text={theme.announceText}
          subtext={theme.announceSubtext}
          tintColor={theme.accentColor}
        />
      )}
    </>
  );
}

function TintWash({
  css, opacity, blendMode,
}: { css: string; opacity: number; blendMode: 'normal' | 'screen' | 'overlay' | 'multiply' | 'soft-light' }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: css,
        opacity,
        mixBlendMode: blendMode,
        animation: 'seasonal-tint-breathe 6s ease-in-out infinite',
      }}
    />
  );
}

interface RainItem {
  key: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  rot: number;
}

function EmojiRain({ emoji, count, seed }: { emoji: string; count: number; seed: string }) {
  const items = useMemo<RainItem[]>(() => {
    // Deterministic-ish layout per event id so re-renders don't reshuffle
    // mid-animation. Pseudo-random spread is plenty for visual variety.
    const out: RainItem[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        key: `${seed}-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 4 + Math.random() * 5,
        size: 0.9 + Math.random() * 1.1,
        drift: (Math.random() - 0.5) * 80,
        rot: (Math.random() - 0.5) * 90,
      });
    }
    return out;
  }, [count, seed]);

  return (
    <>
      {items.map(it => (
        <div
          key={it.key}
          className="absolute select-none"
          style={{
            left: `${it.left}%`,
            top: '-10%',
            fontSize: `${1.4 * it.size}rem`,
            animation: `seasonal-fall ${it.duration}s linear ${it.delay}s infinite`,
            ['--drift' as string]: `${it.drift}px`,
            ['--rot' as string]: `${it.rot}deg`,
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
          }}
        >
          {emoji}
        </div>
      ))}
    </>
  );
}

function AnnounceBanner({
  text, subtext, tintColor,
}: { text: string; subtext: string; tintColor: string }) {
  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[49] pointer-events-none px-3 w-full max-w-md">
      <div
        className="rounded-2xl shadow-2xl border-4 px-5 py-4 text-center"
        style={{
          background: 'rgba(255, 248, 225, 0.95)',
          borderColor: tintColor,
          boxShadow: `0 0 28px ${tintColor}55, 0 8px 24px rgba(0,0,0,0.3)`,
          animation: `seasonal-announce ${ANNOUNCE_DURATION_MS}ms ease-out forwards`,
        }}
      >
        <div className="font-extrabold text-pancake-brown text-xl leading-tight">
          {text}
        </div>
        <div className="text-pancake-medium text-sm mt-1.5">
          {subtext}
        </div>
      </div>
    </div>
  );
}

const SEASONAL_KEYFRAMES = `
@keyframes seasonal-fall {
  0%   { transform: translate(0, 0) rotate(0); }
  100% { transform: translate(var(--drift, 0), 115vh) rotate(var(--rot, 0)); }
}
@keyframes seasonal-tint-breathe {
  0%, 100% { opacity: var(--start-opacity, 0.85); }
  50%      { opacity: 1; }
}
@keyframes seasonal-announce {
  0%   { transform: scale(0.5) translateY(-30px); opacity: 0; }
  10%  { transform: scale(1.05) translateY(0); opacity: 1; }
  20%  { transform: scale(1) translateY(0); }
  80%  { transform: scale(1) translateY(0); opacity: 1; }
  100% { transform: scale(0.95) translateY(-10px); opacity: 0; }
}
`;

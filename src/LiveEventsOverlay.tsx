import { useEffect, useState, useMemo } from 'react';

export const LIVE_EVENT_IDS = [
  'pancake-rain',
  'fire',
  'underwater',
  'rainbow',
  'snow',
  'lightning',
  'disco',
  'confetti',
  'earthquake',
] as const;
export type LiveEventId = typeof LIVE_EVENT_IDS[number];

export interface LiveEventMeta {
  id: LiveEventId;
  label: string;
  desc: string;
}

export const LIVE_EVENT_META: LiveEventMeta[] = [
  { id: 'pancake-rain', label: '🥞 Pancake Rain', desc: 'Pancakes fall from the sky' },
  { id: 'fire',        label: '🔥 Fire',          desc: 'Everything is on fire' },
  { id: 'underwater',  label: '🌊 Underwater',    desc: 'Submerged in blue + bubbles' },
  { id: 'rainbow',     label: '🌈 Rainbow',       desc: 'Rainbow gradient swirls' },
  { id: 'snow',        label: '❄️ Snow',          desc: 'Snowflakes drift down' },
  { id: 'lightning',   label: '⚡ Lightning',     desc: 'Storm with bright flashes' },
  { id: 'disco',       label: '🪩 Disco',         desc: 'Color strobe party' },
  { id: 'confetti',    label: '🎊 Confetti',      desc: 'Confetti rains down' },
  { id: 'earthquake',  label: '🌍 Earthquake',    desc: 'Screen shakes constantly' },
];

const STORAGE_KEY = 'pancake-live-events';
const UPDATE_EVENT = 'pancake-live-events-update';
const SCREEN_TEXT_EVENT = 'pancake-screen-text';

type EventState = Record<string, boolean>;

export function readLiveEvents(): EventState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

export function writeLiveEvents(state: EventState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function setLiveEvent(id: LiveEventId, on: boolean) {
  const next = { ...readLiveEvents() };
  if (on) next[id] = true;
  else delete next[id];
  writeLiveEvents(next);
}

export function clearAllLiveEvents() {
  writeLiveEvents({});
}

export function broadcastScreenText(text: string, durationMs = 6000) {
  window.dispatchEvent(new CustomEvent(SCREEN_TEXT_EVENT, {
    detail: { text, durationMs },
  }));
}

export function LiveEventsOverlay() {
  const [events, setEvents] = useState<EventState>(() => readLiveEvents());
  const [screenText, setScreenText] = useState<string | null>(null);

  useEffect(() => {
    const onUpdate = () => setEvents(readLiveEvents());
    window.addEventListener(UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(UPDATE_EVENT, onUpdate);
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    const onText = (e: Event) => {
      const detail = (e as CustomEvent).detail as { text: string; durationMs: number };
      setScreenText(detail.text);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScreenText(null), detail.durationMs);
    };
    window.addEventListener(SCREEN_TEXT_EVENT, onText);
    return () => {
      window.removeEventListener(SCREEN_TEXT_EVENT, onText);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!events.earthquake) return;
    document.body.classList.add('owner-quake');
    return () => document.body.classList.remove('owner-quake');
  }, [events.earthquake]);

  return (
    <>
      <style>{LIVE_EVENT_STYLES}</style>
      <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
        {events['pancake-rain'] && <PancakeRain />}
        {events.snow && <Snow />}
        {events.confetti && <Confetti />}
        {events.fire && <Fire />}
        {events.underwater && <Underwater />}
        {events.rainbow && <Rainbow />}
        {events.lightning && <Lightning />}
        {events.disco && <Disco />}
        {screenText && <ScreenText text={screenText} />}
      </div>
    </>
  );
}

function useFallingItems(count: number, seed: string) {
  return useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      key: `${seed}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 4,
      size: 0.7 + Math.random() * 1.0,
      drift: (Math.random() - 0.5) * 60,
    })),
    [count, seed],
  );
}

function PancakeRain() {
  const items = useFallingItems(40, 'rain');
  return (
    <>
      {items.map(it => (
        <div
          key={it.key}
          className="absolute select-none"
          style={{
            left: `${it.left}%`,
            top: '-10%',
            fontSize: `${1.5 * it.size}rem`,
            animation: `live-fall ${it.duration}s linear ${it.delay}s infinite`,
            ['--drift' as string]: `${it.drift}px`,
          }}
        >
          🥞
        </div>
      ))}
    </>
  );
}

function Snow() {
  const items = useFallingItems(60, 'snow');
  return (
    <>
      {items.map(it => (
        <div
          key={it.key}
          className="absolute select-none text-white"
          style={{
            left: `${it.left}%`,
            top: '-5%',
            fontSize: `${0.8 * it.size}rem`,
            animation: `live-fall ${it.duration * 1.5}s linear ${it.delay}s infinite`,
            ['--drift' as string]: `${it.drift * 1.5}px`,
            textShadow: '0 0 6px rgba(255,255,255,0.8)',
          }}
        >
          ❄
        </div>
      ))}
    </>
  );
}

const CONFETTI_COLORS = ['#ff4d4d', '#ffb84d', '#ffe14d', '#4dff77', '#4dc3ff', '#a44dff', '#ff4dd9'];

function Confetti() {
  const items = useFallingItems(80, 'confetti');
  return (
    <>
      {items.map((it, i) => (
        <div
          key={it.key}
          className="absolute"
          style={{
            left: `${it.left}%`,
            top: '-5%',
            animation: `live-fall ${it.duration}s linear ${it.delay}s infinite`,
            ['--drift' as string]: `${it.drift}px`,
          }}
        >
          <div
            style={{
              width: `${6 + it.size * 4}px`,
              height: `${10 + it.size * 6}px`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              borderRadius: '2px',
              animation: `live-spin ${0.8 + Math.random() * 0.8}s linear infinite`,
            }}
          />
        </div>
      ))}
    </>
  );
}

function Fire() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(0deg, rgba(255,80,0,0.55) 0%, rgba(255,170,0,0.25) 30%, rgba(255,170,0,0.05) 55%, transparent 75%)',
        animation: 'live-fire-flicker 0.18s steps(2, end) infinite',
        mixBlendMode: 'screen',
      }}
    />
  );
}

function Underwater() {
  const bubbles = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({
      key: `bubble-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 5,
      size: 6 + Math.random() * 18,
    })),
    [],
  );
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(20,120,200,0.18) 0%, rgba(0,40,90,0.55) 100%)',
          animation: 'live-water-shimmer 4s ease-in-out infinite',
        }}
      />
      {bubbles.map(b => (
        <div
          key={b.key}
          className="absolute rounded-full"
          style={{
            left: `${b.left}%`,
            bottom: `-${b.size}px`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, rgba(180,220,255,0.5) 35%, rgba(120,180,230,0.2) 70%, transparent 100%)',
            border: '1px solid rgba(255,255,255,0.4)',
            animation: `live-bubble ${b.duration}s linear ${b.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

function Rainbow() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(45deg, rgba(255,0,0,0.25), rgba(255,165,0,0.25), rgba(255,255,0,0.25), rgba(0,200,0,0.25), rgba(0,150,255,0.25), rgba(120,0,200,0.25), rgba(255,0,150,0.25))',
        backgroundSize: '400% 400%',
        animation: 'live-rainbow 6s linear infinite',
        mixBlendMode: 'overlay',
      }}
    />
  );
}

function Lightning() {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const trigger = () => {
      if (cancelled) return;
      setFlash(true);
      setTimeout(() => setFlash(false), 80);
      setTimeout(() => setFlash(true), 180);
      setTimeout(() => setFlash(false), 240);
      const next = 1500 + Math.random() * 3500;
      setTimeout(trigger, next);
    };
    const id = setTimeout(trigger, 600);
    return () => { cancelled = true; clearTimeout(id); };
  }, []);
  return (
    <div
      className="absolute inset-0"
      style={{
        background: flash ? 'rgba(255,255,255,0.85)' : 'rgba(20,20,40,0.35)',
        transition: 'background 60ms linear',
      }}
    />
  );
}

function Disco() {
  return (
    <div
      className="absolute inset-0"
      style={{
        animation: 'live-disco 0.6s steps(6, end) infinite',
        mixBlendMode: 'overlay',
      }}
    />
  );
}

function ScreenText({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="px-6 py-4 text-center font-extrabold text-pancake-brown"
        style={{
          fontSize: 'clamp(2rem, 7vw, 5rem)',
          textShadow: '0 0 18px rgba(255,221,120,0.9), 0 4px 0 rgba(0,0,0,0.25)',
          background: 'rgba(255,243,200,0.92)',
          borderRadius: '24px',
          border: '4px solid #D4A044',
          animation: 'live-text-pop 6s ease-in-out forwards',
          maxWidth: '90vw',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    </div>
  );
}

const LIVE_EVENT_STYLES = `
@keyframes live-fall {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(var(--drift, 0), 110vh); }
}
@keyframes live-spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes live-fire-flicker {
  0%   { opacity: 0.8; }
  50%  { opacity: 1; }
  100% { opacity: 0.7; }
}
@keyframes live-water-shimmer {
  0%, 100% { filter: hue-rotate(0deg) brightness(1); }
  50%      { filter: hue-rotate(15deg) brightness(1.1); }
}
@keyframes live-bubble {
  0%   { transform: translate(0, 0) scale(1); opacity: 0; }
  10%  { opacity: 0.85; }
  100% { transform: translate(var(--drift, 0), -110vh) scale(0.6); opacity: 0; }
}
@keyframes live-rainbow {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes live-disco {
  0%   { background: rgba(255, 0, 80, 0.45); }
  16%  { background: rgba(255, 200, 0, 0.45); }
  33%  { background: rgba(0, 220, 80, 0.45); }
  50%  { background: rgba(0, 180, 255, 0.45); }
  66%  { background: rgba(160, 0, 255, 0.45); }
  83%  { background: rgba(255, 0, 200, 0.45); }
  100% { background: rgba(255, 0, 80, 0.45); }
}
@keyframes live-text-pop {
  0%   { transform: scale(0.4); opacity: 0; }
  12%  { transform: scale(1.1); opacity: 1; }
  20%  { transform: scale(1); }
  85%  { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0; }
}
@keyframes owner-quake-anim {
  0%   { transform: translate(0, 0); }
  10%  { transform: translate(-3px, 2px); }
  20%  { transform: translate(2px, -3px); }
  30%  { transform: translate(-2px, 3px); }
  40%  { transform: translate(3px, 1px); }
  50%  { transform: translate(-3px, -2px); }
  60%  { transform: translate(2px, 3px); }
  70%  { transform: translate(-1px, -3px); }
  80%  { transform: translate(3px, 2px); }
  90%  { transform: translate(-2px, 1px); }
  100% { transform: translate(0, 0); }
}
.owner-quake {
  animation: owner-quake-anim 0.45s linear infinite;
}
`;

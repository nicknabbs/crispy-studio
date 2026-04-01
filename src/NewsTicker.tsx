import { useState, useEffect, useRef } from 'react';
import { formatCps } from './gameData';

const MESSAGES = [
  "News: Local kid's pancake stack reaches ceiling. Parents unimpressed.",
  "Breaking: Syrup shortage hits breakfast dimension. Waffles blamed.",
  "Scientists confirm: you CAN have too many pancakes. (They were wrong.)",
  "A Spatula achieved consciousness today. It demands weekends off.",
  "Weather forecast: Cloudy with a chance of maple syrup.",
  "Historians discover ancient civilization built entirely on pancakes.",
  "BREAKING: Pancake officially declared the superior breakfast food.",
  "A cook was caught smuggling batter across the waffle border.",
  "Latest poll: 99% of breakfast foods wish they were pancakes.",
  "A stack of pancakes was spotted running for mayor. Polls favorable.",
  "The International Pancake Space Station reports all systems buttery.",
  "Sports: Competitive flipping league announces expansion to 12 teams.",
  "A griddle and a waffle iron have reconciled their differences.",
  "ALERT: Butter reserves at critical levels. Pancake economy rattled.",
  "Tech: Pancake-flipping robot sets world record at 847 flips/min.",
  "Opinion: Is a crepe just a pretentious pancake? Experts weigh in.",
  "Local Breakfast Chain opens 1000th location. Free pancakes for all!",
  "Scientists in the Batter Lab create pancake that's 99.7% fluff.",
  "The Waffle Dimension sends diplomatic envoy. They bring gifts of syrup.",
  "A pancake and a waffle walk into a bar. The crepe was not invited.",
  "EXCLUSIVE: Inside the secret life of a Syrup Well operator.",
  "A Factory worker found living inside a giant pancake. 'It's cozy.'",
  "Celebrity chef quits fine dining to flip pancakes full time.",
  "Survey: 4 out of 5 spatulas prefer being used for pancakes.",
  "The moon is reportedly made of pancake batter, says nobody credible.",
  "An entire Breakfast Chain went missing. Found in the Waffle Dimension.",
  "Today's productivity tip: more pancakes = more happiness.",
  "New study: watching numbers go up is scientifically delightful.",
  "Fun fact: If you stacked all your pancakes they'd reach... more pancakes.",
  "Local news: Runaway syrup river now classified as tourist attraction.",
];

interface NewsTickerProps {
  cps: number;
  totalBaked: number;
}

export function NewsTicker({ cps, totalBaked }: NewsTickerProps) {
  const [message, setMessage] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  const [fading, setFading] = useState(false);
  const indexRef = useRef(Math.floor(Math.random() * MESSAGES.length));
  const cpsRef = useRef(cps);
  const totalRef = useRef(totalBaked);
  cpsRef.current = cps;
  totalRef.current = totalBaked;

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        if (Math.random() < 0.25) {
          const ctx = getContextual(cpsRef.current, totalRef.current);
          if (ctx) {
            setMessage(ctx);
            setFading(false);
            return;
          }
        }
        indexRef.current = (indexRef.current + 1) % MESSAGES.length;
        setMessage(MESSAGES[indexRef.current]);
        setFading(false);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-pancake-brown/80 text-pancake-cream text-xs py-1.5 px-4 overflow-hidden flex-shrink-0">
      <div
        className="whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease' }}
      >
        <span className="text-pancake-gold font-bold mr-2">📰</span>
        {message}
      </div>
    </div>
  );
}

function getContextual(cps: number, totalBaked: number): string | null {
  const msgs: string[] = [];
  if (cps > 0 && cps < 10) msgs.push(`${formatCps(cps)} pancakes per second. Humble beginnings!`);
  if (cps >= 100 && cps < 1000) msgs.push(`Your empire produces ${formatCps(cps)} pancakes every second!`);
  if (cps >= 1000 && cps < 1e6) msgs.push("Thousands per second. Your spatulas are literally on fire!");
  if (cps >= 1e6) msgs.push("Millions of PpS. You ARE the breakfast industry now.");
  if (totalBaked > 1e6 && totalBaked < 1e7) msgs.push("A million pancakes! You're basically a legend.");
  if (totalBaked > 1e9 && totalBaked < 1e10) msgs.push("A billion pancakes. The world can't eat fast enough.");
  if (totalBaked > 1e12) msgs.push("A TRILLION pancakes?! You've transcended breakfast itself.");
  if (msgs.length === 0) return null;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

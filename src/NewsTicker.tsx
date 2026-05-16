import { useState, useEffect, useRef, useCallback } from 'react';
import { formatCps } from './gameData';

// Big roster of headlines. Rotation uses a shuffled deck so you see every
// headline once before any repeats — much harder to predict than the old
// linear cycle. Add freely; new entries are picked up on next reload.
const MESSAGES = [
  // --- Originals ---
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

  // --- Sports & Competition ---
  "Pancake Stacker takes gold for the third year running. Wobbled once.",
  "Olympic Pancake Flipping committee debates 'gravity assist' rule.",
  "Pancake league outlaws 'pre-buttered' starting positions.",
  "Underdog spatula wins finals after coaching from a wooden spoon.",
  "Synchronized batter-pouring debuts at next Breakfast Olympics.",
  "Pancake-flipping marathon enters its 14th hour. Crowd still hungry.",
  "Underwater pancake stacking now an official sport. Spoiler: soggy.",
  "Pancake-throwing contest banned. Replaced with pancake-gently-placing.",
  "Long jump record broken by athlete fueled entirely on short stacks.",
  "Breakfast Bowl semis postponed due to too much syrup on the field.",

  // --- Crime & Mystery ---
  "Notorious 'Flipper' apprehended at IHOP. Confessed under syrup pressure.",
  "Detectives baffled by missing maple shipment. Squirrel held for questioning.",
  "Pancake thief leaves only crumbs at scene. Police pursue an ant suspect.",
  "Sticky-fingered raccoon banned from breakfast diner for life.",
  "Strange syrup symbols appear in cornfield. Cornfield blames pancake.",
  "Cryptid 'Bigflap' caught on camera in suburban kitchen. Police: 'cute.'",
  "Local Waffle accused of impersonating a pancake. Pleads innocent.",
  "Pancake-shaped UFO spotted over Vermont. Officials: 'not maple-related.'",
  "Cold case reopened: who put the first blueberry inside a pancake?",
  "Investigator confirms: yes, that pancake WAS looking at you.",

  // --- Tech & Science ---
  "Scientists isolate the 'fluff gene' in pancake DNA.",
  "Quantum pancake exists in two stacks at once until you look at it.",
  "AI trained on pancake recipes refuses to make anything else.",
  "Robot chef sues for unpaid overtime after a 14-hour batter run.",
  "New pancake-powered car gets 47 miles per gallon (of syrup).",
  "Lab-grown pancakes taste like 'real pancakes but slightly judgmental.'",
  "Mathematician proves pancake is the shortest path from hunger to joy.",
  "Particle physicists confirm syrup is a superfluid at room temperature.",
  "Astronomers spot pancake-shaped galaxy. Name proposal: NGC FlapJack.",
  "New app gives your pancakes a credit score. Most rated 'crispy good.'",

  // --- Politics ---
  "Pancake Mayor passes No-Crepe-Sunday ordinance. Crepes file complaint.",
  "Pancake-only parking spaces proposed downtown. Waffles outraged.",
  "Breakfast Bureau approves griddle subsidy. Backlash from toast lobby.",
  "Pancake Party announces run. Slogan: 'Make Mornings Maple Again.'",
  "Senate filibuster broken after 19 hours by a single perfectly-timed flip.",
  "Diplomatic incident: ambassador served crepe at official pancake summit.",
  "International court rules: bagels are NOT 'donut-adjacent pancakes.'",

  // --- Weather ---
  "Tomorrow: 75 and butter-drizzled with a 30% chance of crumbs.",
  "Maple-mageddon expected Thursday. Stock up on butter and napkins.",
  "Snowstorm cancelled. Replaced with powdered-sugar storm. Acceptable.",
  "Heat advisory: pancakes are cooking themselves on the sidewalks today.",
  "Fog so thick this morning that two pancakes married each other by mistake.",
  "Tornado siren sounds. Turns out it was just a really hungry vortex.",

  // --- Pop Culture ---
  "Famous pancake actor wins Best Topping at the Griddy Awards.",
  "Reality show 'Real Pancakes of Beverly Hills' renewed for season 8.",
  "Pop star releases pancake-themed album. Critics: 'sweet but flat.'",
  "Hollywood remake of 'Pancake Hero' coming Q3. Original spatula reprising.",
  "Streaming chart-topper: 'Pancake & Chill,' 200 hours of sizzling.",
  "Long-running soap opera 'As The Griddle Turns' kills off a main waffle.",

  // --- Travel & Tourism ---
  "Tourists flock to see world's largest pancake. Disappointed: it's medium.",
  "All-pancake cruise launches. Itinerary: IHOP, Denny's, the moon, IHOP.",
  "New amusement park opens. Top ride: The Big Flip (do not eat after).",
  "Breakfast Embassy reopens after diplomatic syrup incident. All forgiven.",
  "Travel agents recommend the Pancake District in autumn. Bring stretchy pants.",

  // --- Health & Wellness ---
  "Doctors agree: pancakes are 100% pancake. More research pending.",
  "Fitness guru drops 200 lbs on pancake-only diet. Then gained 250.",
  "New study: laughing at pancake puns burns three calories. Worth it.",
  "Pancake meditation gains popularity: stare, breathe, flip, stare.",
  "Wellness clinic introduces pancake-based therapy. Results: delicious.",
  "Yoga instructor adds 'downward-facing pancake' to evening sessions.",

  // --- Food Rivalry ---
  "Waffle Union demands 50% market share. Pancake Union laughs syrupily.",
  "French toast caught dating a pancake. Crepe community shocked.",
  "Cereal box mascot resigns to pursue pancake career. Wishes him well.",
  "Toaster strike ends after pancakes mediate. Bread products grateful.",
  "Granola group denied entry to Breakfast Hall of Fame. Cries crunchily.",
  "Oatmeal sues pancake for trademark infringement. Loses, obviously.",

  // --- Awards ---
  "Spatula wins 'Best Supporting Utensil' for eighth year. Speech: 'flip.'",
  "Local griddle voted 'Most Likely to Burn You.' Accepts award proudly.",
  "Annual Pancake Awards delayed: nobody could stop eating the snacks.",
  "Pancake of the Year goes to a stack of three with extra butter.",
  "Lifetime Achievement award given to a 47-year-old cast iron skillet.",

  // --- Education ---
  "School board mandates pancake history in every K-12 curriculum.",
  "Pancake University launches new major: Topology of Toppings.",
  "Kindergartner brings stack of pancakes for show-and-tell. Wins everything.",
  "PhD candidate defends thesis: 'A Unified Theory of Maple Velocity.'",
  "Standardized test added question: 'how many pancakes in a pancake?'",

  // --- Business ---
  "Pancake stocks surge 8% after wholesome breakfast ad campaign.",
  "Local diner closes for renovations. Reopens as a larger diner.",
  "Big Syrup accused of price gouging. Statement: 'sticky situation.'",
  "Pancake startup raises $40M to disrupt the toast industry. Toast unbothered.",
  "Maple distributor goes public. IPO underwritten by Wall Street's stickiest firm.",
  "Diner buys neighboring diner. Diner now twice as much diner.",

  // --- Mystical / Fantasy ---
  "Pancake god Pancakaron grants wishes in exchange for stacks. Accepting now.",
  "Dragon spotted hoarding pancakes instead of gold. Calls it 'rounder treasure.'",
  "Unicorn endorses oat pancakes. Brand value skyrockets overnight.",
  "Witch accidentally turns prince into pancake. Prince: 'this is fine actually.'",
  "Wizard charges $40 a session to 'syrup-bless' your stack. Lines around the block.",
  "Phoenix discovered nesting inside a stack. Lifecycle now includes maple.",

  // --- Self-referential / 4th wall ---
  "Local clicker discovers they can click more than once. Productivity soars.",
  "News ticker accused of repeating itself. News ticker denies it strongly.",
  "Anonymous source confirms: someone IS reading these. We are grateful.",
  "Player reaches new milestone. Family supportive but confused.",
  "Tooltip files complaint: 'they always click past me.'",
  "Achievement icon caught flexing in the achievements panel after hours.",
  "Pancake button reports it's tired and would like a five-minute break.",

  // --- Weird / Absurd ---
  "Bee union demands pancakes after long honey strike. Talks ongoing.",
  "Cat votes pancakes official Tuesday food. Cat is in charge now.",
  "Pigeon accepts award for 'most respectful crumb collector.'",
  "Squirrel caught hoarding 47 pancakes. Says winter is coming.",
  "Stack of pancakes runs for office on platform of 'more pancakes.'",
  "Pancake speaks for first time. Says only one word: 'flip.'",
  "Local statue replaced overnight with bronze pancake. Town pleased.",
  "Goose seen reviewing diners for newspaper. Honest critic, hard grader.",

  // --- Romance ---
  "Maple and Butter renew vows for the 47th time. Magical as ever.",
  "Speed-dating event for spatulas a flipping success. Two engagements.",
  "Two pancakes elope after their families disapprove of the syrup.",
  "Dating app for griddles launches. Tagline: 'sizzle responsibly.'",

  // --- Society & lifestyle ---
  "Influencer goes viral folding pancake into origami crane. Crane edible.",
  "Pancake yoga retreat overbooked. Guests sleep in stacks (literally).",
  "City installs pancake-shaped benches in every park. Approval rating: 100%.",
  "New trend: pancakes as area rugs. Vacuuming difficult, mood excellent.",
  "Etiquette guide updated: it IS rude to flip another person's pancake.",
  "Trend report: 'quiet syrup' replaces 'loud syrup' for second quarter running.",

  // --- Random & weather-of-the-mind ---
  "Local pond renamed Pancake Pond. Ducks moving in by the hundreds.",
  "Lost-and-found contains 14 spatulas, 3 syrups, and one bewildered chef.",
  "Mystery diner leaves $1000 tip. Asks for one well-done pancake in return.",
  "Pancake delivered to wrong house. Recipient: 'I'm keeping it. Best day ever.'",
  "Local gym adds pancake-stacking machines. Members lifting heavier syrup.",
  "Bookstore reports 'How To Make Pancakes' is now the entire bestseller list.",
];

const HISTORY_KEY = 'pancake-news-history';
const HISTORY_MAX = 60;

interface HistoryEntry {
  t: number; // unix ms when this headline scrolled past
  m: string; // the headline text
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(x => x && typeof x.t === 'number' && typeof x.m === 'string')
      .slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota */
  }
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface NewsTickerProps {
  cps: number;
  totalBaked: number;
}

export function NewsTicker({ cps, totalBaked }: NewsTickerProps) {
  const [message, setMessage] = useState<string>(() => {
    const deck = shuffle(MESSAGES);
    return deck[0];
  });
  const [fading, setFading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [historyOpen, setHistoryOpen] = useState(false);

  // Shuffled deck of indices. We pop from the end; when empty, reshuffle.
  // Survives across renders via ref. Avoids the predictable old linear cycle.
  const deckRef = useRef<string[]>(shuffle(MESSAGES));
  const lastShownRef = useRef<string>(message);

  const cpsRef = useRef(cps);
  const totalRef = useRef(totalBaked);
  cpsRef.current = cps;
  totalRef.current = totalBaked;

  const announce = useCallback((text: string) => {
    setMessage(text);
    lastShownRef.current = text;
    setHistory(prev => {
      // Dedupe consecutive identical entries (shouldn't happen with the deck,
      // but cheap insurance against a contextual + deck collision).
      if (prev[0] && prev[0].m === text) return prev;
      const next = [{ t: Date.now(), m: text }, ...prev].slice(0, HISTORY_MAX);
      saveHistory(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        // 25% chance to slot in a contextual message tied to current CPS / total
        if (Math.random() < 0.25) {
          const ctx = getContextual(cpsRef.current, totalRef.current);
          if (ctx && ctx !== lastShownRef.current) {
            announce(ctx);
            setFading(false);
            return;
          }
        }
        // Otherwise pull next from the shuffled deck. Reshuffle when empty,
        // and avoid landing on the same headline we just showed.
        if (deckRef.current.length === 0) {
          deckRef.current = shuffle(MESSAGES);
        }
        let next = deckRef.current.pop()!;
        if (next === lastShownRef.current && deckRef.current.length > 0) {
          // swap with another and put this one back
          const swapIdx = Math.floor(Math.random() * deckRef.current.length);
          const tmp = deckRef.current[swapIdx];
          deckRef.current[swapIdx] = next;
          next = tmp;
        }
        announce(next);
        setFading(false);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, [announce]);

  return (
    <>
      <button
        onClick={() => setHistoryOpen(true)}
        className="w-full bg-pancake-brown/80 text-pancake-cream text-xs py-1.5 px-4 overflow-hidden flex-shrink-0 cursor-pointer hover:bg-pancake-brown/90 transition-colors text-left border-0 flex items-center"
        title="Tap to see the full news archive"
        aria-label="Open news archive"
      >
        <span className="text-pancake-gold font-bold mr-2 flex-shrink-0">📰</span>
        <span
          className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0"
          style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease' }}
        >
          {message}
        </span>
      </button>

      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="bg-pancake-cream rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-pancake-gold/20 to-pancake-cream rounded-t-2xl border-b-2 border-pancake-gold/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📰</span>
                <h2 className="text-lg font-bold text-pancake-brown leading-tight">News Archive</h2>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="text-2xl text-pancake-medium hover:text-pancake-brown cursor-pointer bg-transparent border-0 leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-pancake-medium text-center p-6">
                  No news yet. Headlines will appear here as they scroll past.
                </p>
              ) : (
                history.map((entry, i) => (
                  <div
                    key={`${entry.t}-${i}`}
                    className="rounded-lg border border-shop-border/40 bg-pancake-warm/60 p-3"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-pancake-medium font-semibold mb-0.5">
                      {formatTime(entry.t)}
                    </div>
                    <div className="text-sm text-pancake-brown leading-snug">
                      {entry.m}
                    </div>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="px-4 py-2 border-t border-shop-border/30 text-[11px] text-pancake-medium text-center">
                Showing the last {history.length} headline{history.length === 1 ? '' : 's'}.
              </div>
            )}
          </div>
        </div>
      )}
    </>
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

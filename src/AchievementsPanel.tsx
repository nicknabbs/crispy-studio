import { ACHIEVEMENTS, CATEGORIES } from './achievements';
import { useState } from 'react';

interface AchievementsPanelProps {
  unlockedAchievements: Record<string, boolean>;
}

export function AchievementsPanel({ unlockedAchievements }: AchievementsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const unlocked = ACHIEVEMENTS.filter(a => unlockedAchievements[a.id]);
  const total = ACHIEVEMENTS.length;

  // Group by category
  const byCategory = new Map<string, typeof ACHIEVEMENTS>();
  for (const a of ACHIEVEMENTS) {
    const cat = a.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(a);
  }

  const toggleCat = (cat: string) => {
    setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="p-3 border-t-2 border-shop-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-bold text-pancake-brown mb-1 cursor-pointer bg-transparent border-0 p-0 text-left"
      >
        <span>Achievements ({unlocked.length}/{total})</span>
        <span className="text-xs text-pancake-medium">{expanded ? '▲' : '▼'}</span>
      </button>

      <div className="w-full h-2 bg-shop-border/30 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-gradient-to-r from-pancake-gold/70 to-pancake-gold rounded-full transition-all duration-500"
          style={{ width: `${(unlocked.length / total) * 100}%` }}
        />
      </div>

      {expanded && (
        <div className="mt-2 max-h-96 overflow-y-auto">
          {CATEGORIES.map(cat => {
            const achievements = byCategory.get(cat);
            if (!achievements || achievements.length === 0) return null;
            const catUnlocked = achievements.filter(a => unlockedAchievements[a.id]).length;
            const isOpen = openCats[cat];

            return (
              <div key={cat} className="mb-1">
                <button
                  onClick={() => toggleCat(cat)}
                  className="w-full flex items-center justify-between py-1.5 px-1 text-xs font-bold text-pancake-brown cursor-pointer bg-transparent border-0 text-left hover:bg-pancake-cream/50 rounded"
                >
                  <span>{cat} ({catUnlocked}/{achievements.length})</span>
                  <span className="text-pancake-medium text-[10px]">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-1 pb-1">
                    {achievements.map(a => {
                      const isUnlocked = unlockedAchievements[a.id];
                      const isHidden = a.hidden && !isUnlocked;

                      return (
                        <div
                          key={a.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-xs ${
                            isUnlocked
                              ? 'bg-pancake-cream border border-pancake-gold/40'
                              : 'bg-gray-50 border border-gray-200/60'
                          }`}
                        >
                          <span className={`text-base flex-shrink-0 ${isUnlocked ? '' : 'grayscale opacity-40'}`}>
                            {isHidden ? '❓' : a.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-[11px] ${isUnlocked ? 'text-pancake-brown' : 'text-gray-400'}`}>
                              {isHidden ? '???' : a.name}
                            </div>
                            <div className={`text-[10px] leading-tight ${isUnlocked ? 'text-pancake-medium' : 'text-gray-400'}`}>
                              {isHidden ? 'Keep playing to discover!' : a.description}
                            </div>
                          </div>
                          {isUnlocked && (
                            <span className="text-pancake-gold text-xs flex-shrink-0">✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

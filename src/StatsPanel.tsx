import { BUILDINGS, UPGRADES, formatNumber, formatCps } from './gameData';
import type { GameState } from './useGameState';
import { getPrestigeMultiplier } from './useGameState';
import { ACHIEVEMENTS } from './achievements';
import { useState } from 'react';

interface StatsPanelProps {
  state: GameState;
  cps: number;
  clickPower: number;
}

export function StatsPanel({ state, cps, clickPower }: StatsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const totalBuildings = Object.values(state.buildingCounts).reduce((a, b) => a + b, 0);
  const achievementCount = Object.keys(state.unlockedAchievements).length;
  const prestigeBonus = Math.round((getPrestigeMultiplier(state.sugarStars) - 1) * 100);

  return (
    <div className="p-3 border-t-2 border-shop-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-bold text-pancake-brown mb-1 cursor-pointer bg-transparent border-0 p-0 text-left"
      >
        <span>Stats</span>
        <span className="text-xs text-pancake-medium">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-1 mt-2 text-xs text-pancake-dark">
          <StatRow label="Pancakes/sec" value={formatCps(cps)} />
          <StatRow label="Per click" value={formatNumber(clickPower)} />
          <StatRow label="Flipped (this run)" value={formatNumber(state.totalBaked)} />
          <StatRow label="Lifetime flipped" value={formatNumber(state.lifetimeBaked)} />
          <StatRow label="Total clicks" value={formatNumber(state.totalClicks)} />
          <StatRow label="Buildings owned" value={totalBuildings.toString()} />
          <StatRow label="Butter Pats caught" value={state.goldenCookiesCaught.toString()} />
          <StatRow label="Achievements" value={`${achievementCount}/${ACHIEVEMENTS.length}`} />
          {state.sugarStars > 0 && (
            <StatRow label="Maple Stars" value={`${state.sugarStars} (+${prestigeBonus}%)`} />
          )}
          {state.prestigeCount > 0 && (
            <StatRow label="Prestige count" value={state.prestigeCount.toString()} />
          )}

          <div className="mt-2 pt-2 border-t border-shop-border/30">
            <div className="font-semibold text-pancake-brown mb-1">CpS Breakdown</div>
            {BUILDINGS.map(b => {
              const count = state.buildingCounts[b.id] || 0;
              if (count === 0) return null;
              const pps = getBuildingPps(b.id, count, state.purchasedUpgrades, state.sugarStars);
              return (
                <div key={b.id} className="flex justify-between">
                  <span>{b.emoji} {b.name} x{count}</span>
                  <span className="tabular-nums">{formatCps(pps)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-pancake-medium">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function getBuildingPps(
  buildingId: string,
  count: number,
  purchasedUpgrades: Record<string, boolean>,
  sugarStars: number,
): number {
  const building = BUILDINGS.find(b => b.id === buildingId);
  if (!building) return 0;
  let mult = 1;
  for (const u of UPGRADES) {
    if (u.buildingId === buildingId && purchasedUpgrades[u.id]) {
      mult *= u.multiplier;
    }
  }
  return count * building.baseCps * mult * getPrestigeMultiplier(sugarStars);
}

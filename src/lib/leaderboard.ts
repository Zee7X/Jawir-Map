import type { JawirTagData } from '@/components/TagModal';
import type { RegionStatusType } from '@/lib/geo';

export interface LeaderboardData {
  topFarthest: JawirTagData[];
  topClosest: JawirTagData[];
  topCoffee: JawirTagData[];
  regionStats: Record<string, number>;
  trahStats: Record<string, number>;
}

const TOP_N = 5;

// Built in the browser from the pin list, so new, deleted and coffee'd pins show up without a refetch.
export function buildLeaderboard(tags: JawirTagData[]): LeaderboardData {
  const regionStats: Record<RegionStatusType, number> = {
    kandang: 0,
    sunda_empire: 0,
    antarpulau: 0,
    internasional: 0,
  };
  const trahStats: Record<string, number> = {};
  for (const t of tags) {
    if (t.regionStatus in regionStats) regionStats[t.regionStatus as RegionStatusType]++;
    const trah = t.trah || 'mataraman';
    trahStats[trah] = (trahStats[trah] || 0) + 1;
  }

  return {
    topFarthest: [...tags].sort((a, b) => b.distanceKm - a.distanceKm).slice(0, TOP_N),
    topClosest: [...tags].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, TOP_N),
    topCoffee: [...tags].sort((a, b) => (b.coffeeCount || 0) - (a.coffeeCount || 0)).slice(0, TOP_N),
    regionStats,
    trahStats,
  };
}

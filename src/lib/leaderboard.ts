import type { JawirTagData } from '@/components/TagModal';
import { TRAH_MAP, type RegionStatusType, type TrahType } from '@/lib/geo';
import { nearestCity } from '@/lib/cities';

export interface TrahStanding {
  trah: TrahType;
  count: number;
}

export interface CityStanding {
  name: string;
  count: number;
}

export interface LeaderboardData {
  topFarthest: JawirTagData[];
  topClosest: JawirTagData[];
  topCoffee: JawirTagData[];
  regionStats: Record<string, number>;
  trahStats: Record<string, number>;
  // Every trah, most pins first (ties keep TRAH_MAP order), for Perang Trah.
  trahWar: TrahStanding[];
  topCities: CityStanding[];
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
  const cityCounts = new Map<string, number>();
  for (const t of tags) {
    if (t.regionStatus in regionStats) regionStats[t.regionStatus as RegionStatusType]++;
    const trah = t.trah || 'mataraman';
    trahStats[trah] = (trahStats[trah] || 0) + 1;
    const city = nearestCity(t.lat, t.lng);
    if (city) cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
  }

  const trahWar = (Object.keys(TRAH_MAP) as TrahType[])
    .map((trah) => ({ trah, count: trahStats[trah] || 0 }))
    .sort((a, b) => b.count - a.count);

  const topCities = Array.from(cityCounts, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, TOP_N);

  return {
    topFarthest: [...tags].sort((a, b) => b.distanceKm - a.distanceKm).slice(0, TOP_N),
    topClosest: [...tags].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, TOP_N),
    topCoffee: [...tags].sort((a, b) => (b.coffeeCount || 0) - (a.coffeeCount || 0)).slice(0, TOP_N),
    regionStats,
    trahStats,
    trahWar,
    topCities,
  };
}

// Competition ranking: equal counts share a rank (1, 1, 3, ...).
export function trahRanks(war: TrahStanding[]): number[] {
  return war.map((w) => war.findIndex((x) => x.count === w.count) + 1);
}

// One line for the map banner: who leads (ties included), and how far behind the viewer's trah is.
export function trahWarLine(war: TrahStanding[], mine?: TrahType): string | null {
  const top = war[0]?.count || 0;
  if (top === 0) return null;
  const leaders = war.filter((w) => w.count === top).map((w) => TRAH_MAP[w.trah].short);
  const leaderText = leaders.length === 1 ? `${TRAH_MAP[war[0].trah].icon} ${leaders[0]} lagi mimpin` : `${leaders.join(', ')} imbang mimpin`;
  if (!mine) return `${leaderText}, ${top} bala. Trahmu endi?`;

  const me = war.find((w) => w.trah === mine);
  const myCount = me?.count || 0;
  const name = TRAH_MAP[mine].short;
  if (myCount === top) {
    if (leaders.length > 1) return `⚔️ ${leaders.join(', ')} imbang ${top} bala. Ajak konco ben ${name} menang!`;
    const runnerUp = war.find((w) => w.count < top)?.count ?? 0;
    return `👑 ${name} lagi mimpin, unggul ${top - runnerUp} bala. Jaga, ajak konco!`;
  }
  return `⚔️ ${name} kalah ${top - myCount} bala karo ${leaders[0]}. Ayo nancep, ajak konco!`;
}

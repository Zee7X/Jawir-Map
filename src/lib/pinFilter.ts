import type { JawirTagData } from '@/components/TagModal';
import type { RegionStatusType, TagCategory, TrahType } from '@/lib/geo';

export interface PinFilter {
  query: string;
  trahs: TrahType[];
  categories: TagCategory[];
  regions: RegionStatusType[];
}

export const EMPTY_FILTER: PinFilter = { query: '', trahs: [], categories: [], regions: [] };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();

export function matchesQuery(tag: JawirTagData, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  return norm(tag.nickname).includes(q) || norm(tag.statusTag).includes(q);
}

// Chips within one group are OR (Ngapak or Arekan); groups combine with AND.
export function matchesFilter(tag: JawirTagData, f: PinFilter): boolean {
  if (f.trahs.length && !f.trahs.includes((tag.trah || 'mataraman') as TrahType)) return false;
  if (f.categories.length && !f.categories.includes(tag.category)) return false;
  if (f.regions.length && !f.regions.includes(tag.regionStatus as RegionStatusType)) return false;
  return matchesQuery(tag, f.query);
}

export function activeFilterCount(f: PinFilter): number {
  return f.trahs.length + f.categories.length + f.regions.length + (f.query.trim() ? 1 : 0);
}

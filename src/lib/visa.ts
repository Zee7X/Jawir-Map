import { NPC_PINS } from '@/lib/geo';

// Visa stamps from sowan-ing the Situs Legendha, kept per browser.
const VISA_KEY = 'jawir_visa';

export const VISA_TOTAL = NPC_PINS.length;

export function readVisa(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(VISA_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => NPC_PINS.some((n) => n.id === id)) : [];
  } catch {
    return [];
  }
}

export function addVisa(id: string): string[] {
  const visa = readVisa();
  if (visa.includes(id)) return visa;
  const next = [...visa, id];
  try {
    localStorage.setItem(VISA_KEY, JSON.stringify(next));
  } catch {
    // storage blocked: the stamp still shows for this visit
  }
  return next;
}

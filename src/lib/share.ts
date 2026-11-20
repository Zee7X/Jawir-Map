// Shareable pin links live on /p/<id>, so the homepage stays static while each pin still gets its own preview.
export function pinPath(id: string): string {
  return `/p/${encodeURIComponent(id)}`;
}

export function pinShareUrl(id: string): string {
  return `${window.location.origin}${pinPath(id)}`;
}

export type Translate = (jv: string, vars?: Record<string, string | number>) => string;

// Default for callers without a language (the server page keeps Javanese): only fills the {name} placeholders.
export const fillVars: Translate = (jv, vars) =>
  vars ? jv.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : jv;

// Share copy written as a dare, so the person receiving it answers with their own distance.
export function challengeText(tag: { distanceKm: number; trah?: string }, trahShort?: string, t: Translate = fillVars): string {
  const km = tag.distanceKm.toLocaleString('id-ID');
  const rally = trahShort ? t('Trah {trah} butuh bala, tancepke pinmu!', { trah: t(trahShort) }) : t('Tancepke pinmu!');
  if (tag.distanceKm < 50) return `${t('Aku mung {km} km saka Pucak Lawu, isih mambu belerang. Kowe adoh piro?', { km })} ${rally}`;
  return `${t('Aku {km} km saka Pucak Lawu. Kowe piro?', { km })} ${rally}`;
}

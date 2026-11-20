// Shareable pin links live on /p/<id>, so the homepage stays static while each pin still gets its own preview.
export function pinPath(id: string): string {
  return `/p/${encodeURIComponent(id)}`;
}

export function pinShareUrl(id: string): string {
  return `${window.location.origin}${pinPath(id)}`;
}

// Share copy written as a dare, so the person receiving it answers with their own distance.
export function challengeText(tag: { distanceKm: number; trah?: string }, trahShort?: string): string {
  const km = tag.distanceKm.toLocaleString('id-ID');
  const rally = trahShort ? ` Trah ${trahShort} butuh bala, tancepke pinmu!` : ' Tancepke pinmu!';
  if (tag.distanceKm < 50) return `Aku mung ${km} km saka Pucak Lawu, isih mambu belerang. Kowe adoh piro?${rally}`;
  return `Aku ${km} km saka Pucak Lawu. Kowe piro?${rally}`;
}

// Shareable pin links live on /p/<id>, so the homepage stays static while each pin still gets its own preview.
export function pinPath(id: string): string {
  return `/p/${encodeURIComponent(id)}`;
}

export function pinShareUrl(id: string): string {
  return `${window.location.origin}${pinPath(id)}`;
}

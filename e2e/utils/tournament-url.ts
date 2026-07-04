export function extractTournamentId(url: string): string {
  const pathname = new URL(url, 'http://localhost').pathname;
  const match = pathname.match(/\/tournaments\/([^/]+)/);
  return match?.[1] ?? '';
}

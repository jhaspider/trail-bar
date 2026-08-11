import type { LinkStats } from '../types';

export function score(stats: LinkStats): number {
  if (stats.visits <= 0) return 0;
  const avgDwellSec = stats.totalDwellMs / stats.visits / 1000;
  return stats.visits * Math.log(1 + avgDwellSec);
}

export function topLinks(links: Record<string, LinkStats>, n: number): LinkStats[] {
  return Object.values(links)
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
}

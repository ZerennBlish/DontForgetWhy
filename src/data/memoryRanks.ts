export interface MemoryRank {
  title: string;
  emoji: string;
  color: string;
}

const ranks: { min: number; max: number; rank: MemoryRank }[] = [
  { min: 90, max: 100, rank: { title: 'Memory of an Elephant With a Vendetta', emoji: '\u{1F418}', color: '#FFD700' } },
  { min: 70, max: 89, rank: { title: 'Surprisingly Functional', emoji: '\u{1F9E0}', color: '#4A90D9' } },
  { min: 50, max: 69, rank: { title: 'Average Human (Low Bar)', emoji: '\u{1F610}', color: '#B0B0CC' } },
  { min: 30, max: 49, rank: { title: 'Forgetful Squirrel', emoji: '\u{1F43F}\uFE0F', color: '#FF9F43' } },
  { min: 0, max: 29, rank: { title: 'Goldfish With Amnesia', emoji: '\u{1F41F}', color: '#FF6B6B' } },
];

const unranked: MemoryRank = { title: 'Unranked', emoji: '\u2753', color: '#7A7A9E' };

export function getRank(wins: number, losses: number, skips: number): MemoryRank {
  const total = wins + losses + skips;
  if (total === 0) return unranked;

  const percentage = (wins / total) * 100;
  const match = ranks.find((r) => percentage >= r.min && percentage <= r.max);
  return match ? match.rank : unranked;
}

export { ranks, unranked };

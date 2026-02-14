export interface RankTier {
  min: number;
  max: number;
  title: string;
  emoji: string;
}

export const RANK_THRESHOLDS: RankTier[] = [
  { min: 97, max: 100, title: 'The One Who Remembers', emoji: '\u{1F451}' },
  { min: 89, max: 96, title: 'Steel Trap', emoji: '\u{1F9F2}' },
  { min: 76, max: 88, title: 'Annoyingly Good', emoji: '\u{1F60F}' },
  { min: 61, max: 75, title: 'Borderline Impressive', emoji: '\u{1F929}' },
  { min: 46, max: 60, title: 'Surprisingly Sharp', emoji: '\u{1F9E0}' },
  { min: 31, max: 45, title: 'Getting Suspicious', emoji: '\u{1F914}' },
  { min: 16, max: 30, title: 'Occasionally Aware', emoji: '\u{1F610}' },
  { min: 6, max: 15, title: 'Sticky Note Dependent', emoji: '\u{1F4DD}' },
  { min: 0, max: 5, title: 'Who Are You Again?', emoji: '\u{1F41F}' },
];

export function getRankFromScore(score: number): RankTier {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const match = RANK_THRESHOLDS.find((r) => clamped >= r.min && clamped <= r.max);
  return match ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
}

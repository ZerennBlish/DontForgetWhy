export interface RankTier {
  min: number;
  max: number;
  title: string;
  emoji: string;
}

export const RANK_THRESHOLDS: RankTier[] = [
  { min: 137, max: 140, title: 'The One Who Remembers', emoji: '\u{1F451}' },
  { min: 125, max: 136, title: 'Steel Trap', emoji: '\u{1F9F2}' },
  { min: 106, max: 124, title: 'Annoyingly Good', emoji: '\u{1F60F}' },
  { min: 85,  max: 105, title: 'Borderline Impressive', emoji: '\u{1F929}' },
  { min: 64,  max: 84,  title: 'Surprisingly Sharp', emoji: '\u{1F9E0}' },
  { min: 43,  max: 63,  title: 'Getting Suspicious', emoji: '\u{1F914}' },
  { min: 22,  max: 42,  title: 'Occasionally Aware', emoji: '\u{1F610}' },
  { min: 8,   max: 21,  title: 'Sticky Note Dependent', emoji: '\u{1F4DD}' },
  { min: 0,   max: 7,   title: 'Who Are You Again?', emoji: '\u{1F41F}' },
];

export function getRankFromScore(score: number): RankTier {
  const clamped = Math.max(0, Math.min(140, Math.round(score)));
  const match = RANK_THRESHOLDS.find((r) => clamped >= r.min && clamped <= r.max);
  return match ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
}

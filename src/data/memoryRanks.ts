import { ImageSourcePropType } from 'react-native';

interface RankTier {
  min: number;
  max: number;
  title: string;
  imageSource: ImageSourcePropType;
}

const RANK_THRESHOLDS: RankTier[] = [
  { min: 137, max: 140, title: 'The Elephant', imageSource: require('../../assets/ranks/rank-elephant.webp') },
  { min: 125, max: 136, title: 'The Steel Trap', imageSource: require('../../assets/ranks/rank-steeltrap.webp') },
  { min: 106, max: 124, title: 'The Show-Off', imageSource: require('../../assets/ranks/rank-showoff.webp') },
  { min: 85,  max: 105, title: 'The Try-Hard', imageSource: require('../../assets/ranks/rank-tryhard.webp') },
  { min: 64,  max: 84,  title: 'The Lucky Guesser', imageSource: require('../../assets/ranks/rank-guesser.webp') },
  { min: 43,  max: 63,  title: 'The Napkin Noter', imageSource: require('../../assets/ranks/rank-napkin.webp') },
  { min: 22,  max: 42,  title: 'The Dimwit', imageSource: require('../../assets/ranks/rank-dimwit.webp') },
  { min: 8,   max: 21,  title: 'The Goldfish', imageSource: require('../../assets/ranks/rank-goldfish.webp') },
  { min: 0,   max: 7,   title: 'The Rock', imageSource: require('../../assets/ranks/rank-rock.webp') },
];

export function getRankFromScore(score: number): RankTier {
  const clamped = Math.max(0, Math.min(140, Math.round(score)));
  const match = RANK_THRESHOLDS.find((r) => clamped >= r.min && clamped <= r.max);
  return match ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
}

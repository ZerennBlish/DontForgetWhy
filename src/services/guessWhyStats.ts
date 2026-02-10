import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'guessWhyStats';

export interface GuessWhyStats {
  wins: number;
  losses: number;
  skips: number;
  streak: number;
  bestStreak: number;
}

const defaultStats: GuessWhyStats = {
  wins: 0,
  losses: 0,
  skips: 0,
  streak: 0,
  bestStreak: 0,
};

export async function loadStats(): Promise<GuessWhyStats> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...defaultStats };
  return JSON.parse(raw);
}

async function saveStats(stats: GuessWhyStats): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export async function recordWin(): Promise<GuessWhyStats> {
  const stats = await loadStats();
  stats.wins += 1;
  stats.streak += 1;
  if (stats.streak > stats.bestStreak) {
    stats.bestStreak = stats.streak;
  }
  await saveStats(stats);
  return stats;
}

export async function recordLoss(): Promise<GuessWhyStats> {
  const stats = await loadStats();
  stats.losses += 1;
  stats.streak = 0;
  await saveStats(stats);
  return stats;
}

export async function recordSkip(): Promise<GuessWhyStats> {
  const stats = await loadStats();
  stats.skips += 1;
  stats.streak = 0;
  await saveStats(stats);
  return stats;
}

export async function resetStats(): Promise<GuessWhyStats> {
  const stats = { ...defaultStats };
  await saveStats(stats);
  return stats;
}

export type TriviaCategory =
  | 'general'
  | 'science'
  | 'history'
  | 'pop_culture'
  | 'geography'
  | 'sports'
  | 'technology'
  | 'food';

export interface TriviaQuestion {
  id: string;
  category: TriviaCategory;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
}

export interface TriviaRoundResult {
  category: TriviaCategory;
  totalQuestions: number;
  correctAnswers: number;
  longestStreak: number;
  averageTimeMs: number;
  date: string;
}

export interface TriviaCategoryStats {
  roundsPlayed: number;
  questionsAnswered: number;
  correct: number;
  bestScore: number;
}

export interface TriviaStats {
  totalRoundsPlayed: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  bestRoundScore: number;
  bestRoundCategory: TriviaCategory | null;
  longestStreak: number;
  categoryStats: Record<TriviaCategory, TriviaCategoryStats>;
}

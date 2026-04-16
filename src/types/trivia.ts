// ── Parent categories (shown in UI grid) ────────────────────────────────────
export type TriviaParentCategory =
  | 'general'
  | 'popCulture'
  | 'scienceTech'
  | 'historyPolitics'
  | 'geography'
  | 'sportsLeisure'
  | 'gamingGeek'
  | 'mythFiction';

// ── Subcategories ───────────────────────────────────────────────────────────
export type TriviaSubcategory =
  | 'generalKnowledge'
  | 'film'
  | 'music'
  | 'television'
  | 'celebrities'
  | 'scienceNature'
  | 'computers'
  | 'gadgets'
  | 'mathematics'
  | 'history'
  | 'politics'
  | 'art'
  | 'geography'
  | 'sports'
  | 'boardGames'
  | 'vehicles'
  | 'videoGames'
  | 'comicsAnime'
  | 'mythologyBooks';

// ── Parent → subcategory mapping ────────────────────────────────────────────
export const PARENT_TO_SUBS: Record<TriviaParentCategory, TriviaSubcategory[]> = {
  general: ['generalKnowledge'],
  popCulture: ['film', 'music', 'television', 'celebrities'],
  scienceTech: ['scienceNature', 'computers', 'gadgets', 'mathematics'],
  historyPolitics: ['history', 'politics', 'art'],
  geography: ['geography'],
  sportsLeisure: ['sports', 'boardGames', 'vehicles'],
  gamingGeek: ['videoGames', 'comicsAnime'],
  mythFiction: ['mythologyBooks'],
};

// ── Subcategory display labels ──────────────────────────────────────────────
export const SUBCATEGORY_LABELS: Record<TriviaSubcategory, string> = {
  generalKnowledge: 'General Knowledge',
  film: 'Film & Movies',
  music: 'Music',
  television: 'Television',
  celebrities: 'Celebrities',
  scienceNature: 'Science & Nature',
  computers: 'Computers & Tech',
  gadgets: 'Gadgets & Inventions',
  mathematics: 'Mathematics',
  history: 'History',
  politics: 'Politics & Government',
  art: 'Art & Artists',
  geography: 'Geography',
  sports: 'Sports',
  boardGames: 'Board Games',
  vehicles: 'Vehicles',
  videoGames: 'Video Games',
  comicsAnime: 'Comics, Anime & Cartoons',
  mythologyBooks: 'Mythology & Books',
};

// ── Legacy alias (keep old code compiling until Prompt 3 rewires TriviaScreen)
export type TriviaCategory = TriviaParentCategory;

// ── Question interface ──────────────────────────────────────────────────────
export interface TriviaQuestion {
  id: string;
  category: TriviaParentCategory;
  subcategory: TriviaSubcategory;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
}

// ── Stats interfaces (unchanged shape, just using new category type) ────────
export interface TriviaRoundResult {
  category: TriviaParentCategory;
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
  bestRoundCategory: TriviaParentCategory | null;
  longestStreak: number;
  categoryStats: Record<TriviaParentCategory, TriviaCategoryStats>;
}

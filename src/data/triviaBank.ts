import type { TriviaQuestion, TriviaParentCategory, TriviaSubcategory } from '../types/trivia';

import GENERAL from './triviaBank_general';
import POP_CULTURE from './triviaBank_popCulture';
import SCIENCE_TECH from './triviaBank_scienceTech';
import HISTORY_POLITICS from './triviaBank_historyPolitics';
import GEOGRAPHY from './triviaBank_geography';
import SPORTS_LEISURE from './triviaBank_sportsLeisure';
import GAMING_GEEK from './triviaBank_gamingGeek';
import MYTH_FICTION from './triviaBank_mythFiction';

const ALL_QUESTIONS: TriviaQuestion[] = [
  ...GENERAL,
  ...POP_CULTURE,
  ...SCIENCE_TECH,
  ...HISTORY_POLITICS,
  ...GEOGRAPHY,
  ...SPORTS_LEISURE,
  ...GAMING_GEEK,
  ...MYTH_FICTION,
];

export function getAllQuestions(): TriviaQuestion[] {
  return ALL_QUESTIONS;
}

export function getQuestionsForCategory(category: TriviaParentCategory): TriviaQuestion[] {
  return ALL_QUESTIONS.filter((q) => q.category === category);
}

export function getQuestionsForSubcategory(subcategory: TriviaSubcategory): TriviaQuestion[] {
  return ALL_QUESTIONS.filter((q) => q.subcategory === subcategory);
}

export const TRIVIA_CATEGORIES: { id: TriviaParentCategory; label: string }[] = [
  { id: 'general', label: 'General Knowledge' },
  { id: 'popCulture', label: 'Pop Culture' },
  { id: 'scienceTech', label: 'Science & Tech' },
  { id: 'historyPolitics', label: 'History & Politics' },
  { id: 'geography', label: 'Geography' },
  { id: 'sportsLeisure', label: 'Sports & Leisure' },
  { id: 'gamingGeek', label: 'Gaming & Geek' },
  { id: 'mythFiction', label: 'Myth & Fiction' },
];

// Re-export for convenience
export { ALL_QUESTIONS };
export type { TriviaQuestion };

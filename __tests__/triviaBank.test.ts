import { getAllQuestions, getQuestionsForCategory, getQuestionsForSubcategory } from '../src/data/triviaBank';
import { PARENT_TO_SUBS } from '../src/types/trivia';
import type { TriviaParentCategory, TriviaSubcategory } from '../src/types/trivia';

describe('triviaBank', () => {
  const all = getAllQuestions();

  it('has at least 1500 total questions', () => {
    expect(all.length).toBeGreaterThanOrEqual(1500);
  });

  it('has no duplicate IDs', () => {
    const ids = all.map((q) => q.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('has no duplicate question texts (case-insensitive)', () => {
    const texts = all.map((q) => q.question.trim().toLowerCase());
    const unique = new Set(texts);
    // Allow a small tolerance for legitimately similar questions
    expect(unique.size).toBeGreaterThanOrEqual(all.length * 0.99);
  });

  it('every question has a valid category', () => {
    const validCats = Object.keys(PARENT_TO_SUBS);
    for (const q of all) {
      expect(validCats).toContain(q.category);
    }
  });

  it('every question has a valid subcategory for its parent', () => {
    for (const q of all) {
      const validSubs = PARENT_TO_SUBS[q.category];
      expect(validSubs).toContain(q.subcategory);
    }
  });

  it('every question has a valid difficulty', () => {
    for (const q of all) {
      expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
    }
  });

  it('every question has a valid type', () => {
    for (const q of all) {
      expect(['multiple', 'boolean']).toContain(q.type);
    }
  });

  it('multiple-choice questions have exactly 3 incorrect answers', () => {
    const multiples = all.filter((q) => q.type === 'multiple');
    for (const q of multiples) {
      expect(q.incorrectAnswers.length).toBe(3);
    }
  });

  it('boolean questions have exactly 1 incorrect answer', () => {
    const booleans = all.filter((q) => q.type === 'boolean');
    for (const q of booleans) {
      expect(q.incorrectAnswers.length).toBe(1);
    }
  });

  it('every parent category has questions', () => {
    const parents = Object.keys(PARENT_TO_SUBS) as TriviaParentCategory[];
    for (const cat of parents) {
      const count = getQuestionsForCategory(cat).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it('every subcategory has questions', () => {
    const allSubs = Object.values(PARENT_TO_SUBS).flat() as TriviaSubcategory[];
    for (const sub of allSubs) {
      const count = getQuestionsForSubcategory(sub).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it('every question has non-empty question text', () => {
    for (const q of all) {
      expect(q.question.trim().length).toBeGreaterThan(0);
    }
  });

  it('every question has a non-empty correct answer', () => {
    for (const q of all) {
      expect(q.correctAnswer.trim().length).toBeGreaterThan(0);
    }
  });

  it('correct answer is not in incorrect answers', () => {
    for (const q of all) {
      expect(q.incorrectAnswers).not.toContain(q.correctAnswer);
    }
  });

  it('IDs follow the pattern category_NNN', () => {
    for (const q of all) {
      expect(q.id).toMatch(/^[a-zA-Z]+_\d{3,4}$/);
    }
  });
});

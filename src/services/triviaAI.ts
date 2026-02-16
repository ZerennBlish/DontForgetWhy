import type { TriviaQuestion, TriviaCategory } from '../types/trivia';

// OpenTDB category ID mapping
const CATEGORY_MAP: Partial<Record<TriviaCategory, number | number[]>> = {
  general: 9,
  science: 17,
  history: 23,
  music: 12,
  movies_tv: [11, 14],
  geography: 22,
  sports: 21,
  technology: 18,
  // food has no OpenTDB equivalent
};

interface OpenTDBResponse {
  response_code: number;
  results: Array<{
    category: string;
    type: 'multiple' | 'boolean';
    difficulty: 'easy' | 'medium' | 'hard';
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }>;
}

function decodeHTML(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&eacute;/g, '\u00e9')
    .replace(/&ntilde;/g, '\u00f1')
    .replace(/&ouml;/g, '\u00f6')
    .replace(/&uuml;/g, '\u00fc')
    .replace(/&aacute;/g, '\u00e1')
    .replace(/&iacute;/g, '\u00ed')
    .replace(/&oacute;/g, '\u00f3')
    .replace(/&uacute;/g, '\u00fa')
    .replace(/&lrm;/g, '')
    .replace(/&shy;/g, '')
    .replace(/&#\d+;/g, (match) => {
      const code = parseInt(match.replace('&#', '').replace(';', ''), 10);
      return String.fromCharCode(code);
    });
}

export async function fetchOnlineQuestions(
  category: TriviaCategory,
  count: number = 10,
  difficulty: 'all' | 'easy' | 'medium' | 'hard' = 'all',
): Promise<TriviaQuestion[] | null> {
  const mapping = CATEGORY_MAP[category];
  if (!mapping) return null; // food/kids not available online
  const apiCategory = Array.isArray(mapping)
    ? mapping[Math.floor(Math.random() * mapping.length)]
    : mapping;

  try {
    let url = `https://opentdb.com/api.php?amount=${count}&category=${apiCategory}`;
    if (difficulty !== 'all') {
      url += `&difficulty=${difficulty}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data: OpenTDBResponse = await response.json();
    if (data.response_code !== 0 || !data.results?.length) return null;

    return data.results.map((item, index) => ({
      id: `online_${category}_${Date.now()}_${index}`,
      category,
      type: item.type,
      difficulty: item.difficulty,
      question: decodeHTML(item.question),
      correctAnswer: decodeHTML(item.correct_answer),
      incorrectAnswers: item.incorrect_answers.map(decodeHTML),
    }));
  } catch {
    return null;
  }
}

export async function checkOnlineAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://opentdb.com/api.php?amount=1', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

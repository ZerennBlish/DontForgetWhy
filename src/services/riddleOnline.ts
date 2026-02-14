export interface OnlineRiddle {
  id: string;
  question: string;
  answer: string;
}

function filterRiddle(riddle: OnlineRiddle): boolean {
  if (riddle.question.length < 15) return false;
  if (riddle.answer.length < 2) return false;
  if (!riddle.question.includes('?')) return false;
  if (riddle.answer.length > 100) return false;
  return true;
}

export async function fetchOnlineRiddle(): Promise<OnlineRiddle | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://riddles-api.vercel.app/random', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.riddle || !data?.answer) return null;

    const riddle: OnlineRiddle = {
      id: `online_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      question: String(data.riddle).trim(),
      answer: String(data.answer).trim(),
    };

    if (!filterRiddle(riddle)) return null;
    return riddle;
  } catch {
    return null;
  }
}

export async function fetchMultipleOnlineRiddles(count: number): Promise<OnlineRiddle[]> {
  try {
    const promises = Array.from({ length: count }, () => fetchOnlineRiddle());
    const results = await Promise.all(promises);
    return results.filter((r): r is OnlineRiddle => r !== null);
  } catch {
    return [];
  }
}

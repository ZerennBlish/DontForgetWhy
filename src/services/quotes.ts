const quotes: string[] = [
  "You set this alarm for a reason. Trust past you.",
  "Get up. Do the thing. Then you can sit back down.",
  "Future you is gonna be real mad if you ignore this.",
  "It's not optional. That's why you set an alarm.",
  "You already forgot once. That's why I'm here.",
  "Nobody else is gonna do it for you.",
  "Five minutes. That's all it takes to start.",
  "You'll feel better after it's done. You always do.",
  "Past you was smart enough to set this. Listen to them.",
  "The hard part isn't doing it. It's starting.",
  "This is the reminder you asked for. Don't waste it.",
  "One thing at a time. This is the one thing right now.",
];

export function getRandomQuote(): string {
  return quotes[Math.floor(Math.random() * quotes.length)];
}
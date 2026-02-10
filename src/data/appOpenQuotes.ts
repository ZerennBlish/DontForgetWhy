const appOpenQuotes = [
  'Oh, you remembered this app exists?',
  'Back again? Your memory must be getting worse.',
  "Welcome back. I wasn't sure you'd remember how.",
  'Look who decided to check their alarms.',
  "Your alarms missed you. I didn't.",
  'Ah yes, the person who needs reminders to remember.',
  'Plot twist: you opened the right app.',
  "Let me guess \u2014 you forgot something.",
  'Back so soon? Must be a new record.',
  'I was starting to think you forgot about me too.',
  'Quick, set an alarm to remind you to open this app again.',
  'Your memory thanks you for checking in. Barely.',
];

export function getRandomAppOpenQuote(): string {
  return appOpenQuotes[Math.floor(Math.random() * appOpenQuotes.length)];
}

export { appOpenQuotes };

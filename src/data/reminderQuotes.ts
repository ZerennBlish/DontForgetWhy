const reminderQuotes = [
  'A reminder to make reminders. Very meta.',
  'Your future self called. They said write it down.',
  "If you remembered everything, you wouldn't need me.",
  'Forgetting things is free. Remembering them costs effort.',
  'Your brain has tabs open it forgot about.',
  'Past you left present you a gift. Check your reminders.',
  "You can't forget what you never wrote down. Wait...",
  'Remembering is optional. Regretting is guaranteed.',
  'Your brain called. It wants a backup system.',
  'One does not simply remember everything.',
  'Write it down or cry about it later.',
  "Today's genius idea is tomorrow's 'what was that thing?'",
  'Behind every organized person is a wall of reminders.',
  'Trust your memory? Bold strategy.',
  "This app remembers so you don't have to.",
];

export function getRandomReminderQuote(): string {
  return reminderQuotes[Math.floor(Math.random() * reminderQuotes.length)];
}

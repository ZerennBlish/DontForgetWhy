const reminderQuotes = [
  'Reminders: because your brain runs on vibes, not schedules.',
  "If you remembered everything, I'd be out of a job.",
  'A reminder a day keeps the chaos away. Mostly.',
  "You wrote these down because you knew you'd forget. Smart.",
  'Your future self called. They said thanks for the reminders.',
  'Adulting is just setting reminders and hoping for the best.',
  'Behind every successful person is an app reminding them to do things.',
  "You can't forget what you wrote down. Well, you can. But it's harder.",
  "Tasks don't complete themselves. Neither do you, apparently.",
  'Remember when you remembered things? Me neither.',
  'This list is the only thing standing between you and total chaos.',
  'Procrastination is just remembering you have things to do and choosing violence.',
  "Your to-do list called. It's lonely.",
  "Swipe right if you actually did it. We're watching.",
  'Every completed reminder is a small victory against your brain.',
];

export function getRandomReminderQuote(): string {
  return reminderQuotes[Math.floor(Math.random() * reminderQuotes.length)];
}

export { reminderQuotes };

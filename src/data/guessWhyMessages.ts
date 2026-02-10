const winMessages = [
  'Your memory is like an elephant with a vendetta.',
  'I almost forgot I wanted to tell you something... Good job remembering to remember.',
  'Look at you, remembering things like a functional human.',
  "Plot twist: you actually remembered. I'm impressed.",
  'Your brain cells showed up to work today.',
  'Memory level: above goldfish. Barely.',
  'You remembered! Quick, screenshot this before you forget you remembered.',
];

const loseMessages = [
  'I was going to say something encouraging but I forgot what it was.',
  'Just forget it... oh wait, you already did.',
  "Don't worry, forgetting is just your brain making room for... wait, what was I saying?",
  "Your memory called. It's filing for divorce.",
  'Three strikes. Even your alarm feels bad for you.',
  'Memory of a Goldfish With Amnesia confirmed.',
];

const skipMessages = [
  "Skipping? Bold move for someone who can't remember why they set an alarm.",
  "Fine, I'll just TELL you. Like always.",
  'You gave up faster than your memory did.',
  "Skip button: the official sponsor of 'I have no idea.'",
];

export function getRandomWinMessage(): string {
  return winMessages[Math.floor(Math.random() * winMessages.length)];
}

export function getRandomLoseMessage(): string {
  return loseMessages[Math.floor(Math.random() * loseMessages.length)];
}

export function getRandomSkipMessage(): string {
  return skipMessages[Math.floor(Math.random() * skipMessages.length)];
}

export { winMessages, loseMessages, skipMessages };

const promptMessages = [
  'You set this alarm. Can you remember why? Let\'s find out.',
  "Time to prove you're smarter than a goldfish.",
  "Your past self left you a challenge. Don't embarrass us.",
  "Think hard. I know that's a lot to ask.",
  'Somewhere in that brain is the answer. Probably.',
];

const winMessages = [
  'Your memory is like an elephant with a vendetta.',
  'I almost forgot I wanted to tell you something... Good job remembering to remember.',
  'Look at you, remembering things like a functional human.',
  "Plot twist: you actually remembered. I'm impressed.",
  'Your brain cells showed up to work today.',
  'Memory level: above goldfish. Barely.',
  'You remembered! Quick, screenshot this before you forget you remembered.',
  "Wait, you actually remembered? I'm genuinely shocked.",
  'Lucky guess. Had to be.',
  "Okay fine, your memory isn't completely broken.",
  "Don't let this go to your head. It's already crowded enough in there.",
  "Impressive. Do it again tomorrow and I'll believe you.",
];

const loseMessages = [
  'I was going to say something encouraging but I forgot what it was.',
  'Just forget it... oh wait, you already did.',
  "Don't worry, forgetting is just your brain making room for... wait, what was I saying?",
  "Your memory called. It's filing for divorce.",
  'Three strikes. Even your alarm feels bad for you.',
  'Memory of a Goldfish With Amnesia confirmed.',
  'And there it is. The forgetting we all expected.',
  'Your alarm is somewhere, shaking its head.',
  "That wasn't even close. Are you okay?",
  'Your memory score just filed a complaint.',
  'This is exactly why this app exists.',
  'Wow. You set this alarm YOURSELF and still forgot.',
];

const skipMessages = [
  "Skipping? Bold move for someone who can't remember why they set an alarm.",
  "Fine, I'll just TELL you. Like always.",
  'You gave up faster than your memory did.',
  "Skip button: the official sponsor of 'I have no idea.'",
  "Skipping? That's just forgetting with extra steps.",
  'A skip today is a forgotten alarm tomorrow.',
  "Your brain said 'nah' and honestly, same.",
  'Giving up already? Your alarms expected more.',
];

export function getRandomPromptMessage(): string {
  return promptMessages[Math.floor(Math.random() * promptMessages.length)];
}

export function getRandomWinMessage(): string {
  return winMessages[Math.floor(Math.random() * winMessages.length)];
}

export function getRandomLoseMessage(): string {
  return loseMessages[Math.floor(Math.random() * loseMessages.length)];
}

export function getRandomSkipMessage(): string {
  return skipMessages[Math.floor(Math.random() * skipMessages.length)];
}

export { promptMessages, winMessages, loseMessages, skipMessages };

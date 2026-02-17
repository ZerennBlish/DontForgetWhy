const placeholders: string[] = [
  "You'll forget. You always forget. Write it down.",
  "If you remembered everything, you wouldn't need this app.",
  "Future you has the memory of a goldfish. Help them out.",
  "Past you is begging you to write this down.",
  "Leave this blank and enjoy the mystery later.",
  "You think you'll remember. You won't.",
  "This field is the only thing standing between you and confusion.",
  "Dear Future Me: you're welcome.",
  "Type the reason or accept chaos.",
  "Seriously, why ARE you setting this alarm?",
  "Your brain has tabs open it's about to close.",
  "You set an alarm without a reason once. How'd that go?",
  'Why are you setting this alarm?',
  'Future you will thank you for this note...',
  "Don't be lazy, write something...",
  'What will half-asleep you need to know?',
  "Describe it like you're explaining to a goldfish...",
  'Write it down or forget forever. Your choice.',
  "Be specific. 'Stuff' is not a reason.",
  "Your 3 AM self can't read minds...",
  "Put the reason here. Trust no one. Especially your brain.",
  "One day you'll thank yourself for writing this.",
  "If you leave this blank, that's on you.",
  "Help your future self. They're not very bright.",
  'Write now or cry later.',
  'Your memory called in sick. Leave a note.',
  'Pro tip: actually write something useful here.',
];

export function getRandomPlaceholder(): string {
  return placeholders[Math.floor(Math.random() * placeholders.length)];
}

export default placeholders;

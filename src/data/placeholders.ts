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
];

export function getRandomPlaceholder(): string {
  return placeholders[Math.floor(Math.random() * placeholders.length)];
}

export default placeholders;

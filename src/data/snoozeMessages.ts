const snoozeTiers: string[][] = [
  [
    "Okay, 5 more minutes. But I'm watching you.",
    'Snooze accepted. Your alarm is judging you silently.',
    "Sure, rest up. It's not like you had something to do.",
  ],
  [
    'Again? Really? This is snooze #2.',
    "You know the thing isn't going to do itself, right?",
    "Two snoozes. At this point you're negotiating with yourself.",
  ],
  [
    "This is snooze #3. At this point I'm just talking to myself.",
    "Three snoozes. You're not resting, you're avoiding.",
    "I've seen goldfish with more follow-through.",
  ],
  [
    "I'm not even surprised anymore.",
    'You win. I give up. Snooze forever.',
    'At this point just delete the alarm. Be honest with yourself.',
  ],
];

export function getSnoozeMessage(count: number): string {
  const tierIndex = Math.min(count - 1, snoozeTiers.length - 1);
  const tier = snoozeTiers[Math.max(0, tierIndex)];
  return tier[Math.floor(Math.random() * tier.length)];
}

export { snoozeTiers };

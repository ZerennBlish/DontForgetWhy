const snoozeTiers: string[][] = [
  [
    "Okay, 5 more minutes. But I'm watching you.",
    'Snooze accepted. Your alarm is judging you silently.',
    "Sure, rest up. It's not like you had something to do.",
    'Snoozing already? Bold move.',
    "Five more minutes won't fix your life, but sure.",
    'The alarm had ONE job. You had ONE job. We both failed.',
    "At this point I'm just background noise to you.",
  ],
  [
    'Again? Really? This is snooze #2.',
    "You know the thing isn't going to do itself, right?",
    "Two snoozes. At this point you're negotiating with yourself.",
    'You know this alarm had a reason, right? Oh wait, you forgot.',
    "I'm starting to take this personally.",
    "Your bed isn't that comfortable. I've seen your mattress.",
    "Congratulations, you've snoozed more than you've been awake today.",
  ],
  [
    "This is snooze #3. At this point I'm just talking to myself.",
    "Three snoozes. You're not resting, you're avoiding.",
    "I've seen goldfish with more follow-through.",
    "I've seen sloths with more urgency.",
    "At this point, just delete me. Clearly you don't need alarms.",
    'Your snooze button should file for overtime pay.',
    "I'm not mad. I'm disappointed. Actually no, I'm mad.",
  ],
  [
    "I'm not even surprised anymore.",
    'You win. I give up. Snooze forever.',
    'At this point just delete the alarm. Be honest with yourself.',
    'Legend says this alarm is still going off to this day.',
    'Even your phone is tired of vibrating for you.',
    "I'm telling your other alarms about this.",
    "You've unlocked the Snooze Hall of Shame achievement.",
  ],
];

export function getSnoozeMessage(count: number): string {
  const tierIndex = Math.min(count - 1, snoozeTiers.length - 1);
  const tier = snoozeTiers[Math.max(0, tierIndex)];
  return tier[Math.floor(Math.random() * tier.length)];
}

export { snoozeTiers };

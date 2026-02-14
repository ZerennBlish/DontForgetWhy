export type RiddleCategory = 'memory' | 'classic' | 'wordplay' | 'logic' | 'quick';
export type RiddleDifficulty = 'easy' | 'medium' | 'hard';

export interface Riddle {
  id: number;
  question: string;
  answer: string;
  difficulty: RiddleDifficulty;
  category: RiddleCategory;
}

export const RIDDLES: Riddle[] = [
  // ─── Memory-themed (1–50) ─────────────────────────────────────────────
  // Easy (1–10)
  { id: 1, question: 'I wake you up, but I never sleep. You hit me when I succeed.', answer: 'An alarm', difficulty: 'easy', category: 'memory' },
  { id: 2, question: 'I hold thoughts without a brain. I keep them safe until you return.', answer: 'A notebook', difficulty: 'easy', category: 'memory' },
  { id: 3, question: "I can store thousands of 'memories,' yet I forget them all if I'm wiped.", answer: 'A phone', difficulty: 'easy', category: 'memory' },
  { id: 4, question: 'The more you look for me, the less you can find me.', answer: 'Your keys', difficulty: 'easy', category: 'memory' },
  { id: 5, question: 'I can be full, I can be blank, I can be lost, and I can be found.', answer: 'A mind', difficulty: 'easy', category: 'memory' },
  { id: 6, question: "I'm made of letters, but I'm not the alphabet. I help you remember who to call.", answer: 'A contact list', difficulty: 'easy', category: 'memory' },
  { id: 7, question: 'I show you the past without speaking a word.', answer: 'A photograph', difficulty: 'easy', category: 'memory' },
  { id: 8, question: "I'm always coming, but never arrive.", answer: 'Tomorrow', difficulty: 'easy', category: 'memory' },
  { id: 9, question: "I'm written to remember, but read to forget less.", answer: 'Notes', difficulty: 'easy', category: 'memory' },
  { id: 10, question: 'I can be set, broken, or kept.', answer: 'A promise', difficulty: 'easy', category: 'memory' },
  // Medium (11–30)
  { id: 11, question: "I can be erased, rewritten, and revised\u2014yet I still count as proof.", answer: 'A record', difficulty: 'medium', category: 'memory' },
  { id: 12, question: "I remember everything\u2026 until the power goes out.", answer: 'A computer', difficulty: 'medium', category: 'memory' },
  { id: 13, question: "I'm the place where yesterday lives, but I'm not a calendar.", answer: 'Memory', difficulty: 'medium', category: 'memory' },
  { id: 14, question: "I can bring back a moment, but I can't bring back time.", answer: 'A photo', difficulty: 'medium', category: 'memory' },
  { id: 15, question: "I'm a list you don't want, but you're safer when you have it.", answer: 'A checklist', difficulty: 'medium', category: 'memory' },
  { id: 16, question: 'I can tell you what you did, but not why you did it.', answer: 'A log', difficulty: 'medium', category: 'memory' },
  { id: 17, question: "I'm a reminder you wear that doesn't buzz or ring.", answer: 'A wedding ring', difficulty: 'medium', category: 'memory' },
  { id: 18, question: "I'm a reminder that comes from the past and punishes the future.", answer: 'A regret', difficulty: 'medium', category: 'memory' },
  { id: 19, question: "I'm a place you visit daily, but you never arrive there.", answer: 'The future', difficulty: 'medium', category: 'memory' },
  { id: 20, question: "I can be long, short, good, or bad\u2014but I always end too soon.", answer: 'Time', difficulty: 'medium', category: 'memory' },
  { id: 21, question: 'I can be measured but not held. I can be wasted but not stored.', answer: 'Time', difficulty: 'medium', category: 'memory' },
  { id: 22, question: 'I get stronger the more you use me, but weaker the longer you ignore me.', answer: 'Memory', difficulty: 'medium', category: 'memory' },
  { id: 23, question: "I'm a tool for remembering that also creates forgetting.", answer: 'A phone', difficulty: 'medium', category: 'memory' },
  { id: 24, question: "I'm a message you send to yourself, delivered later by a device.", answer: 'A reminder', difficulty: 'medium', category: 'memory' },
  { id: 25, question: "I'm a number you should never share, but often must remember.", answer: 'A password', difficulty: 'medium', category: 'memory' },
  { id: 26, question: "I'm created once, then repeated forever\u2014unless you change me.", answer: 'A habit', difficulty: 'medium', category: 'memory' },
  { id: 27, question: "I'm a story your brain tells that may not be fully true.", answer: 'A memory', difficulty: 'medium', category: 'memory' },
  { id: 28, question: "I can be triggered by a smell, and suddenly you're somewhere else.", answer: 'A memory', difficulty: 'medium', category: 'memory' },
  { id: 29, question: "I can be kept on paper, in your head, or in the cloud\u2014yet still vanish.", answer: 'Information', difficulty: 'medium', category: 'memory' },
  { id: 30, question: "I'm a place where dates live, but I'm not a cemetery.", answer: 'A calendar', difficulty: 'medium', category: 'memory' },
  // Hard (31–50)
  { id: 31, question: "I'm a thief that steals from everyone equally, but nobody can catch me.", answer: 'Time', difficulty: 'hard', category: 'memory' },
  { id: 32, question: 'I can be stolen without anyone taking anything.', answer: 'Time', difficulty: 'hard', category: 'memory' },
  { id: 33, question: "I exist only after you've done something wrong, and I grow when you replay it.", answer: 'Guilt', difficulty: 'hard', category: 'memory' },
  { id: 34, question: "I'm something you can lose instantly, then spend hours trying to find.", answer: 'Focus', difficulty: 'hard', category: 'memory' },
  { id: 35, question: "I can be 'refreshed,' yet I'm not a drink. I can be 'cleared,' yet I'm not a table.", answer: 'Cache', difficulty: 'hard', category: 'memory' },
  { id: 36, question: "I'm stronger than facts, weaker than feelings, and shaped by both.", answer: 'Memory', difficulty: 'hard', category: 'memory' },
  { id: 37, question: "I'm the answer to 'Where did the day go?'", answer: 'Time passing', difficulty: 'hard', category: 'memory' },
  { id: 38, question: 'I can make a small problem feel huge if you keep replaying it.', answer: 'Worry', difficulty: 'hard', category: 'memory' },
  { id: 39, question: "I'm what you rely on when you say 'I'll remember,' and what you blame when you don't.", answer: 'Memory', difficulty: 'hard', category: 'memory' },
  { id: 40, question: "I can be backed up, restored, corrupted, or deleted\u2014yet I'm not a file.", answer: 'Memory', difficulty: 'hard', category: 'memory' },
  { id: 41, question: "I'm the only thing you can spend without having, and have without holding.", answer: 'Time', difficulty: 'hard', category: 'memory' },
  { id: 42, question: "I'm a lock you can't see. The key must be remembered, not found.", answer: 'A password', difficulty: 'hard', category: 'memory' },
  { id: 43, question: "I'm a record of choices, written in pathways, not ink.", answer: 'Neural pathways', difficulty: 'hard', category: 'memory' },
  { id: 44, question: "I can be true, false, or altered\u2014yet you'll swear I'm accurate.", answer: 'A memory', difficulty: 'hard', category: 'memory' },
  { id: 45, question: "I'm the reason a reminder exists, and the reason you hate needing one.", answer: 'Forgetfulness', difficulty: 'hard', category: 'memory' },
  { id: 46, question: "I'm what you were just about to say, but now I'm gone.", answer: 'A thought on the tip of your tongue', difficulty: 'hard', category: 'memory' },
  { id: 47, question: 'I disappear the moment you start looking for me.', answer: 'What you forgot', difficulty: 'hard', category: 'memory' },
  { id: 48, question: "I am yesterday's tomorrow and tomorrow's yesterday.", answer: 'Today', difficulty: 'hard', category: 'memory' },
  { id: 49, question: 'You use me every second but only notice me when I fail.', answer: 'Memory', difficulty: 'hard', category: 'memory' },
  { id: 50, question: "I'm the thing you swore you'd never need to write down.", answer: 'A password you forgot', difficulty: 'hard', category: 'memory' },

  // ─── Classic riddles (51–70) ──────────────────────────────────────────
  // All Easy
  { id: 51, question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind.', answer: 'An echo', difficulty: 'easy', category: 'classic' },
  { id: 52, question: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish.', answer: 'A map', difficulty: 'easy', category: 'classic' },
  { id: 53, question: 'What has to be broken before you can use it?', answer: 'An egg', difficulty: 'easy', category: 'classic' },
  { id: 54, question: 'I am tall when I am young, and I am short when I am old.', answer: 'A candle', difficulty: 'easy', category: 'classic' },
  { id: 55, question: 'What is full of holes but still holds water?', answer: 'A sponge', difficulty: 'easy', category: 'classic' },
  { id: 56, question: "What is always in front of you but can't be seen?", answer: 'The future', difficulty: 'easy', category: 'classic' },
  { id: 57, question: 'What goes up but never comes down?', answer: 'Your age', difficulty: 'easy', category: 'classic' },
  { id: 58, question: 'The more of this there is, the less you see.', answer: 'Darkness', difficulty: 'easy', category: 'classic' },
  { id: 59, question: 'What gets wet while drying?', answer: 'A towel', difficulty: 'easy', category: 'classic' },
  { id: 60, question: "I follow you all the time and copy your every move, but you can't touch me or catch me.", answer: 'Your shadow', difficulty: 'easy', category: 'classic' },
  { id: 61, question: 'What belongs to you, but other people use it more than you do?', answer: 'Your name', difficulty: 'easy', category: 'classic' },
  { id: 62, question: 'I have legs, but cannot walk.', answer: 'A table', difficulty: 'easy', category: 'classic' },
  { id: 63, question: "What has many keys but can't open a single lock?", answer: 'A piano', difficulty: 'easy', category: 'classic' },
  { id: 64, question: 'What comes once in a minute, twice in a moment, but never in a thousand years?', answer: 'The letter M', difficulty: 'easy', category: 'classic' },
  { id: 65, question: 'I have a head and a tail that will never meet. Having too many of me is always a treat.', answer: 'A coin', difficulty: 'easy', category: 'classic' },
  { id: 66, question: 'What has words, but never speaks?', answer: 'A book', difficulty: 'easy', category: 'classic' },
  { id: 67, question: 'What has a thumb and four fingers, but is not alive?', answer: 'A glove', difficulty: 'easy', category: 'classic' },
  { id: 68, question: "What goes up and down but doesn't move?", answer: 'Stairs', difficulty: 'easy', category: 'classic' },
  { id: 69, question: 'Where does today come before yesterday?', answer: 'The dictionary', difficulty: 'easy', category: 'classic' },
  { id: 70, question: "What has one eye, but can't see?", answer: 'A needle', difficulty: 'easy', category: 'classic' },

  // ─── Logic (71–90) ────────────────────────────────────────────────────
  // All Medium
  { id: 71, question: 'What can travel all around the world without leaving its corner?', answer: 'A stamp', difficulty: 'medium', category: 'logic' },
  { id: 72, question: 'What kind of band never plays music?', answer: 'A rubber band', difficulty: 'medium', category: 'logic' },
  { id: 73, question: "If you drop me I'm sure to crack, but give me a smile and I'll always smile back.", answer: 'A mirror', difficulty: 'medium', category: 'logic' },
  { id: 74, question: 'What has 13 hearts, but no other organs?', answer: 'A deck of cards', difficulty: 'medium', category: 'logic' },
  { id: 75, question: 'I have branches, but no fruit, trunk, or leaves.', answer: 'A bank', difficulty: 'medium', category: 'logic' },
  { id: 76, question: 'What can you catch, but not throw?', answer: 'A cold', difficulty: 'medium', category: 'logic' },
  { id: 77, question: 'What begins with T, ends with T, and has T in it?', answer: 'A teapot', difficulty: 'medium', category: 'logic' },
  { id: 78, question: 'What has a neck but no head?', answer: 'A shirt', difficulty: 'medium', category: 'logic' },
  { id: 79, question: 'What gets bigger the more you take away?', answer: 'A hole', difficulty: 'medium', category: 'logic' },
  { id: 80, question: 'I am an odd number. Take away a letter and I become even.', answer: 'Seven', difficulty: 'medium', category: 'logic' },
  { id: 81, question: 'What goes through cities and fields, but never moves?', answer: 'A road', difficulty: 'medium', category: 'logic' },
  { id: 82, question: 'People buy me to eat, but never eat me.', answer: 'A plate', difficulty: 'medium', category: 'logic' },
  { id: 83, question: 'The person who makes it has no need of it; the person who buys it has no use for it. The person who uses it can neither see nor feel it.', answer: 'A coffin', difficulty: 'medium', category: 'logic' },
  { id: 84, question: 'What has a bottom at the top?', answer: 'Your legs', difficulty: 'medium', category: 'logic' },
  { id: 85, question: 'I am light as a feather, yet the strongest man cannot hold me for much longer than a minute.', answer: 'Breath', difficulty: 'medium', category: 'logic' },
  { id: 86, question: 'What occurs once in a year, twice in a week, but never in a day?', answer: 'The letter E', difficulty: 'medium', category: 'logic' },
  { id: 87, question: 'What asks but never answers?', answer: 'An owl', difficulty: 'medium', category: 'logic' },
  { id: 88, question: 'What kind of room has no doors or windows?', answer: 'A mushroom', difficulty: 'medium', category: 'logic' },
  { id: 89, question: 'I shave every day, but my beard stays the same.', answer: 'A barber', difficulty: 'medium', category: 'logic' },
  { id: 90, question: 'What can fill a room but takes up no space?', answer: 'Light', difficulty: 'medium', category: 'logic' },

  // ─── Wordplay (91–110) ────────────────────────────────────────────────
  // All Hard
  { id: 91, question: 'What five-letter word becomes shorter when you add two letters to it?', answer: 'Short', difficulty: 'hard', category: 'wordplay' },
  { id: 92, question: 'What is so fragile that saying its name breaks it?', answer: 'Silence', difficulty: 'hard', category: 'wordplay' },
  { id: 93, question: "What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?", answer: 'A river', difficulty: 'hard', category: 'wordplay' },
  { id: 94, question: 'What creates a lot of dust but eats it all?', answer: 'A vacuum', difficulty: 'hard', category: 'wordplay' },
  { id: 95, question: "I have keys but no locks. I have a space but no room. You can enter, but can't go outside.", answer: 'A keyboard', difficulty: 'hard', category: 'wordplay' },
  { id: 96, question: "If you have me, you want to share me. If you share me, you haven't got me.", answer: 'A secret', difficulty: 'hard', category: 'wordplay' },
  { id: 97, question: 'What enters the water black and comes out red?', answer: 'A lobster', difficulty: 'hard', category: 'wordplay' },
  { id: 98, question: 'I come from a mine and get surrounded by wood always. Everyone uses me.', answer: 'Pencil lead', difficulty: 'hard', category: 'wordplay' },
  { id: 99, question: 'What has hands but cannot clap?', answer: 'A clock', difficulty: 'hard', category: 'wordplay' },
  { id: 100, question: "A man rides into town on Friday, stays three days, and leaves on Friday. How?", answer: "The horse's name is Friday", difficulty: 'hard', category: 'wordplay' },
  { id: 101, question: "David's father has three sons: Snap, Crackle, and _____?", answer: 'David', difficulty: 'hard', category: 'wordplay' },
  { id: 102, question: 'What is heavier: a ton of bricks or a ton of feathers?', answer: 'Neither, they both weigh a ton', difficulty: 'hard', category: 'wordplay' },
  { id: 103, question: 'What has a bark but no bite?', answer: 'A tree', difficulty: 'hard', category: 'wordplay' },
  { id: 104, question: 'What has a ring but no finger?', answer: 'A telephone', difficulty: 'hard', category: 'wordplay' },
  { id: 105, question: 'The more you take, the more you leave behind.', answer: 'Footsteps', difficulty: 'hard', category: 'wordplay' },
  { id: 106, question: 'What has four legs in the morning, two legs in the afternoon, and three legs in the evening?', answer: 'A human', difficulty: 'hard', category: 'wordplay' },
  { id: 107, question: 'What tastes better than it smells?', answer: 'Your tongue', difficulty: 'hard', category: 'wordplay' },
  { id: 108, question: 'I have no life, but I can die.', answer: 'A battery', difficulty: 'hard', category: 'wordplay' },
  { id: 109, question: 'What wears a cap but has no head?', answer: 'A bottle', difficulty: 'hard', category: 'wordplay' },
  { id: 110, question: 'What flies without wings?', answer: 'Time', difficulty: 'hard', category: 'wordplay' },

  // ─── Quick & Snappy (111–145) ─────────────────────────────────────────
  // Easy (111–126)
  { id: 111, question: 'What goes up as soon as the rain comes down?', answer: 'An umbrella', difficulty: 'easy', category: 'quick' },
  { id: 112, question: 'What building has the most stories?', answer: 'The library', difficulty: 'easy', category: 'quick' },
  { id: 113, question: 'What word is spelled wrong in the dictionary?', answer: 'Wrong', difficulty: 'easy', category: 'quick' },
  { id: 114, question: 'Mr. Blue lives in the Blue house. Mr. Yellow lives in the Yellow house. Who lives in the White house?', answer: 'The President', difficulty: 'easy', category: 'quick' },
  { id: 115, question: 'What can you break, even if you never pick it up or touch it?', answer: 'A promise', difficulty: 'easy', category: 'quick' },
  { id: 116, question: 'What is easy to get into but hard to get out of?', answer: 'Trouble', difficulty: 'easy', category: 'quick' },
  { id: 117, question: 'What can you hold in your left hand but not in your right?', answer: 'Your right elbow', difficulty: 'easy', category: 'quick' },
  { id: 118, question: 'I am a fruit. If you take away my first letter, I am a crime. If you take away my first two letters, I am an animal.', answer: 'Grape', difficulty: 'easy', category: 'quick' },
  { id: 119, question: 'What two things can you never eat for breakfast?', answer: 'Lunch and dinner', difficulty: 'easy', category: 'quick' },
  { id: 120, question: 'What gets sharper the more you use it?', answer: 'Your brain', difficulty: 'easy', category: 'quick' },
  { id: 121, question: 'Which month has 28 days?', answer: 'All of them', difficulty: 'easy', category: 'quick' },
  { id: 122, question: 'What has a tongue but cannot speak?', answer: 'A shoe', difficulty: 'easy', category: 'quick' },
  { id: 123, question: 'What has a head, a tail, is brown, and has no legs?', answer: 'A penny', difficulty: 'easy', category: 'quick' },
  { id: 124, question: 'What is black when you buy it, red when you use it, and grey when you throw it away?', answer: 'Charcoal', difficulty: 'easy', category: 'quick' },
  { id: 125, question: "You see a boat filled with people, yet there isn't a single person on board. How?", answer: 'They are all married', difficulty: 'easy', category: 'quick' },
  { id: 126, question: 'What kills you if you eat it, but if you eat nothing you will die?', answer: 'Nothing', difficulty: 'easy', category: 'quick' },
  // Medium (127–140)
  { id: 127, question: 'Forward I am heavy, but backward I am not.', answer: 'Ton', difficulty: 'medium', category: 'quick' },
  { id: 128, question: 'What word begins and ends with an E but only has one letter?', answer: 'Envelope', difficulty: 'medium', category: 'quick' },
  { id: 129, question: "I have no voice, yet I speak to all. I have no pages, yet I tell stories.", answer: 'A painting', difficulty: 'medium', category: 'quick' },
  { id: 130, question: 'If I drink, I die. If I eat, I am fine.', answer: 'Fire', difficulty: 'medium', category: 'quick' },
  { id: 131, question: 'What moves faster: heat or cold?', answer: 'Heat, because you can catch a cold', difficulty: 'medium', category: 'quick' },
  { id: 132, question: "What do you throw out when you want to use it, but take in when you don't?", answer: 'An anchor', difficulty: 'medium', category: 'quick' },
  { id: 133, question: "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me.", answer: 'Fire', difficulty: 'medium', category: 'quick' },
  { id: 134, question: 'The more you leave behind, the more you take.', answer: 'Steps', difficulty: 'medium', category: 'quick' },
  { id: 135, question: "What can go up a chimney down, but can't go down a chimney up?", answer: 'An umbrella', difficulty: 'medium', category: 'quick' },
  { id: 136, question: 'What creates a shadow but has no body?', answer: 'A cloud', difficulty: 'medium', category: 'quick' },
  { id: 137, question: 'What 4-letter word can be written forward, backward or upside down, and can still be read from left to right?', answer: 'NOON', difficulty: 'medium', category: 'quick' },
  { id: 138, question: 'What comes down but never goes up?', answer: 'Rain', difficulty: 'medium', category: 'quick' },
  { id: 139, question: 'What is black and white and read all over?', answer: 'A newspaper', difficulty: 'medium', category: 'quick' },
  { id: 140, question: 'What is the end of everything?', answer: 'The letter G', difficulty: 'medium', category: 'quick' },
  // Hard (141–145)
  { id: 141, question: 'What can you keep after giving it to someone?', answer: 'Your word', difficulty: 'hard', category: 'quick' },
  { id: 142, question: 'What breaks yet never falls, and what falls yet never breaks?', answer: 'Day and night', difficulty: 'hard', category: 'quick' },
  { id: 143, question: 'What English word has three consecutive double letters?', answer: 'Bookkeeper', difficulty: 'hard', category: 'quick' },
  { id: 144, question: 'What is seen in the middle of March and April but not at the beginning or end of either?', answer: 'The letter R', difficulty: 'hard', category: 'quick' },
  { id: 145, question: 'I have no wings but I can fly. I have no eyes but I can cry.', answer: 'A cloud', difficulty: 'hard', category: 'quick' },
];

export const CATEGORY_LABELS: Record<RiddleCategory, string> = {
  memory: 'Memory',
  classic: 'Classic',
  wordplay: 'Wordplay',
  logic: 'Logic',
  quick: 'Quick',
};

export const DIFFICULTY_COLORS: Record<RiddleDifficulty, string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
};

/**
 * Deterministic daily riddle index: sum char codes of YYYY-MM-DD string, mod by riddle count.
 */
export function getDailyRiddleIndex(dateStr: string): number {
  let sum = 0;
  for (let i = 0; i < dateStr.length; i++) {
    sum += dateStr.charCodeAt(i);
  }
  return sum % RIDDLES.length;
}

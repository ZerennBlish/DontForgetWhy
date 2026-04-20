// DFW Alarm Guy voice: tired, sarcastic, unimpressed, occasionally genuine.
// Keep it clean (E rating). No profanity.

interface RoastPool {
  good: string[];        // rare compliments (backhanded)
  inaccuracy: string[];  // light jabs
  mistake: string[];     // medium roasts
  blunder: string[];     // full roasts
  catastrophe: string[]; // savage
  takeBack: string[];    // used their one take-back
}

export const chessRoasts: RoastPool = {
  good: [
    "That was... actually decent. Don't let it go to your head.",
    "Huh. A real move. I'm as surprised as you are.",
    "Fine. That worked. Broken clocks and all that.",
    "Okay, I saw that. Do it again before I start believing in you.",
    "Not bad. Suspiciously not bad, actually.",
    "I'd clap, but I don't want to inflate the ego.",
    "You played that like someone who's read a chess book. Just one, though.",
    "Credit where it's due. One sentence of credit. That was the sentence.",
    "Legitimately solid. Now ruin it with your next move.",
    "That move had a plan. I'm choosing to believe you had the plan too.",
  ],
  inaccuracy: [
    "Eh, close enough. If you squint, that's almost a real move.",
    "Not wrong, exactly. Just not right.",
    "That'll do. Barely. Like a participation trophy.",
    "I've seen worse. I've also seen better. Mostly better.",
    "That move exists. It happened. We'll move on.",
    "Slightly off. Like your posture right now.",
    "You were in the neighborhood of a good move. Wrong house, though.",
    "Technically legal. Aesthetically questionable.",
    "I'll allow it. The bar is on the floor.",
    "That's the kind of move you play while thinking about lunch.",
  ],
  mistake: [
    "Bold strategy. Wrong, but bold.",
    "Oh, we're just handing pieces out now? Cool, cool.",
    "You saw the good move. You chose violence instead.",
    "That move had options. You picked the worst one.",
    "I'm not mad. I'm just rethinking our whole friendship.",
    "Did the board offend you personally?",
    "That was a move. A verb. Not a good one.",
    "You played that with so much confidence. Misplaced, but so much of it.",
    "I studied the board. You studied the ceiling, apparently.",
    "That's going in the highlight reel. The bad one.",
  ],
  blunder: [
    "I physically felt that move. Are you okay?",
    "That wasn't a blunder. A blunder implies you had a plan.",
    "Okay, new rule: you have to announce the piece you're donating.",
    "I was going to warn you but I wanted to see how far you'd go.",
    "That move will be studied. In warning posters.",
    "I haven't seen a drop like that since my phone hit concrete.",
    "You just gave that away like it was a birthday present. It's not my birthday.",
    "I'm going to need a moment. Possibly several.",
    "That was the move equivalent of stepping on a rake.",
    "Somewhere, a chess coach felt a chill and doesn't know why.",
  ],
  catastrophe: [
    "That wasn't a chess move. That was a cry for help.",
    "I'm writing your eulogy as a player. It's short.",
    "The pieces held a meeting. They've voted to leave.",
    "That move violated the Geneva Convention of chess.",
    "I'd explain what you did wrong but we don't have that kind of time.",
    "Historians will mark today as the day the board wept.",
    "That was less a move and more a controlled demolition.",
    "You took the game. You set it on fire. You salted the earth.",
    "I've seen pigeons play better. And they knock the pieces over.",
    "That was art. Terrible, tragic art. Possibly performance art.",
  ],
  takeBack: [
    "Oh, a take-back? Sure, let's pretend that never happened. Just like your chess career.",
    "Using the take-back. Bold move. Cotton.",
    "One take-back, one time. Spend it wisely. You didn't, but go off.",
    "Rewinding the tape. Don't get used to this.",
    "Okay, erasing the evidence. I'll never speak of it. For five minutes.",
    "You get one of these. Just one. Don't look at me like that.",
    "Do-over accepted. The shame is non-refundable, though.",
    "Fine. Unplayed. But I saw it. I will always have seen it.",
  ],
};

export interface BannerQuote {
  section: string;
  text: string;
}

const HOME_BANNER_QUOTES: BannerQuote[] = [
  { section: 'alarms', text: "Snooze to hear my wonderful voice, or double tap to shut me up." },
  { section: 'alarms', text: "Set recurring alarms for when your life is stuck on repeat. Set recurring alarms for when your life is stuck on repeat." },
  { section: 'alarms', text: "Alarms have silent, vibrate, and custom sounds. For that person who's picky about what annoys them." },
  { section: 'alarms', text: "Tap the alarm to edit it and see what you forgot. Press delete to remove life's responsibilities, or recover them from the trash right next to my life's goals." },
  { section: 'alarms', text: "You can attach photos to alarms so you can see whatever you love when your alarm goes off. Even if it's your 8 cats." },
  { section: 'alarms', text: "The Guess Why game makes use of that pint-sized memory of yours to answer why you set the alarm before turning it off." },
  { section: 'alarms', text: "Unlike your bad habits, one-time alarms delete themselves when they finish." },
  { section: 'alarms', text: "Pin your important alarms to the top. All two of them." },
  { section: 'alarms', text: "Add a reason to your alarm so you remember why you ruined your morning." },

  { section: 'reminders', text: "Set a date and time, and I'll nag you. It's what I live for. Literally." },
  { section: 'reminders', text: "Reminders: less annoying than alarms but just as important." },
  { section: 'reminders', text: "Recurring reminders repeat so you don't have to remember to remember." },
  { section: 'reminders', text: "Tap a reminder to edit it. Because your first attempt was probably wrong." },
  { section: 'reminders', text: "Your loved ones keep loving you because you remembered their birthdays. Barely." },
  { section: 'reminders', text: "Reminders show up as notifications. You know, the things you ignore." },
  { section: 'reminders', text: "Mark it complete when you're done. Or lie to yourself. I don't check." },
  { section: 'reminders', text: "Daily, weekly, or yearly. Pick how often you need to be reminded you forgot." },
  { section: 'reminders', text: "Everyone could use a reminder about something. So here's your reminder to set up your reminders." },
  { section: 'reminders', text: "Deleted a reminder by mistake and scared you're going to forget what it was? Well that's on you. Sort and filter lets you find old reminders and restore them." },

  { section: 'calendar', text: "In case you forgot \u2014 colored dots mean you have something to do. Tap for daily, weekly, or monthly views." },
  { section: 'calendar', text: "Plan out months ahead of time. Who are we kidding, just try to make some sort of a plan. But it's there if you need it." },
  { section: 'calendar', text: "Color-coded dots to make it simple. Even for you. Unless you're colorblind, then I am truly sorry." },
  { section: 'calendar', text: "See what the colors are for on the main calendar screen. Or don't. I really couldn't care less." },
  { section: 'calendar', text: "The calendar doesn't judge. But it tells me things so I can." },
  { section: 'calendar', text: "Everything you'll make an excuse for not doing later, in one place." },
  { section: 'calendar', text: "Organize your calendar so little Tommy doesn't get left at soccer practice for 3 hours until a homeless man \u2014 wait, that's me. Forget I said anything." },

  { section: 'notepad', text: "Tap the plus button to write something down before your brain loses it." },
  { section: 'notepad', text: "You can draw on notes. In case words are too advanced." },
  { section: 'notepad', text: "Attach a photo to your note. Evidence helps." },
  { section: 'notepad', text: "Pin important notes to the top. So they're the first thing you ignore." },
  { section: 'notepad', text: "Pick a color for your note. Organize your chaos with style." },
  { section: 'notepad', text: "Share a note by tapping the share button. Spread your thoughts like a virus." },
  { section: 'notepad', text: "Notes live on your calendar too. Green dots. Try to keep up." },
  { section: 'notepad', text: "Write it down or it didn't happen. Those are the rules." },
  { section: 'notepad', text: "Your brain is not a hard drive. It's barely a sticky note. Use mine." },

  { section: 'voice', text: "Record your own voice so you don't have to hear mine." },
  { section: 'voice', text: "Record a note when you're too lazy to type. So this will get used more than a karaoke machine on a Friday night." },
  { section: 'voice', text: "Start and stop mid-recording, like you're cutting someone off. You know how to do it. I'm sure." },
  { section: 'voice', text: "Add a title and note to your voice memos so you don't forget what you're remembering." },
  { section: 'voice', text: "Pin your most important ones to the top. Like the one where you just kept talking and talking." },
  { section: 'voice', text: "Voice memos show up on your calendar as purple dots. Fancy." },
  { section: 'voice', text: "The mic widget on your home screen is one tap to record. Even you can manage that." },
  { section: 'voice', text: "Tap a memo to replay it. Hear how unhinged you sound." },
  { section: 'voice', text: "Save it or discard it. Just like your New Year's resolutions." },

  { section: 'timers', text: "Pick a preset or make a custom one. Either way, you're going to forget what you're timing." },
  { section: 'timers', text: "Your timer fires even when the app is closed. You can run but you can't hide from me." },
  { section: 'timers', text: "Pause a timer if you need to. Resume when you remember it exists. If you remember it exists." },
  { section: 'timers', text: "Custom timers let you set hours, minutes, and seconds. For when burning eggs isn't enough and you want to burn a roast too." },
  { section: 'timers', text: "Pin your favorite presets to the home widget. Quick start for slow people." },
  { section: 'timers', text: "Timer done? I'll let you know. What you do with that information is between you and your burnt food." },
  { section: 'timers', text: "Timers have their own sounds. Pick one that matches your panic level." },
  { section: 'timers', text: "Set a timer for your laundry. Or don't. Enjoy your mildew shirts." },
  { section: 'timers', text: "You can run multiple timers at once. Look at you pretending to multitask." },

  { section: 'games', text: "Five games to sharpen whatever it is you've got going on up there." },
  { section: 'games', text: "Guess Why tests if you remember why you set your alarm. Spoiler: your track record isn't great." },
  { section: 'games', text: "Memory Guy Match. Flip cards. Find pairs. Try not to embarrass yourself." },
  { section: 'games', text: "Sudoku. Numbers. Logic. Everything you avoid at the grocery store self-checkout." },
  { section: 'games', text: "Trivia questions to prove you know things. No pressure. Actually, lots of pressure." },
  { section: 'games', text: "Daily Riddle gives you one shot per day. One. So don't waste it being you." },
  { section: 'games', text: "Your scores are tracked forever. Every win. Every loss. Mostly losses." },
  { section: 'games', text: "Play a game while your timer runs. It's called multitasking. Google it." },
  { section: 'games', text: "These games train your brain. Yours has been running on fumes so this should help." },
];

export function getRandomBannerQuote(): BannerQuote {
  return HOME_BANNER_QUOTES[Math.floor(Math.random() * HOME_BANNER_QUOTES.length)];
}

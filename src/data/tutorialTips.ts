export interface TutorialTip {
  title: string;
  body: string;
  clipKey?: string;
}

export const TUTORIAL_TIPS: Record<string, TutorialTip[]> = {
  alarmList: [
    {
      title: 'Swipe to Delete',
      body: "Swipe any alarm either direction to soft-delete it. There's a 5-second undo toast in case your thumb moved faster than your brain, plus 30 days in the Deleted filter for the truly indecisive.",
      clipKey: 'tutorial_alarmList_01',
    },
    {
      title: 'Alarm Photos',
      body: "Add a photo to any alarm. It shows full-screen when the alarm fires. Use it for motivation, guilt, or a picture of whatever you're supposed to remember. We don't judge.",
      clipKey: 'tutorial_alarmList_02',
    },
    {
      title: 'Pin to Widget',
      body: "Pin alarms to the home screen widget. Because apparently opening the app was too many steps for you.",
      clipKey: 'tutorial_alarmList_03',
    },
  ],
  reminders: [
    {
      title: 'Mark Complete',
      body: "Tap the checkbox to complete a reminder. Recurring ones reset for the next cycle. One-time ones get crossed off and tucked away after midnight so they stop haunting you by morning.",
      clipKey: 'tutorial_reminders_01',
    },
    {
      title: 'Swipe to Delete',
      body: "Swipe either direction to delete. Same undo toast, same 30-day grace period. We believe in second chances around here.",
      clipKey: 'tutorial_reminders_02',
    },
  ],
  notepad: [
    {
      title: 'Attachments',
      body: "Tap the toolbar to add photos from gallery, take a new photo, or draw with your finger or S Pen (pressure sensitivity included). The paperclip button shows what you've attached.",
      clipKey: 'tutorial_notepad_01',
    },
    {
      title: 'Colors',
      body: "Background and font colors. Customize each note individually. Make it look like a crime scene evidence board or a sunset meditation journal. No judgment either way.",
      clipKey: 'tutorial_notepad_02',
    },
    {
      title: 'Swipe to Delete',
      body: "You've seen this one before. Swipe either direction, undo toast, 30 days in the trash. We're consistent like that.",
      clipKey: 'tutorial_notepad_03',
    },
  ],
  voiceMemoList: [
    {
      title: 'Multi-Clip Memos',
      body: "Each memo is a container that holds multiple audio clips. Tap 'Add Clip' on the detail screen to stack recordings into one place. Think of it as chapters for your stream of consciousness.",
      clipKey: 'tutorial_voiceMemoList_01',
    },
    {
      title: 'Photos',
      body: "Attach up to 5 photos per memo from camera or gallery. Visual context for when \"I'll remember what I meant\" inevitably fails.",
      clipKey: 'tutorial_voiceMemoList_02',
    },
    {
      title: 'Swipe to Delete',
      body: "Same system, same sass. You know the routine.",
      clipKey: 'tutorial_voiceMemoList_03',
    },
  ],
  calendar: [
    {
      title: "It's a Calendar",
      body: "It shows your alarms, reminders, notes, and voice memos by date. Tap a day to see what's there, tap the plus buttons to create something new. If you need more instructions than that, we should talk.",
      clipKey: 'tutorial_calendar_01',
    },
  ],
  timers: [
    {
      title: 'Custom Timers',
      body: "Create your own presets with a name and emoji of your choosing. \"Laundry \u{1F9FA}\" or \"Existential Crisis \u231B\" \u2014 whatever gets you through the day.",
      clipKey: 'tutorial_timers_01',
    },
    {
      title: 'Pin to Widget',
      body: "Pin your favorite presets to the home screen widget for one-tap starts. Because sometimes 3 seconds of app loading is 3 seconds too many.",
      clipKey: 'tutorial_timers_02',
    },
  ],
  games: [
    {
      title: 'Brain Games',
      body: "Chess, checkers, sudoku, trivia, memory match, daily riddles, and more. If you need someone to explain what games are for, we might not be compatible. But hey, you made it this far \u2014 there's hope.",
      clipKey: 'tutorial_games_01',
    },
  ],
};

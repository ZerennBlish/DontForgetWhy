export interface NoteIcon {
  id: string;
  emoji: string;
}

export const NOTE_ICON_GROUPS: { label: string; icons: NoteIcon[] }[] = [
  {
    label: 'Ideas & Work',
    icons: [
      { id: 'idea', emoji: '💡' },
      { id: 'work', emoji: '💼' },
      { id: 'computer', emoji: '💻' },
      { id: 'write', emoji: '✏️' },
      { id: 'book', emoji: '📖' },
      { id: 'target', emoji: '🎯' },
    ],
  },
  {
    label: 'Daily Life',
    icons: [
      { id: 'shopping', emoji: '🛒' },
      { id: 'food', emoji: '🍽️' },
      { id: 'home', emoji: '🏠' },
      { id: 'car', emoji: '🚗' },
      { id: 'phone', emoji: '📱' },
      { id: 'mail', emoji: '📬' },
    ],
  },
  {
    label: 'Health & People',
    icons: [
      { id: 'health', emoji: '💊' },
      { id: 'fitness', emoji: '🏃' },
      { id: 'heart', emoji: '❤️' },
      { id: 'family', emoji: '👨‍👩‍👧' },
      { id: 'friend', emoji: '👋' },
      { id: 'pet', emoji: '🐾' },
    ],
  },
  {
    label: 'Fun & Other',
    icons: [
      { id: 'star', emoji: '⭐' },
      { id: 'music', emoji: '🎵' },
      { id: 'travel', emoji: '✈️' },
      { id: 'gift', emoji: '🎁' },
      { id: 'money', emoji: '💲' },
      { id: 'pin', emoji: '📌' },
    ],
  },
];

export const ALL_NOTE_ICONS: NoteIcon[] = NOTE_ICON_GROUPS.flatMap((g) => g.icons);

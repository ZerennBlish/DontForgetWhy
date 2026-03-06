export interface Note {
  id: string;
  text: string;
  color: string;
  fontColor?: string | null;
  icon: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export const NOTE_FONT_COLORS: string[] = [
  'auto',
  '#FFFFFF',
  '#1A1A2E',
  '#000000',
  '#FF6B6B',
  '#4A90D9',
  '#FF9F43',
  '#55EFC4',
  '#A29BFE',
  'custom',
];

export const NOTE_COLORS: string[] = [
  '#FFFFFF', // White
  '#1A1A2E', // Black (not pure black — matches the app's dark tones)
  '#4A90D9', // Blue
  '#FF6B6B', // Coral
  '#FF9F43', // Orange
  '#FECA57', // Yellow
  '#48DBFB', // Cyan
  '#A29BFE', // Purple
  '#55EFC4', // Mint
  '#FD79A8', // Pink
  'custom',
];

export const CUSTOM_BG_COLOR_KEY = 'note_custom_bg_color';
export const CUSTOM_FONT_COLOR_KEY = 'note_custom_font_color';

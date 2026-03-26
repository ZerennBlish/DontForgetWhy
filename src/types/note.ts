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
  images?: string[];
}

export const NOTE_FONT_COLORS: string[] = [
  'auto',
  '#F0F0F0', // Off-white
  '#B0B0B0', // Light gray
  '#0D0D1A', // Near-black
  '#3D3D50', // Dark gray
  '#FF9E9E', // Light red
  '#CC3333', // Dark red
  '#7BB8F0', // Light blue
  '#2A5F9E', // Dark blue
  '#7EEDC4', // Light green
  '#2D9B72', // Dark green
  '#FFC285', // Light orange
  '#CC7A1F', // Dark orange
  '#C4BBFF', // Light purple
  '#6C5CE7', // Dark purple
  '#FFB0CE', // Light pink
  '#D63384', // Dark pink
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

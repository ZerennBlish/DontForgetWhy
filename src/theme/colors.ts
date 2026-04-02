export interface ThemeColors {
  mode: 'dark' | 'light';
  background: string;
  card: string;
  cardElevated: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  red: string;
  orange: string;
  activeBackground: string;
  overlayWin: string;
  overlayLose: string;
  overlaySkip: string;
  overlayButton: string;
  overlayText: string;
  modalOverlay: string;
  // Section colors — every theme defines its own palette
  sectionAlarm: string;
  sectionReminder: string;
  sectionCalendar: string;
  sectionNotepad: string;
  sectionVoice: string;
  sectionTimer: string;
  sectionGames: string;
  brandTitle: string;
}

const dark: ThemeColors = {
  mode: 'dark',
  background: '#0A0A12',
  card: '#1A1A28',
  cardElevated: '#242438',
  accent: '#5B9EE6',
  textPrimary: '#ECEDF0',
  textSecondary: '#9498AC',
  textTertiary: '#5C6070',
  border: '#2C2C40',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#1A2A44',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  sectionAlarm: '#FF6B6B',
  sectionReminder: '#4A90D9',
  sectionCalendar: '#E17055',
  sectionNotepad: '#55EFC4',
  sectionVoice: '#A29BFE',
  sectionTimer: '#FDCB6E',
  sectionGames: '#A8E06C',
  brandTitle: '#2563EB',
};

const light: ThemeColors = {
  mode: 'light',
  background: '#F2F3F8',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  accent: '#3B82F6',
  textPrimary: '#374151',
  textSecondary: '#6B7280',
  textTertiary: '#B0B7C3',
  border: '#DEE0E8',
  red: '#DC2626',
  orange: '#EA580C',
  activeBackground: '#E8EDFF',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  sectionAlarm: '#EF5555',
  sectionReminder: '#4A90E6',
  sectionCalendar: '#E06545',
  sectionNotepad: '#38D99A',
  sectionVoice: '#8B7FEE',
  sectionTimer: '#E0B830',
  sectionGames: '#78BF3E',
  brandTitle: '#1E3A5F',
};

const highContrast: ThemeColors = {
  mode: 'dark',
  background: '#000000',
  card: '#1A1A1A',
  cardElevated: '#2A2A2A',
  accent: '#00D4FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textTertiary: '#AAAAAA',
  border: '#666666',
  red: '#FF4444',
  orange: '#FFB300',
  activeBackground: '#002838',
  overlayWin: 'rgba(34, 139, 34, 0.90)',
  overlayLose: 'rgba(200, 40, 40, 0.90)',
  overlaySkip: 'rgba(200, 160, 30, 0.90)',
  overlayButton: 'rgba(255, 255, 255, 0.35)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.85)',
  sectionAlarm: '#FF4444',
  sectionReminder: '#4DA6FF',
  sectionCalendar: '#FF7733',
  sectionNotepad: '#44FFBB',
  sectionVoice: '#BB88FF',
  sectionTimer: '#FFE044',
  sectionGames: '#88FF44',
  brandTitle: '#00D4FF',
};

const vivid: ThemeColors = {
  mode: 'dark',
  background: '#0C0C18',
  card: '#1A1A2C',
  cardElevated: '#24243A',
  accent: '#7C5CFC',
  textPrimary: '#F0F0F8',
  textSecondary: '#9898B8',
  textTertiary: '#606078',
  border: '#2E2E48',
  red: '#FF5757',
  orange: '#FF8C42',
  activeBackground: '#1E1040',
  overlayWin: 'rgba(66, 230, 149, 0.85)',
  overlayLose: 'rgba(255, 87, 87, 0.85)',
  overlaySkip: 'rgba(255, 217, 61, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.8)',
  sectionAlarm: '#FF6B9D',
  sectionReminder: '#7C5CFC',
  sectionCalendar: '#FF8C42',
  sectionNotepad: '#42E695',
  sectionVoice: '#42C6FF',
  sectionTimer: '#FFD93D',
  sectionGames: '#FF5757',
  brandTitle: '#FF6B9D',
};

export const themes = {
  dark,
  light,
  highContrast,
  vivid,
} as const;

export type ThemeName = keyof typeof themes;

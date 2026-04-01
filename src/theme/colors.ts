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
};

const light: ThemeColors = {
  mode: 'light',
  background: '#F2F3F8',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  accent: '#2563EB',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
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
};

export const themes = {
  dark,
  light,
  highContrast,
} as const;

export type ThemeName = keyof typeof themes;

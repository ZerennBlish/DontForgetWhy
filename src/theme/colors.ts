export interface ThemeColors {
  mode: 'dark' | 'light';
  background: string;
  card: string;
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

const midnight: ThemeColors = {
  mode: 'dark',
  background: '#0F0F1A',
  card: '#1A1A2E',
  accent: '#4A90D9',
  textPrimary: '#E8E8F0',
  textSecondary: '#A0A0BC',
  textTertiary: '#6A6A85',
  border: '#2A2A40',
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

const charcoal: ThemeColors = {
  mode: 'dark',
  background: '#121212',
  card: '#242424',
  accent: '#6C9AE0',
  textPrimary: '#EBEBEB',
  textSecondary: '#A8A8A8',
  textTertiary: '#686868',
  border: '#333333',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#2E2E2E',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

const amoled: ThemeColors = {
  mode: 'dark',
  background: '#000000',
  card: '#1C1C1C',
  accent: '#BB86FC',
  textPrimary: '#F0F0F0',
  textSecondary: '#A8A8A8',
  textTertiary: '#686868',
  border: '#2A2A2A',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#222222',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

const slate: ThemeColors = {
  mode: 'dark',
  background: '#0F1923',
  card: '#1A2733',
  accent: '#00B4D8',
  textPrimary: '#E0EAF0',
  textSecondary: '#8BA4B8',
  textTertiary: '#5A7080',
  border: '#253545',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#1C3040',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

const ember: ThemeColors = {
  mode: 'dark',
  background: '#1A1310',
  card: '#2E2218',
  accent: '#FF7A45',
  textPrimary: '#F5EDE5',
  textSecondary: '#C0A890',
  textTertiary: '#8A7565',
  border: '#422E25',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#3A2820',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

const paper: ThemeColors = {
  mode: 'light',
  background: '#FAFAFA',
  card: '#FFFFFF',
  accent: '#2563EB',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9E9E9E',
  border: '#E5E5E5',
  red: '#D32F2F',
  orange: '#E67E22',
  activeBackground: '#EBF2FF',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

const cream: ThemeColors = {
  mode: 'light',
  background: '#F5F0E8',
  card: '#FFFCF5',
  accent: '#C07830',
  textPrimary: '#2A2018',
  textSecondary: '#6B5D50',
  textTertiary: '#9E9088',
  border: '#E0D8C8',
  red: '#D32F2F',
  orange: '#E67E22',
  activeBackground: '#EDE4D4',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

const arctic: ThemeColors = {
  mode: 'light',
  background: '#F0F4F8',
  card: '#FFFFFF',
  accent: '#0077B6',
  textPrimary: '#0A1628',
  textSecondary: '#4A6070',
  textTertiary: '#7A8A96',
  border: '#D8E4EE',
  red: '#D32F2F',
  orange: '#E67E22',
  activeBackground: '#DCE8F2',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

export const themes = {
  midnight,
  charcoal,
  amoled,
  slate,
  ember,
  paper,
  cream,
  arctic,
} as const;

export type ThemeName = keyof typeof themes | 'custom';

// --- Color utilities for custom theme generation ---

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  );
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  );
}

function clampAccent(hex: string): string {
  const lum = luminance(hex);
  if (lum < 0.08) {
    return mix(hex, '#FFFFFF', 0.25);
  }
  if (lum > 0.92) {
    return mix(hex, '#000000', 0.25);
  }
  return hex;
}

export function generateCustomThemeDual(bgHex: string, accentHex: string): ThemeColors {
  const bgLum = luminance(bgHex);
  const isDark = bgLum < 0.5;
  const clamped = clampAccent(accentHex);

  if (isDark) {
    return {
      mode: 'dark',
      background: mix(bgHex, '#000000', 0.3),
      card: mix(bgHex, '#FFFFFF', 0.12),
      accent: clamped,
      textPrimary: mix(bgHex, '#FFFFFF', 0.88),
      textSecondary: mix(bgHex, '#FFFFFF', 0.60),
      textTertiary: mix(bgHex, '#FFFFFF', 0.35),
      border: mix(bgHex, '#FFFFFF', 0.16),
      red: '#FF6B6B',
      orange: '#FF9F43',
      activeBackground: mix(clamped, '#000000', 0.65),
      overlayWin: 'rgba(34, 139, 34, 0.85)',
      overlayLose: 'rgba(180, 40, 40, 0.85)',
      overlaySkip: 'rgba(180, 150, 30, 0.85)',
      overlayButton: 'rgba(255, 255, 255, 0.25)',
      overlayText: '#FFFFFF',
      modalOverlay: 'rgba(0, 0, 0, 0.7)',
    };
  }

  return {
    mode: 'light',
    background: mix(bgHex, '#FFFFFF', 0.3),
    card: mix(bgHex, '#000000', 0.03),
    accent: clamped,
    textPrimary: mix(bgHex, '#000000', 0.88),
    textSecondary: mix(bgHex, '#000000', 0.62),
    textTertiary: mix(bgHex, '#000000', 0.40),
    border: mix(bgHex, '#000000', 0.08),
    red: '#D32F2F',
    orange: '#E67E22',
    activeBackground: mix(clamped, '#FFFFFF', 0.68),
    overlayWin: 'rgba(34, 139, 34, 0.85)',
    overlayLose: 'rgba(180, 40, 40, 0.85)',
    overlaySkip: 'rgba(180, 150, 30, 0.85)',
    overlayButton: 'rgba(255, 255, 255, 0.25)',
    overlayText: '#FFFFFF',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
  };
}

export function generateCustomTheme(accentHex: string): ThemeColors {
  return generateCustomThemeDual(accentHex, accentHex);
}

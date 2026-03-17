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

const ember: ThemeColors = {
  mode: 'dark',
  background: '#1A1008',
  card: '#2C1E10',
  accent: '#E8913A',
  textPrimary: '#F5EBE0',
  textSecondary: '#C4A882',
  textTertiary: '#7A6650',
  border: '#3D2E1E',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#3A2510',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

const neon: ThemeColors = {
  mode: 'dark',
  background: '#0A0A14',
  card: '#141420',
  accent: '#00E5CC',
  textPrimary: '#E0E8F0',
  textSecondary: '#8899AA',
  textTertiary: '#556677',
  border: '#1E1E30',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#0A2A28',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

const voidTheme: ThemeColors = {
  mode: 'dark',
  background: '#000000',
  card: '#121212',
  accent: '#FF3B7A',
  textPrimary: '#E8E8E8',
  textSecondary: '#999999',
  textTertiary: '#666666',
  border: '#1E1E1E',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#1A0A12',
  overlayWin: 'rgba(34, 139, 34, 0.85)',
  overlayLose: 'rgba(180, 40, 40, 0.85)',
  overlaySkip: 'rgba(180, 150, 30, 0.85)',
  overlayButton: 'rgba(255, 255, 255, 0.25)',
  overlayText: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

const frost: ThemeColors = {
  mode: 'light',
  background: '#F5F7FA',
  card: '#FFFFFF',
  accent: '#2563EB',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
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

const sand: ThemeColors = {
  mode: 'light',
  background: '#F5F0E6',
  card: '#FFFBF4',
  accent: '#A8521E',
  textPrimary: '#2D2015',
  textSecondary: '#6B5C4D',
  textTertiary: '#9E9088',
  border: '#E0D6C6',
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

export const themes = {
  midnight,
  ember,
  neon,
  void: voidTheme,
  frost,
  sand,
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

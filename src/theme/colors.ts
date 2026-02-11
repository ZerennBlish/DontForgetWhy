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
}

const midnight: ThemeColors = {
  mode: 'dark',
  background: '#121220',
  card: '#1E1E2E',
  accent: '#4A90D9',
  textPrimary: '#EAEAFF',
  textSecondary: '#B0B0CC',
  textTertiary: '#7A7A9E',
  border: '#2A2A3E',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#1A2A44',
};

const obsidian: ThemeColors = {
  mode: 'dark',
  background: '#1A1A1E',
  card: '#28282E',
  accent: '#A0A0B0',
  textPrimary: '#E5E5EA',
  textSecondary: '#AEAEB4',
  textTertiary: '#6C6C72',
  border: '#3A3A40',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#36363C',
};

const forest: ThemeColors = {
  mode: 'dark',
  background: '#0E1A12',
  card: '#1A2C1F',
  accent: '#4CAF50',
  textPrimary: '#E0F0E2',
  textSecondary: '#A5C8A8',
  textTertiary: '#6B8F6E',
  border: '#2A3E2D',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#1C3A22',
};

const royal: ThemeColors = {
  mode: 'dark',
  background: '#14101E',
  card: '#211A30',
  accent: '#9C6ADE',
  textPrimary: '#EDE0FF',
  textSecondary: '#B8A3D4',
  textTertiary: '#7A6B94',
  border: '#322642',
  red: '#FF6B6B',
  orange: '#FF9F43',
  activeBackground: '#2C1C42',
};

const bubblegum: ThemeColors = {
  mode: 'light',
  background: '#FFF0F5',
  card: '#FFE0EB',
  accent: '#E0389A',
  textPrimary: '#2A0A18',
  textSecondary: '#6B3050',
  textTertiary: '#9E708A',
  border: '#F0C0D5',
  red: '#D32F2F',
  orange: '#E67E22',
  activeBackground: '#FFD0E0',
};

const sunshine: ThemeColors = {
  mode: 'light',
  background: '#FFFDE7',
  card: '#FFF8C4',
  accent: '#E6A817',
  textPrimary: '#1A1400',
  textSecondary: '#6B5A20',
  textTertiary: '#998755',
  border: '#EFE0A0',
  red: '#D32F2F',
  orange: '#E67E22',
  activeBackground: '#FFEEAA',
};

const ocean: ThemeColors = {
  mode: 'light',
  background: '#F0F7FF',
  card: '#E0EEFF',
  accent: '#0077CC',
  textPrimary: '#0A1520',
  textSecondary: '#3A5570',
  textTertiary: '#6A8090',
  border: '#B8D4F0',
  red: '#D32F2F',
  orange: '#E67E22',
  activeBackground: '#CCE2FF',
};

const mint: ThemeColors = {
  mode: 'light',
  background: '#F0FFF4',
  card: '#E0F5E8',
  accent: '#10B981',
  textPrimary: '#0A1A10',
  textSecondary: '#305040',
  textTertiary: '#608070',
  border: '#B8E0C8',
  red: '#D32F2F',
  orange: '#E67E22',
  activeBackground: '#C4ECD0',
};

export const themes = {
  midnight,
  obsidian,
  forest,
  royal,
  bubblegum,
  sunshine,
  ocean,
  mint,
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

export function generateCustomTheme(accentHex: string): ThemeColors {
  const clamped = clampAccent(accentHex);
  const lum = luminance(clamped);
  const isDark = lum < 0.5;

  if (isDark) {
    return {
      mode: 'dark',
      background: mix(clamped, '#000000', 0.85),
      card: mix(clamped, '#000000', 0.72),
      accent: clamped,
      textPrimary: mix(clamped, '#FFFFFF', 0.88),
      textSecondary: mix(clamped, '#FFFFFF', 0.60),
      textTertiary: mix(clamped, '#FFFFFF', 0.35),
      border: mix(clamped, '#000000', 0.60),
      red: '#FF6B6B',
      orange: '#FF9F43',
      activeBackground: mix(clamped, '#000000', 0.65),
    };
  }

  return {
    mode: 'light',
    background: mix(clamped, '#FFFFFF', 0.90),
    card: mix(clamped, '#FFFFFF', 0.78),
    accent: clamped,
    textPrimary: mix(clamped, '#000000', 0.88),
    textSecondary: mix(clamped, '#000000', 0.62),
    textTertiary: mix(clamped, '#000000', 0.40),
    border: mix(clamped, '#FFFFFF', 0.60),
    red: '#D32F2F',
    orange: '#E67E22',
    activeBackground: mix(clamped, '#FFFFFF', 0.68),
  };
}

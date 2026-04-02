import { StyleSheet } from 'react-native';
import type { ThemeColors } from './colors';

export function getButtonStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Solid accent background — Save, Done, Set, Apply
    primary: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Transparent + accent border — Cancel, Keep Drawing, alternate actions
    secondary: {
      backgroundColor: 'transparent',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    secondaryText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
    },

    // Transparent + red border — Clear, Forever, Discard
    destructive: {
      backgroundColor: 'transparent',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.red,
    },
    destructiveText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.red,
    },

    // No background, no border — Restore, low-emphasis
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
    },

    // Small variant — for inline/card contexts where full-size buttons are too big
    primarySmall: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primarySmallText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    secondarySmall: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    secondarySmallText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },

    destructiveSmall: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.red,
    },
    destructiveSmallText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.red,
    },

    ghostSmall: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostSmallText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}

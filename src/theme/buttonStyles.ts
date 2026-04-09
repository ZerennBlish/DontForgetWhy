import { StyleSheet } from 'react-native';
import type { ThemeColors } from './colors';
import { FONTS } from './fonts';

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
      fontSize: 15,
      fontFamily: FONTS.bold,
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
      fontSize: 15,
      fontFamily: FONTS.semiBold,
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
      fontSize: 15,
      fontFamily: FONTS.semiBold,
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
      fontSize: 15,
      fontFamily: FONTS.semiBold,
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
      fontSize: 12,
      fontFamily: FONTS.bold,
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
      fontSize: 12,
      fontFamily: FONTS.semiBold,
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
      fontSize: 12,
      fontFamily: FONTS.semiBold,
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
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.accent,
    },
  });
}

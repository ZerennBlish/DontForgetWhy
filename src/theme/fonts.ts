/**
 * Font family constants for the app.
 *
 * Two-tier system:
 * - Games section: Satisfy (app title), LilitaOne (game headers)
 * - Core utility: Montserrat Alternates (everything else)
 */

export const FONTS = {
  // App title only (HomeScreen "Don't Forget Why")
  title: 'Satisfy_400Regular',

  // Game screen headers
  gameHeader: 'LilitaOne_400Regular',

  // Core app — body and UI
  regular: 'MontserratAlternates_400Regular',
  semiBold: 'MontserratAlternates_600SemiBold',
  bold: 'MontserratAlternates_700Bold',
  extraBold: 'MontserratAlternates_800ExtraBold',
} as const;

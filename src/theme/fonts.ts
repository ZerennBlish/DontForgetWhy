/**
 * Font family constants for the app.
 *
 * Two-tier system:
 * - Games section: Satisfy (app title), LilitaOne (game headers)
 * - Core utility: Nunito (everything else)
 */

export const FONTS = {
  // App title only (HomeScreen "Don't Forget Why")
  title: 'Satisfy_400Regular',

  // Game screen headers
  gameHeader: 'LilitaOne_400Regular',

  // Core app — body and UI
  regular: 'Nunito_400Regular',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
} as const;

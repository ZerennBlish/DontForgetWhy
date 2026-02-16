import { Platform, Linking } from 'react-native';

/**
 * Check if the app can use full-screen intents.
 *
 * On Android < 34 (pre-Android 14), USE_FULL_SCREEN_INTENT is auto-granted.
 * On Android 34+, it became a special permission that the user may need to
 * enable manually. Without a custom native module we cannot call
 * NotificationManager.canUseFullScreenIntent(), so we conservatively return
 * false on API 34+ to prompt the user to verify the setting.
 */
export async function canUseFullScreenIntent(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if ((Platform.Version as number) < 34) return true;
  // On API 34+ we cannot verify without a native module — assume needs setup
  return false;
}

/**
 * Open the system settings page where the user can grant full-screen
 * notification permission for this app.
 *
 * Tries the dedicated Android 14+ intent first, then falls back to the
 * app's own settings page.
 */
export async function openFullScreenIntentSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Linking.sendIntent('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT');
  } catch {
    try {
      await Linking.openSettings();
    } catch {}
  }
}

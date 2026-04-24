const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Custom Expo config plugin for @notifee/react-native.
 *
 * Notifee does not ship its own Expo config plugin, so this adds
 * the required Android permissions and full-screen intent activity
 * attributes. Native module linking is handled by Expo autolinking
 * via notifee's react-native.config.js.
 */

const NOTIFEE_PERMISSIONS = [
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.VIBRATE",
  "android.permission.WAKE_LOCK",
];

function addPermissionIfMissing(manifest, permission) {
  if (!manifest["uses-permission"]) {
    manifest["uses-permission"] = [];
  }

  const exists = manifest["uses-permission"].some(
    (entry) => entry.$?.["android:name"] === permission
  );

  if (!exists) {
    manifest["uses-permission"].push({
      $: { "android:name": permission },
    });
  }
}

/**
 * Adds notifee-required permissions and full-screen intent support
 * to the AndroidManifest.xml.
 */
function withNotifeeManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    // Add each required permission
    for (const perm of NOTIFEE_PERMISSIONS) {
      addPermissionIfMissing(manifest, perm);
    }

    // Add fullScreenIntent activity attributes to MainActivity
    // so notifications can launch the app over the lock screen.
    const application = manifest.application?.[0];
    if (application?.activity) {
      const mainActivity = application.activity.find(
        (activity) => activity.$["android:name"] === ".MainActivity"
      );
      if (mainActivity) {
        mainActivity.$["android:showWhenLocked"] = "true";
        mainActivity.$["android:turnScreenOn"] = "true";
      }
    }

    return modConfig;
  });
}

function withNotifee(config) {
  config = withNotifeeManifest(config);
  return config;
}

module.exports = withNotifee;

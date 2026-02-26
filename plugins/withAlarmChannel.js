const {
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin that creates alarm notification channels natively
 * with AudioAttributes.USAGE_ALARM so sound plays regardless of ringer mode.
 *
 * Notifee v9.x does not support audioAttributes on channels in its JS API,
 * so we bypass it entirely for channel creation. Since Android channels are
 * immutable after first creation, our native channels (created first in
 * Application.onCreate) take precedence over any later notifee createChannel
 * calls with the same IDs.
 *
 * Also registers an AlarmChannelModule so JS can create dynamic custom-sound
 * channels with USAGE_ALARM at runtime.
 */

const APP_PACKAGE = "com.zerennblish.DontForgetWhy";
const JAVA_DIR = `android/app/src/main/java/${APP_PACKAGE.replace(/\./g, "/")}`;

// ── Java source files ──────────────────────────────────────────

const HELPER_JAVA = `package ${APP_PACKAGE};

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

/**
 * Creates alarm notification channels and plays alarm sounds via MediaPlayer
 * through AudioAttributes.USAGE_ALARM so sound plays regardless of ringer mode.
 */
public class AlarmChannelHelper {

    private static final AudioAttributes ALARM_AUDIO = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build();

    private static MediaPlayer sPlayer;

    // ── MediaPlayer sound playback ──────────────────────────────────

    public static void playSound(Context context, String soundUri) {
        stopSound();
        Uri uri;
        if (soundUri != null && !soundUri.isEmpty()) {
            uri = Uri.parse(soundUri);
        } else {
            int rawId = context.getResources().getIdentifier(
                    "alarm", "raw", context.getPackageName());
            uri = rawId != 0
                    ? Uri.parse("android.resource://" + context.getPackageName() + "/raw/alarm")
                    : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        }
        try {
            sPlayer = new MediaPlayer();
            sPlayer.setAudioAttributes(ALARM_AUDIO);
            sPlayer.setDataSource(context, uri);
            sPlayer.setLooping(true);
            sPlayer.prepare();
            sPlayer.start();
        } catch (Exception e) {
            if (sPlayer != null) {
                try { sPlayer.release(); } catch (Exception ignored) {}
                sPlayer = null;
            }
            throw new RuntimeException("Failed to play alarm sound: " + e.getMessage(), e);
        }
    }

    public static void stopSound() {
        if (sPlayer != null) {
            try { sPlayer.stop(); } catch (Exception ignored) {}
            try { sPlayer.release(); } catch (Exception ignored) {}
            sPlayer = null;
        }
    }

    // ── Notification channels ───────────────────────────────────────

    public static void createPresetChannels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;

        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Delete ALL old channels so existing installs migrate to new silent ones.
        // Sound is now played via MediaPlayer, not notification channels.
        String[] oldChannels = {
            "alarms", "alarms_v2", "alarms_v3", "alarms_v4",
            "alarms_gentle", "alarms_gentle_v2", "alarms_gentle_v3",
            "alarms_urgent", "alarms_urgent_v2", "alarms_urgent_v3",
            "alarms_classic", "alarms_classic_v2", "alarms_classic_v3",
            "alarms_digital", "alarms_digital_v2", "alarms_digital_v3",
            "alarms_silent", "alarms_silent_v2", "alarms_silent_v3"
        };
        for (String id : oldChannels) {
            nm.deleteNotificationChannel(id);
        }

        // All channels are silent (null sound) — MediaPlayer handles audio.
        // Channels provide: full-screen intent, vibration, lights, DND bypass.

        // Default
        createChannel(nm, "alarms_v5", "Alarms",
                NotificationManager.IMPORTANCE_HIGH,
                new long[]{300, 300}, 0xFFFF0000);

        // Gentle
        createChannel(nm, "alarms_gentle_v4", "Alarms (Gentle)",
                NotificationManager.IMPORTANCE_DEFAULT,
                new long[]{100, 200}, 0xFFFFD700);

        // Urgent
        createChannel(nm, "alarms_urgent_v4", "Alarms (Urgent)",
                NotificationManager.IMPORTANCE_HIGH,
                new long[]{250, 250, 250, 250, 250, 250}, 0xFFFF0000);

        // Classic
        createChannel(nm, "alarms_classic_v4", "Alarms (Classic)",
                NotificationManager.IMPORTANCE_HIGH,
                new long[]{300, 300, 300, 300}, 0xFFFF6600);

        // Digital
        createChannel(nm, "alarms_digital_v4", "Alarms (Digital)",
                NotificationManager.IMPORTANCE_HIGH,
                new long[]{100, 100, 100, 100}, 0xFF00FF00);

        // Silent (vibration only)
        NotificationChannel silent = new NotificationChannel(
                "alarms_silent_v4", "Alarms (Silent)",
                NotificationManager.IMPORTANCE_LOW);
        silent.setSound(null, ALARM_AUDIO);
        silent.enableVibration(true);
        silent.setVibrationPattern(new long[]{500, 500});
        silent.enableLights(true);
        silent.setLightColor(0xFF808080);
        silent.setBypassDnd(true);
        nm.createNotificationChannel(silent);
    }

    /**
     * Creates a custom sound channel (silent — MediaPlayer handles audio).
     * Called from JS via AlarmChannelModule for dynamic alarm/timer sounds.
     */
    public static void createCustomSoundChannel(Context context, String channelId,
            String name, String soundUri) {
        if (Build.VERSION.SDK_INT < 26) return;

        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel ch = new NotificationChannel(
                channelId, name, NotificationManager.IMPORTANCE_HIGH);
        ch.setSound(null, ALARM_AUDIO);
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{300, 300, 300, 300});
        ch.setBypassDnd(true);
        nm.createNotificationChannel(ch);
    }

    private static void createChannel(NotificationManager nm, String id,
            String name, int importance,
            long[] vibration, int lightColor) {
        NotificationChannel ch = new NotificationChannel(id, name, importance);
        ch.setSound(null, ALARM_AUDIO);
        ch.enableVibration(true);
        ch.setVibrationPattern(vibration);
        ch.enableLights(true);
        ch.setLightColor(lightColor);
        ch.setBypassDnd(true);
        nm.createNotificationChannel(ch);
    }
}
`;

const MODULE_JAVA = `package ${APP_PACKAGE};

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * Exposes alarm sound playback (MediaPlayer) and channel creation to JS.
 * MediaPlayer uses AudioAttributes.USAGE_ALARM so sound plays regardless
 * of ringer mode (silent/vibrate).
 */
public class AlarmChannelModule extends ReactContextBaseJavaModule {

    AlarmChannelModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "AlarmChannelModule";
    }

    @ReactMethod
    public void createSoundChannel(String channelId, String name,
            String soundUri, Promise promise) {
        try {
            AlarmChannelHelper.createCustomSoundChannel(
                    getReactApplicationContext(), channelId, name, soundUri);
            promise.resolve(channelId);
        } catch (Exception e) {
            promise.reject("CHANNEL_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void playAlarmSound(String soundUri, Promise promise) {
        try {
            AlarmChannelHelper.playSound(getReactApplicationContext(), soundUri);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("PLAY_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void stopAlarmSound(Promise promise) {
        try {
            AlarmChannelHelper.stopSound();
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e.getMessage(), e);
        }
    }
}
`;

const PACKAGE_JAVA = `package ${APP_PACKAGE};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AlarmChannelPackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(
            ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new AlarmChannelModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(
            ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

// ── Config plugin mods ─────────────────────────────────────────

/**
 * Writes the three Java source files into the generated android project.
 */
function withAlarmChannelFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const javaDir = path.join(modConfig.modRequest.projectRoot, JAVA_DIR);
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(
        path.join(javaDir, "AlarmChannelHelper.java"),
        HELPER_JAVA
      );
      fs.writeFileSync(
        path.join(javaDir, "AlarmChannelModule.java"),
        MODULE_JAVA
      );
      fs.writeFileSync(
        path.join(javaDir, "AlarmChannelPackage.java"),
        PACKAGE_JAVA
      );
      return modConfig;
    },
  ]);
}

/**
 * Injects AlarmChannelHelper.createPresetChannels(this) into
 * MainApplication.onCreate() and registers AlarmChannelPackage
 * in getPackages().
 */
function withAlarmChannelMainApp(config) {
  return withMainApplication(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    const isKotlin = modConfig.modResults.language === "kt";

    // Idempotency: skip if already injected
    if (contents.includes("AlarmChannelHelper")) {
      return modConfig;
    }

    // ── Inject into onCreate ──
    const superPattern = isKotlin
      ? /super\.onCreate\(\)/
      : /super\.onCreate\(\);/;
    const superMatch = superPattern.exec(contents);
    if (superMatch) {
      const lineEnd = contents.indexOf("\n", superMatch.index);
      const inject = isKotlin
        ? "\n    AlarmChannelHelper.createPresetChannels(this)"
        : "\n    AlarmChannelHelper.createPresetChannels(this);";
      contents =
        contents.slice(0, lineEnd) + inject + contents.slice(lineEnd);
    } else {
      console.warn(
        "[withAlarmChannel] Could not find super.onCreate() in MainApplication"
      );
    }

    // ── Register AlarmChannelPackage in getPackages ──
    if (isKotlin) {
      // Kotlin pattern: PackageList(this).packages.apply {
      const applyIdx = contents.indexOf(".apply {");
      if (applyIdx !== -1) {
        const lineEnd = contents.indexOf("\n", applyIdx);
        contents =
          contents.slice(0, lineEnd) +
          "\n          add(AlarmChannelPackage())" +
          contents.slice(lineEnd);
      } else {
        console.warn(
          "[withAlarmChannel] Could not find .apply { in MainApplication getPackages"
        );
      }
    } else {
      // Java pattern: return packages;
      const returnIdx = contents.lastIndexOf("return packages");
      if (returnIdx !== -1) {
        contents =
          contents.slice(0, returnIdx) +
          "packages.add(new AlarmChannelPackage());\n        " +
          contents.slice(returnIdx);
      } else {
        console.warn(
          "[withAlarmChannel] Could not find 'return packages' in MainApplication"
        );
      }
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

// ── Main export ──────────────────────────────────────────────

function withAlarmChannel(config) {
  config = withAlarmChannelFiles(config);
  config = withAlarmChannelMainApp(config);
  return config;
}

module.exports = withAlarmChannel;

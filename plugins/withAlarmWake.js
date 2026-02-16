const { withAndroidManifest, withMainActivity } = require("@expo/config-plugins");

/**
 * Expo config plugin for full-screen alarm wake support.
 *
 * A) Adds DISABLE_KEYGUARD permission and showWhenLocked/turnScreenOn
 *    activity attributes to AndroidManifest.xml.
 * B) Injects onCreate code into MainActivity to set window flags for
 *    showing over the lock screen and keeping the screen on.
 */

// ─── Manifest ────────────────────────────────────────────────

const ALARM_WAKE_PERMISSIONS = [
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.WAKE_LOCK",
  "android.permission.DISABLE_KEYGUARD",
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

function withAlarmWakeManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    for (const perm of ALARM_WAKE_PERMISSIONS) {
      addPermissionIfMissing(manifest, perm);
    }

    // Add showWhenLocked + turnScreenOn to MainActivity
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

// ─── MainActivity ────────────────────────────────────────────

const KOTLIN_IMPORTS = [
  "android.os.Build",
  "android.os.Bundle",
  "android.view.WindowManager",
  "android.app.KeyguardManager",
];

const JAVA_IMPORTS = [
  "android.os.Build",
  "android.os.Bundle",
  "android.view.WindowManager",
  "android.app.KeyguardManager",
];

const KOTLIN_ON_CREATE = `
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Wake flags: show activity over lock screen and turn screen on
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    // Dismiss swipe/pattern lock screen so alarm UI is immediately usable
    if (Build.VERSION.SDK_INT >= 26) {
      val keyguardManager = getSystemService(KEYGUARD_SERVICE) as? KeyguardManager
      keyguardManager?.requestDismissKeyguard(this, null)
    }
  }`;

const JAVA_ON_CREATE = `
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Wake flags: show activity over lock screen and turn screen on
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    }
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    // Dismiss swipe/pattern lock screen so alarm UI is immediately usable
    if (Build.VERSION.SDK_INT >= 26) {
      KeyguardManager keyguardManager = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
      if (keyguardManager != null) {
        keyguardManager.requestDismissKeyguard(this, null);
      }
    }
  }`;

const KOTLIN_ON_CREATE_INJECT = `
    // Wake flags: show activity over lock screen and turn screen on
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    // Dismiss swipe/pattern lock screen so alarm UI is immediately usable
    if (Build.VERSION.SDK_INT >= 26) {
      val keyguardManager = getSystemService(KEYGUARD_SERVICE) as? KeyguardManager
      keyguardManager?.requestDismissKeyguard(this, null)
    }`;

const JAVA_ON_CREATE_INJECT = `
    // Wake flags: show activity over lock screen and turn screen on
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    }
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    // Dismiss swipe/pattern lock screen so alarm UI is immediately usable
    if (Build.VERSION.SDK_INT >= 26) {
      KeyguardManager keyguardManager = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
      if (keyguardManager != null) {
        keyguardManager.requestDismissKeyguard(this, null);
      }
    }`;

/**
 * Adds import statements after the last existing import line.
 */
function addImports(contents, imports, isKotlin) {
  const newImports = imports.filter((imp) => {
    const line = isKotlin ? `import ${imp}` : `import ${imp};`;
    return !contents.includes(line);
  });

  if (newImports.length === 0) return contents;

  const importBlock = newImports
    .map((imp) => (isKotlin ? `import ${imp}` : `import ${imp};`))
    .join("\n");

  const lastImportIdx = contents.lastIndexOf("\nimport ");
  if (lastImportIdx !== -1) {
    const lineEnd = contents.indexOf("\n", lastImportIdx + 1);
    contents =
      contents.slice(0, lineEnd + 1) +
      importBlock +
      "\n" +
      contents.slice(lineEnd + 1);
  }

  return contents;
}

function withAlarmWakeMainActivity(config) {
  return withMainActivity(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    const isKotlin = modConfig.modResults.language === "kt";

    // Add imports
    const imports = isKotlin ? KOTLIN_IMPORTS : JAVA_IMPORTS;
    contents = addImports(contents, imports, isKotlin);

    // Idempotency: skip if already injected
    if (contents.includes("setShowWhenLocked")) {
      modConfig.modResults.contents = contents;
      return modConfig;
    }

    const hasOnCreate = isKotlin
      ? contents.includes("override fun onCreate")
      : contents.includes("void onCreate");

    if (hasOnCreate) {
      // Inject after super.onCreate line
      const superCall = isKotlin
        ? "super.onCreate(savedInstanceState)"
        : "super.onCreate(savedInstanceState);";
      const superIdx = contents.indexOf(superCall);
      if (superIdx !== -1) {
        const lineEnd = contents.indexOf("\n", superIdx);
        const inject = isKotlin
          ? KOTLIN_ON_CREATE_INJECT
          : JAVA_ON_CREATE_INJECT;
        contents =
          contents.slice(0, lineEnd + 1) +
          inject +
          "\n" +
          contents.slice(lineEnd + 1);
      }
    } else {
      // Insert full onCreate before the last closing brace of the class
      const onCreateBlock = isKotlin ? KOTLIN_ON_CREATE : JAVA_ON_CREATE;
      const lastBrace = contents.lastIndexOf("}");
      if (lastBrace !== -1) {
        contents =
          contents.slice(0, lastBrace) +
          "\n" +
          onCreateBlock +
          "\n" +
          contents.slice(lastBrace);
      }
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

// ─── Main export ─────────────────────────────────────────────

function withAlarmWake(config) {
  config = withAlarmWakeManifest(config);
  config = withAlarmWakeMainActivity(config);
  return config;
}

module.exports = withAlarmWake;

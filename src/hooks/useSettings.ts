import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Platform,
  Linking,
  ToastAndroid,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { kvGet, kvSet } from '../services/database';
import { useFocusEffect } from '@react-navigation/native';
import notifee from '@notifee/react-native';
import { loadSettings, saveSettings, getSilenceAll, setSilenceAll, getSilenceExpiry } from '../services/settings';
import { getVoiceEnabled, setVoiceEnabled } from '../services/voicePlayback';
import { hapticLight, hapticMedium, refreshHapticsSetting } from '../utils/haptics';
import { refreshGameSoundsSetting } from '../utils/gameSounds';
import { saveBackground, loadBackground, clearBackground, getOverlayOpacity, setOverlayOpacity } from '../services/backgroundStorage';
import {
  shareBackup, importBackup, getLastBackupDate,
  getAutoBackupSettings, setAutoBackupEnabled as saveAutoEnabled,
  setAutoBackupFrequency as saveAutoFrequency,
  clearAutoBackupSettings, autoExportBackup,
  requestBackupFolder, saveBackupFolder,
  type BackupFrequency,
} from '../services/backupRestore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type SettingsNavigation = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export function useSettings(navigation: SettingsNavigation) {
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [timeInputMode, setTimeInputMode] = useState<'scroll' | 'type'>('scroll');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [gameSoundsEnabled, setGameSoundsEnabled] = useState(true);
  const [voiceRoasts, setVoiceRoastsState] = useState(true);
  const [hasPermissionIssues, setHasPermissionIssues] = useState(false);
  const [silenceAll, setSilenceAllState] = useState(false);
  const [silenceRemaining, setSilenceRemaining] = useState<string | null>(null);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [silencePickerVisible, setSilencePickerVisible] = useState(false);
  const [pickerHours, setPickerHours] = useState(1);
  const [pickerMinutes, setPickerMinutes] = useState(0);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequencyState] = useState<BackupFrequency>('weekly');
  const [autoBackupFolderName, setAutoBackupFolderName] = useState<string | null>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      setTimeFormat(s.timeFormat);
      setTimeInputMode(s.timeInputMode);
    });
    // Load haptics setting
    try {
      const raw = kvGet('hapticsEnabled');
      if (raw !== null) {
        setHapticsEnabled(raw !== 'false');
      }
    } catch {}
    // Load game sounds setting
    try {
      const raw = kvGet('gameSoundsEnabled');
      if (raw !== null) {
        setGameSoundsEnabled(raw !== 'false');
      }
    } catch {}
    getVoiceEnabled().then(setVoiceRoastsState).catch(() => {});
  }, []);

  useEffect(() => {
    setLastBackup(getLastBackupDate());
    const autoSettings = getAutoBackupSettings();
    setAutoBackupEnabledState(autoSettings.enabled);
    setAutoBackupFrequencyState(autoSettings.frequency);
    setAutoBackupFolderName(autoSettings.folderName);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBackground().then(setBgUri);
      getOverlayOpacity().then(setBgOpacity);
    }, []),
  );

  // Permission health check
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        const apiLevel = Platform.Version as number;
        let issues = false;

        let batteryOptEnabled = false;
        try {
          batteryOptEnabled = await notifee.isBatteryOptimizationEnabled();
        } catch {
          // Can't determine — don't flag
        }
        if (batteryOptEnabled) issues = true;

        const fsiCheckable = apiLevel < 34;
        const fsiGranted = fsiCheckable ? true : null;

        console.log('[PERMISSIONS] API level:', apiLevel);
        console.log('[PERMISSIONS] Battery optimization enabled:', batteryOptEnabled);
        console.log('[PERMISSIONS] Full screen intent granted:', fsiGranted === null ? 'indeterminate (API 34+, skipped)' : fsiGranted);

        setHasPermissionIssues(issues);
      } catch {
        // If checks fail entirely, don't show the banner
      }
    })();
  }, []);

  // --- Silence All: load state + countdown timer ---
  const refreshSilenceStatus = useCallback(async () => {
    const on = await getSilenceAll();
    setSilenceAllState(on);
    if (on) {
      const mins = await getSilenceExpiry();
      if (mins !== null) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        setSilenceRemaining(h > 0 ? `Sound resumes in ${h}h ${m}m` : `Sound resumes in ${m}m`);
      } else {
        setSilenceRemaining(null);
      }
    } else {
      setSilenceRemaining(null);
    }
  }, []);

  useEffect(() => {
    refreshSilenceStatus();
  }, [refreshSilenceStatus]);

  useEffect(() => {
    if (silenceAll) {
      silenceIntervalRef.current = setInterval(refreshSilenceStatus, 60000);
    }
    return () => {
      if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current);
        silenceIntervalRef.current = null;
      }
    };
  }, [silenceAll, refreshSilenceStatus]);

  const handleSilenceToggle = async (value: boolean) => {
    if (value) {
      hapticMedium();
      setPickerHours(1);
      setPickerMinutes(0);
      setSilencePickerVisible(true);
    } else {
      hapticLight();
      await setSilenceAll(false);
      setSilenceAllState(false);
      setSilenceRemaining(null);
    }
  };

  const handleSilencePickerCancel = () => {
    hapticLight();
    setSilencePickerVisible(false);
  };

  const handleSilencePickerSet = async () => {
    hapticMedium();
    const totalMinutes = pickerHours * 60 + pickerMinutes;
    if (totalMinutes === 0) {
      ToastAndroid.show('Pick a time first', ToastAndroid.SHORT);
      return;
    }
    setSilencePickerVisible(false);
    await applySilence(totalMinutes);
  };

  const handleSilencePickerIndefinite = async () => {
    hapticMedium();
    setSilencePickerVisible(false);
    await applySilence(null);
  };

  const applySilence = async (minutes: number | null) => {
    await setSilenceAll(true, minutes);
    await refreshSilenceStatus();
  };

  const handleTimeFormatToggle = async (value: boolean) => {
    hapticLight();
    const newFormat = value ? '24h' : '12h';
    setTimeFormat(newFormat);
    await saveSettings({ timeFormat: newFormat });
  };

  const handleTimeInputModeChange = async (mode: 'scroll' | 'type') => {
    hapticLight();
    setTimeInputMode(mode);
    await saveSettings({ timeInputMode: mode });
  };

  const handleHapticsToggle = async (value: boolean) => {
    setHapticsEnabled(value);
    try {
      kvSet('hapticsEnabled', value ? 'true' : 'false');
    } catch {}
    await refreshHapticsSetting();
    if (value) hapticLight();
  };

  const handleGameSoundsToggle = async (value: boolean) => {
    hapticLight();
    setGameSoundsEnabled(value);
    try {
      kvSet('gameSoundsEnabled', value ? 'true' : 'false');
    } catch {}
    await refreshGameSoundsSetting();
  };

  const handleVoiceToggle = async (val: boolean) => {
    hapticLight();
    setVoiceRoastsState(val);
    await setVoiceEnabled(val);
  };

  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
  const showNudge = lastBackup !== null && daysSinceBackup >= 30;

  const handleExport = async () => {
    hapticMedium();
    setIsExporting(true);
    try {
      await shareBackup();
      setLastBackup(new Date().toISOString());
      ToastAndroid.show('Memories exported', ToastAndroid.SHORT);
    } catch (e) {
      ToastAndroid.show(e instanceof Error ? e.message : 'Export failed', ToastAndroid.SHORT);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    hapticLight();
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const file = result.assets[0];
    if (!file.name.endsWith('.dfw')) {
      Alert.alert(
        'Not a backup file',
        "That's not a backup file. Please select a .dfw file exported from Don't Forget Why.",
      );
      return;
    }

    Alert.alert(
      'Replace everything?',
      'This will replace all your current data \u2014 alarms, reminders, notes, voice memos, photos, everything. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your current memories will be permanently deleted and replaced with the backup.',
              [
                { text: 'Go Back', style: 'cancel' },
                {
                  text: 'Replace Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setIsImporting(true);
                    try {
                      await importBackup(file.uri);
                      ToastAndroid.show('Memories restored', ToastAndroid.SHORT);
                      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                    } catch (e) {
                      Alert.alert('Import Failed', e instanceof Error ? e.message : 'Something went wrong during import.');
                      setIsImporting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleAutoBackupToggle = async (value: boolean) => {
    hapticLight();
    if (value) {
      try {
        const folder = await requestBackupFolder();
        if (!folder) return; // user cancelled — toggle stays off
        saveBackupFolder(folder.uri, folder.name);
        saveAutoEnabled(true);
        setAutoBackupEnabledState(true);
        setAutoBackupFolderName(folder.name);
        Alert.alert(
          'Back up now?',
          'Want to create your first automatic backup right now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Back Up Now',
              onPress: async () => {
                try {
                  const success = await autoExportBackup();
                  if (success) {
                    ToastAndroid.show('Memories backed up', ToastAndroid.SHORT);
                  }
                } catch { /* silent */ }
              },
            },
          ],
        );
      } catch {
        ToastAndroid.show('Could not open folder picker', ToastAndroid.SHORT);
      }
    } else {
      clearAutoBackupSettings();
      setAutoBackupEnabledState(false);
      setAutoBackupFolderName(null);
    }
  };

  const handleChangeFolder = async () => {
    hapticLight();
    try {
      const folder = await requestBackupFolder();
      if (!folder) return;
      saveBackupFolder(folder.uri, folder.name);
      setAutoBackupFolderName(folder.name);
      ToastAndroid.show('Backup folder updated', ToastAndroid.SHORT);
    } catch {
      ToastAndroid.show('Could not open folder picker', ToastAndroid.SHORT);
    }
  };

  const handleFrequencyChange = (freq: BackupFrequency) => {
    hapticLight();
    saveAutoFrequency(freq);
    setAutoBackupFrequencyState(freq);
  };

  const handlePickBackground = async () => {
    hapticLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = await saveBackground(result.assets[0].uri);
      if (uri) {
        setBgUri(uri);
        ToastAndroid.show('Background set!', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show('Failed to set background', ToastAndroid.SHORT);
      }
    }
  };

  const handleClearBackground = () => {
    hapticLight();
    Alert.alert('Clear Background?', 'Remove the photo background?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        await clearBackground();
        setBgUri(null);
        ToastAndroid.show('Background cleared', ToastAndroid.SHORT);
      }},
    ]);
  };

  const handleSetOverlayOpacity = async (val: number) => {
    hapticLight();
    setBgOpacity(val);
    await setOverlayOpacity(val);
  };

  const handleSendFeedback = () => {
    hapticLight();
    const version =
      Constants.expoConfig?.version
      || (Constants as Record<string, Record<string, string>>).manifest?.version
      || (Constants as Record<string, Record<string, Record<string, Record<string, string>>>>).manifest2?.extra?.expoClient?.version
      || 'unknown';
    const model = Device.modelName || 'Unknown';
    const osVersion = Device.osVersion || 'Unknown';
    const apiLevel = Device.platformApiLevel ?? 'Unknown';
    const body = encodeURIComponent(`\n\n---\nApp Version: ${version}\nDevice: ${model}\nAndroid Version: ${osVersion}\nAPI Level: ${apiLevel}\n---`);
    const subject = encodeURIComponent("Don't Forget Why \u2014 Feedback");
    Linking.openURL(`mailto:baldguyandcompanygames@gmail.com?subject=${subject}&body=${body}`);
  };

  return {
    // Settings
    timeFormat,
    timeInputMode,
    hapticsEnabled,
    gameSoundsEnabled,
    voiceRoasts,

    // Permissions
    hasPermissionIssues,

    // Silence
    silenceAll,
    silenceRemaining,
    silencePickerVisible,
    setSilencePickerVisible,
    pickerHours,
    setPickerHours,
    pickerMinutes,
    setPickerMinutes,

    // Background
    bgUri,
    bgOpacity,

    // Backup
    lastBackup,
    isExporting,
    isImporting,
    showNudge,
    autoBackupEnabled,
    autoBackupFrequency,
    autoBackupFolderName,

    // Handlers
    handleTimeFormatToggle,
    handleTimeInputModeChange,
    handleHapticsToggle,
    handleGameSoundsToggle,
    handleVoiceToggle,
    handleSilenceToggle,
    handleSilencePickerCancel,
    handleSilencePickerSet,
    handleSilencePickerIndefinite,
    handlePickBackground,
    handleClearBackground,
    handleSetOverlayOpacity,
    handleExport,
    handleImport,
    handleAutoBackupToggle,
    handleChangeFolder,
    handleFrequencyChange,
    handleSendFeedback,
  };
}

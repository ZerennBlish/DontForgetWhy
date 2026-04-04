import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
  Platform,
  ImageBackground,
  ToastAndroid,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { kvGet, kvSet } from '../services/database';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import notifee from '@notifee/react-native';
import { loadSettings, saveSettings, getSilenceAll, setSilenceAll, getSilenceExpiry } from '../services/settings';
import { getVoiceEnabled, setVoiceEnabled } from '../services/voicePlayback';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight, hapticMedium, refreshHapticsSetting } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes, type ThemeName } from '../theme/colors';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import { CameraIcon, ChevronRightIcon, WarningIcon } from '../components/Icons';
import { saveBackground, loadBackground, clearBackground, getOverlayOpacity, setOverlayOpacity } from '../services/backgroundStorage';
import TimePicker from '../components/TimePicker';
import { getButtonStyles } from '../theme/buttonStyles';
import type { RootStackParamList } from '../navigation/types';
import {
  shareBackup, importBackup, getLastBackupDate,
  getAutoBackupSettings, setAutoBackupEnabled as saveAutoEnabled,
  setAutoBackupFrequency as saveAutoFrequency,
  clearAutoBackupSettings, autoExportBackup,
  requestBackupFolder, saveBackupFolder,
  type BackupFrequency,
} from '../services/backupRestore';
import * as DocumentPicker from 'expo-document-picker';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { colors, themeName, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [timeInputMode, setTimeInputMode] = useState<'scroll' | 'type'>('scroll');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
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

  const btn = getButtonStyles(colors);
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      paddingBottom: 40 + insets.bottom,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top + 10,
      paddingHorizontal: 20,
      paddingBottom: 2,
    },
    headerBack: {
      position: 'absolute',
      left: 20,
      top: insets.top + 10,
    },
    headerHome: {
      position: 'absolute',
      left: 64,
      top: insets.top + 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.overlayText,
    },
    permissionBanner: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: 'rgba(255, 107, 107, 0.15)',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    permissionBannerIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    permissionBannerText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.red,
      flex: 1,
    },
    permissionBannerChevron: {
      fontSize: 18,
      color: colors.red,
      marginLeft: 8,
    },
    card: {
      marginHorizontal: 16,
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.card + 'F0',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.accent,
      borderLeftWidth: 3,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
      lineHeight: 20,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'center',
    },
    themeItem: {
      alignItems: 'center',
      width: '28%',
    },
    themeCircleOuter: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
    },
    themeCircleInner: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmark: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.overlayText,
    },
    themeName: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    themeNameActive: {
      fontWeight: '700',
      color: colors.accent,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 20,
    },
    modalBtns: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    setupGuideDesc: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
      lineHeight: 20,
    },
    aboutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    aboutChevron: {
      fontSize: 18,
      color: colors.textTertiary,
    },
  }), [colors, insets.bottom]);

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

  // Permission health check — runs on mount, doesn't block render.
  // Only flags permissions we can DEFINITIVELY confirm are missing.
  // Indeterminate checks (e.g. full-screen intent on API 34+ where
  // we lack a native module to query) are skipped — no false alarms.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        const apiLevel = Platform.Version as number;
        let issues = false;

        // Battery optimization: notifee returns true when optimization
        // IS enabled (bad — Android may kill background alarms).
        // This is a definitive check on all API levels.
        let batteryOptEnabled = false;
        try {
          batteryOptEnabled = await notifee.isBatteryOptimizationEnabled();
        } catch {
          // Can't determine — don't flag
        }
        if (batteryOptEnabled) issues = true;

        // Full-screen intent: on API < 34, USE_FULL_SCREEN_INTENT is
        // auto-granted — no issue possible. On API 34+, we have no
        // native module to call NotificationManager.canUseFullScreenIntent(),
        // so the result is indeterminate — skip it rather than showing
        // a false warning. The Onboarding flow already prompts users to
        // verify this setting manually.
        const fsiCheckable = apiLevel < 34;
        const fsiGranted = fsiCheckable ? true : null; // null = indeterminate

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

  return (
    <ImageBackground source={require('../../assets/gear.png')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
    <View style={styles.header}>
      <View style={styles.headerBack}>
        <BackButton onPress={() => navigation.goBack()} forceDark />
      </View>
      <View style={styles.headerHome}>
        <HomeButton forceDark />
      </View>
      <Text style={styles.title}>Settings</Text>
    </View>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {hasPermissionIssues && (
        <TouchableOpacity
          style={styles.permissionBanner}
          onPress={() => { hapticLight(); navigation.navigate('Onboarding', { startSlide: 2 }); }}
          activeOpacity={0.7}
        >
          <WarningIcon color={colors.orange} size={18} />
          <Text style={styles.permissionBannerText}>Some permissions need attention</Text>
          <ChevronRightIcon color={colors.textTertiary} size={16} />
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>24-Hour Time</Text>
          <Switch
            value={timeFormat === '24h'}
            onValueChange={handleTimeFormatToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={timeFormat === '24h' ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={styles.description}>
          Show times as 14:30 instead of 2:30 PM.
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <View style={styles.row}>
          <Text style={styles.label}>Silence All Alarms</Text>
          <Switch
            value={silenceAll}
            onValueChange={handleSilenceToggle}
            trackColor={{ false: colors.border, true: colors.orange }}
            thumbColor={silenceAll ? '#FFFFFF' : colors.textTertiary}
          />
        </View>
        {silenceAll && (
          <Text style={{ fontSize: 14, color: colors.orange, fontWeight: '600', marginTop: 10 }}>
            {silenceRemaining || 'Silenced until you turn it off'}
          </Text>
        )}
        <Text style={styles.description}>
          Mute all alarm sounds and vibrations. Alarms still fire and show notifications.
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.label}>Time Input Style</Text>
        <View style={{ flexDirection: 'row', backgroundColor: colors.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 12, padding: 2, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: timeInputMode === 'scroll' ? colors.accent : 'transparent' }}
            onPress={() => handleTimeInputModeChange('scroll')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: timeInputMode === 'scroll' ? colors.textPrimary : colors.textTertiary }}>Scroll</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: timeInputMode === 'type' ? colors.accent : 'transparent' }}
            onPress={() => handleTimeInputModeChange('type')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: timeInputMode === 'type' ? colors.textPrimary : colors.textTertiary }}>Type</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>
          Choose how you set alarm and timer times: scroll wheels or text input.
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.themeGrid}>
          {(Object.keys(themes) as ThemeName[]).map((name) => {
            const t = themes[name];
            const isActive = name === themeName;
            const displayName = name === 'highContrast' ? 'High Contrast' : name === 'sunset' ? 'Sunset' : name === 'ruby' ? 'Ruby' : name === 'vivid' ? 'Vivid' : name.charAt(0).toUpperCase() + name.slice(1);
            return (
              <TouchableOpacity
                key={name}
                style={styles.themeItem}
                onPress={() => { hapticLight(); setTheme(name); }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.themeCircleOuter,
                    {
                      borderColor: isActive ? t.accent : t.border,
                      backgroundColor: t.background,
                    },
                  ]}
                >
                  <View style={[styles.themeCircleInner, { backgroundColor: t.accent }]}>
                    {isActive && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                  </View>
                </View>
                <Text style={[styles.themeName, isActive && styles.themeNameActive]}>
                  {displayName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionLabel}>Screen Background</Text>
        <Text style={[styles.description, { marginTop: 0, marginBottom: 16 }]}>Photo background for Alarms, Timers, Reminders, Notes, and Calendar</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity
            onPress={async () => {
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
            }}
            activeOpacity={0.7}
          >
            {bgUri ? (
              <Image source={{ uri: bgUri }} style={{ width: 80, height: 80, borderRadius: 8 }} resizeMode="cover" />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                <CameraIcon color={colors.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.4)'} size={24} />
                <Text style={{ fontSize: 10, color: colors.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)', marginTop: 4 }}>Tap to set</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, justifyContent: 'center', gap: 10 }}>
            <TouchableOpacity
              style={btn.secondarySmall}
              onPress={async () => {
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
              }}
              activeOpacity={0.7}
            >
              <Text style={btn.secondarySmallText}>Change Photo</Text>
            </TouchableOpacity>
            {bgUri && (
              <TouchableOpacity
                style={btn.destructiveSmall}
                onPress={() => {
                  hapticLight();
                  Alert.alert('Clear Background?', 'Remove the photo background?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: async () => {
                      await clearBackground();
                      setBgUri(null);
                      ToastAndroid.show('Background cleared', ToastAndroid.SHORT);
                    }},
                  ]);
                }}
                activeOpacity={0.7}
              >
                <Text style={btn.destructiveSmallText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {bgUri && (
          <>
            <Text style={[styles.description, { marginTop: 16, marginBottom: 8 }]}>Overlay Darkness: {Math.round(bgOpacity * 100)}%</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: bgOpacity === val ? colors.activeBackground : (colors.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'),
                    borderWidth: 1,
                    borderColor: bgOpacity === val ? colors.accent : (colors.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'),
                  }}
                  onPress={async () => {
                    hapticLight();
                    setBgOpacity(val);
                    await setOverlayOpacity(val);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{Math.round(val * 100)}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <View style={styles.row}>
          <Text style={styles.label}>Voice Roasts</Text>
          <Switch
            value={voiceRoasts}
            onValueChange={async (val) => {
              hapticLight();
              setVoiceRoastsState(val);
              await setVoiceEnabled(val);
            }}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.description}>
          Sarcastic voice lines when your alarm fires. He's not mean... he's just tired.
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <View style={styles.row}>
          <Text style={styles.label}>Haptic Feedback</Text>
          <Switch
            value={hapticsEnabled}
            onValueChange={handleHapticsToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={hapticsEnabled ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={styles.description}>
          Touch feedback for buttons, toggles, and interactions.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.card, { marginTop: 16 }]}
        onPress={() => {
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
        }}
        activeOpacity={0.7}
      >
        <View style={styles.aboutRow}>
          <Text style={styles.label}>Send Feedback</Text>
          <ChevronRightIcon color={colors.textTertiary} size={16} />
        </View>
        <Text style={styles.description}>
          Bug reports, suggestions, or let us know how we're doing
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { marginTop: 16 }]}
        onPress={() => { hapticLight(); navigation.navigate('About'); }}
        activeOpacity={0.7}
      >
        <View style={styles.aboutRow}>
          <Text style={styles.label}>About</Text>
          <ChevronRightIcon color={colors.textTertiary} size={16} />
        </View>
        <Text style={styles.description}>
          Version info and credits.
        </Text>
      </TouchableOpacity>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionLabel}>Permissions</Text>
        <TouchableOpacity
          style={btn.primary}
          onPress={() => { hapticLight(); navigation.navigate('Onboarding', { startSlide: 2 }); }}
          activeOpacity={0.7}
        >
          <Text style={btn.primaryText}>Setup Guide</Text>
        </TouchableOpacity>
        <Text style={styles.setupGuideDesc}>
          Re-run setup. In case you forgot to do something...
        </Text>
      </View>

      {/* Your Memories — Backup & Restore */}
      <Text style={{ fontSize: 13, color: colors.textTertiary, fontStyle: 'italic', lineHeight: 18, marginHorizontal: 20, marginTop: 24, marginBottom: 16 }}>
        Everything stays on your phone. Exports go wherever you send them {'\u2014'} not to us. We don't have servers. We don't want your data.
      </Text>

      <View style={[styles.card, { marginTop: 0 }]}>
        <Text style={styles.sectionLabel}>Your Memories</Text>

        <Text style={{ fontSize: 14, color: lastBackup ? colors.textSecondary : colors.textTertiary, marginBottom: showNudge ? 4 : 16 }}>
          {lastBackup
            ? `Last export: ${new Date(lastBackup).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
            : 'Never exported'}
        </Text>

        {showNudge && (
          <Text style={{ fontSize: 13, color: colors.orange, fontStyle: 'italic', marginBottom: 16 }}>
            It's been a while. Your memories aren't backed up.
          </Text>
        )}

        <TouchableOpacity
          style={[btn.primary, { opacity: isExporting || isImporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={isExporting || isImporting}
          activeOpacity={0.7}
        >
          <Text style={btn.primaryText}>
            {isExporting ? 'Exporting...' : 'Export Memories'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[btn.secondary, { marginTop: 10, opacity: isExporting || isImporting ? 0.6 : 1 }]}
          onPress={handleImport}
          disabled={isExporting || isImporting}
          activeOpacity={0.7}
        >
          <Text style={btn.secondaryText}>
            {isImporting ? 'Importing...' : 'Import Memories'}
          </Text>
        </TouchableOpacity>

        {/* Auto-Export */}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />

        <View style={styles.row}>
          <Text style={styles.label}>Auto-Export</Text>
          <Switch
            value={autoBackupEnabled}
            onValueChange={handleAutoBackupToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={autoBackupEnabled ? colors.textPrimary : colors.textTertiary}
          />
        </View>

        {autoBackupEnabled && (
          <>
            {autoBackupFolderName && (
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>
                Saving to {autoBackupFolderName}
              </Text>
            )}

            <TouchableOpacity onPress={handleChangeFolder} activeOpacity={0.7} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 13, color: colors.accent }}>Change folder</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', backgroundColor: colors.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 12, padding: 2, marginTop: 12 }}>
              {(['daily', 'weekly', 'monthly'] as BackupFrequency[]).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: autoBackupFrequency === freq ? colors.accent : 'transparent' }}
                  onPress={() => handleFrequencyChange(freq)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: autoBackupFrequency === freq ? colors.textPrimary : colors.textTertiary }}>
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Silence duration picker modal */}
      <Modal transparent visible={silencePickerVisible} animationType="slide" onRequestClose={handleSilencePickerCancel}>
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0 }]}>
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 20,
            paddingBottom: 20 + insets.bottom,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: colors.border,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>Silence Duration</Text>
              <TouchableOpacity
                onPress={handleSilencePickerCancel}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, color: colors.textTertiary, fontWeight: '600' }}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>

            {silencePickerVisible && (
              timeInputMode === 'type' ? (
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <TextInput
                      style={{ backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', borderWidth: 1, borderColor: colors.border, width: '100%' }}
                      value={String(pickerHours)}
                      onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setPickerHours(isNaN(n) ? 0 : Math.min(n, 23)); }}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 6 }}>Hours</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <TextInput
                      style={{ backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', borderWidth: 1, borderColor: colors.border, width: '100%' }}
                      value={String(pickerMinutes)}
                      onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setPickerMinutes(isNaN(n) ? 0 : Math.min(n, 59)); }}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 6 }}>Minutes</Text>
                  </View>
                </View>
              ) : (
                <TimePicker
                  hours={pickerHours}
                  minutes={pickerMinutes}
                  onHoursChange={setPickerHours}
                  onMinutesChange={setPickerMinutes}
                />
              )
            )}

            {/* Buttons */}
            <View style={{ marginTop: 20, gap: 10 }}>
              <TouchableOpacity
                style={btn.primary}
                onPress={handleSilencePickerSet}
                activeOpacity={0.7}
              >
                <Text style={btn.primaryText}>Set Timer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={btn.secondary}
                onPress={handleSilencePickerIndefinite}
                activeOpacity={0.7}
              >
                <Text style={btn.secondaryText}>Until I Turn It Off</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    {isImporting && (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginTop: 16 }}>
          Importing memories...
        </Text>
      </View>
    )}
    </View>
    </ImageBackground>
  );
}

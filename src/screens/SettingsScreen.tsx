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
} from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import notifee from '@notifee/react-native';
import { loadSettings, saveSettings, getDefaultTimerSound, saveDefaultTimerSound, getSilenceAll, setSilenceAll, getSilenceExpiry } from '../services/settings';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight, hapticMedium, refreshHapticsSetting } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes, type ThemeName } from '../theme/colors';
import SoundPickerModal from '../components/SoundPickerModal';
import type { SystemSound } from '../components/SoundPickerModal';
import BackButton from '../components/BackButton';
import TimePicker from '../components/TimePicker';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const presetNames = Object.keys(themes) as (ThemeName & keyof typeof themes)[];
const themeDisplayNames: Record<string, string> = { amoled: 'AMOLED' };

export default function SettingsScreen({ navigation }: Props) {
  const { colors, themeName, customAccent, customBackground, setTheme, setCustomTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [timeInputMode, setTimeInputMode] = useState<'scroll' | 'type'>('scroll');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [timerSoundName, setTimerSoundName] = useState<string | null>(null);
  const [timerSoundID, setTimerSoundID] = useState<number | null>(null);
  const [timerSoundPickerVisible, setTimerSoundPickerVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickedAccentRef = useRef(customAccent || colors.accent);
  const pickedBgRef = useRef(customBackground || '#121220');
  const [hasPermissionIssues, setHasPermissionIssues] = useState(false);
  const [silenceAll, setSilenceAllState] = useState(false);
  const [silenceRemaining, setSilenceRemaining] = useState<string | null>(null);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [silencePickerVisible, setSilencePickerVisible] = useState(false);
  const [pickerHours, setPickerHours] = useState(1);
  const [pickerMinutes, setPickerMinutes] = useState(0);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      paddingBottom: 40 + insets.bottom,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFFFFF',
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
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      flex: 1,
      marginRight: 12,
    },
    description: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 12,
      lineHeight: 20,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 16,
    },
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'space-between',
    },
    themeItem: {
      alignItems: 'center',
      width: '22%',
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
      color: 'rgba(255,255,255,0.7)',
      marginTop: 6,
      textAlign: 'center',
    },
    themeNameActive: {
      fontWeight: '700',
      color: colors.accent,
    },
    rainbowRing: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
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
    pickerWrapper: {
      gap: 16,
    },
    modalBtns: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalCancelBtn: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    modalSaveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalSaveText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    setupGuideBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    setupGuideText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    setupGuideDesc: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.7)',
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
      color: 'rgba(255,255,255,0.5)',
    },
    timerSoundValue: {
      fontSize: 14,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.7)',
      marginRight: 8,
    },
  }), [colors, insets.bottom]);

  useEffect(() => {
    loadSettings().then((s) => {
      setTimeFormat(s.timeFormat);
      setTimeInputMode(s.timeInputMode);
    });
    // Load haptics setting
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('hapticsEnabled');
        if (raw !== null) {
          setHapticsEnabled(raw !== 'false');
        }
      } catch {}
    })();
    // Load default timer sound
    (async () => {
      try {
        const s = await getDefaultTimerSound();
        setTimerSoundName(s.name);
        setTimerSoundID(s.soundID);
      } catch {}
    })();
  }, []);

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
      await AsyncStorage.setItem('hapticsEnabled', value ? 'true' : 'false');
    } catch {}
    await refreshHapticsSetting();
    if (value) hapticLight();
  };

  const handleTimerSoundSelect = async (sound: SystemSound | null) => {
    hapticLight();
    setTimerSoundPickerVisible(false);
    if (sound) {
      setTimerSoundName(sound.title);
      setTimerSoundID(sound.soundID);
      try {
        await saveDefaultTimerSound({ uri: sound.url, name: sound.title, soundID: sound.soundID });
      } catch {}
    } else {
      setTimerSoundName(null);
      setTimerSoundID(null);
      try {
        await saveDefaultTimerSound({ uri: null, name: null, soundID: null });
      } catch {}
    }
  };

  const handleAccentChange = (result: ColorFormatsObject) => {
    pickedAccentRef.current = result.hex;
  };

  const handleBgChange = (result: ColorFormatsObject) => {
    pickedBgRef.current = result.hex;
  };

  const handleConfirmCustom = () => {
    hapticLight();
    setPickerVisible(false);
    setCustomTheme(pickedAccentRef.current, pickedBgRef.current);
  };

  const handleResetTheme = () => {
    hapticLight();
    setPickerVisible(false);
    setTheme('midnight');
  };

  const isCustomActive = themeName === 'custom';

  return (
    <ImageBackground source={require('../../assets/gear.png')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Settings</Text>
      </View>

      {hasPermissionIssues && (
        <TouchableOpacity
          style={styles.permissionBanner}
          onPress={() => { hapticLight(); navigation.navigate('Onboarding', { startSlide: 2 }); }}
          activeOpacity={0.7}
        >
          <Text style={styles.permissionBannerIcon}>{'\u26A0\uFE0F'}</Text>
          <Text style={styles.permissionBannerText}>Some permissions need attention</Text>
          <Text style={styles.permissionBannerChevron}>{'\u203A'}</Text>
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
        <Text style={styles.label}>Time Input Style</Text>
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 2, marginTop: 8 }}>
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
        <View style={styles.row}>
          <Text style={styles.label}>Vibration</Text>
          <Switch
            value={hapticsEnabled}
            onValueChange={handleHapticsToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={hapticsEnabled ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={styles.description}>
          Haptic feedback for buttons, toggles, and interactions throughout the app.
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => { hapticLight(); setTimerSoundPickerVisible(true); }}
          activeOpacity={0.7}
        >
          <Text style={styles.label}>Timer Sound</Text>
          <Text style={styles.timerSoundValue}>
            {timerSoundName || 'Default'}
          </Text>
          <Text style={styles.aboutChevron}>{'\u203A'}</Text>
        </TouchableOpacity>
        <Text style={styles.description}>
          Sound played when a timer completes.
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <View style={styles.row}>
          <Text style={styles.label}>Silence All Alarms</Text>
          <Switch
            value={silenceAll}
            onValueChange={handleSilenceToggle}
            trackColor={{ false: colors.border, true: '#FFA500' }}
            thumbColor={silenceAll ? '#FFFFFF' : colors.textTertiary}
          />
        </View>
        {silenceAll && (
          <Text style={{ fontSize: 14, color: '#FFA500', fontWeight: '600', marginTop: 10 }}>
            {silenceRemaining || 'Silenced until you turn it off'}
          </Text>
        )}
        <Text style={styles.description}>
          Mute all alarm sounds and vibrations. Alarms still fire and show notifications.
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.themeGrid}>
          {presetNames.map((name) => {
            const t = themes[name];
            const isActive = name === themeName;
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
                      borderColor: isActive ? colors.accent : t.background,
                      backgroundColor: t.background,
                    },
                  ]}
                >
                  <View style={[styles.themeCircleInner, { backgroundColor: t.accent }]}>
                    {isActive && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                  </View>
                </View>
                <Text
                  style={[styles.themeName, isActive && styles.themeNameActive]}
                >
                  {themeDisplayNames[name] || name.charAt(0).toUpperCase() + name.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Custom theme circle */}
          <TouchableOpacity
            style={styles.themeItem}
            onPress={() => {
              hapticLight();
              pickedAccentRef.current = customAccent || colors.accent;
              pickedBgRef.current = customBackground || '#121220';
              setPickerVisible(true);
            }}
            activeOpacity={0.7}
          >
            {customAccent ? (
              <View
                style={[
                  styles.rainbowRing,
                  {
                    borderColor: isCustomActive ? colors.accent : colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <View style={[styles.themeCircleInner, { backgroundColor: customAccent }]}>
                  {isCustomActive && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.rainbowRing,
                  {
                    borderColor: isCustomActive ? colors.accent : colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <View
                  style={[
                    styles.themeCircleInner,
                    {
                      backgroundColor: colors.card,
                      borderWidth: 2,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{'\u{1F3A8}'}</Text>
                </View>
              </View>
            )}
            <Text
              style={[styles.themeName, isCustomActive && styles.themeNameActive]}
            >
              Custom
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionLabel}>Permissions</Text>
        <TouchableOpacity
          style={styles.setupGuideBtn}
          onPress={() => { hapticLight(); navigation.navigate('Onboarding', { startSlide: 2 }); }}
          activeOpacity={0.7}
        >
          <Text style={styles.setupGuideText}>Setup Guide</Text>
        </TouchableOpacity>
        <Text style={styles.setupGuideDesc}>
          Re-run the permission setup for notifications, alarms, battery optimization, full screen alarms, and more.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.card, { marginTop: 16 }]}
        onPress={() => {
          hapticLight();
          const version =
            Constants.expoConfig?.version
            || (Constants as any).manifest?.version
            || (Constants as any).manifest2?.extra?.expoClient?.version
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
          <Text style={styles.label}>{'\u2709\uFE0F'} Send Feedback</Text>
          <Text style={styles.aboutChevron}>{'\u203A'}</Text>
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
          <Text style={styles.aboutChevron}>{'\u203A'}</Text>
        </View>
        <Text style={styles.description}>
          Version info, credits, and a hidden surprise.
        </Text>
      </TouchableOpacity>

      {/* Color Picker Modal */}
      <Modal transparent visible={pickerVisible} animationType="fade" onRequestClose={() => { hapticLight(); setPickerVisible(false); }}>
        <View style={styles.modalOverlay}>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingVertical: 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Theme</Text>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Background Color</Text>
            <ColorPicker
              value={pickedBgRef.current}
              onCompleteJS={handleBgChange}
            >
              <View style={styles.pickerWrapper}>
                <Preview hideInitialColor />
                <Panel1 />
                <HueSlider />
              </View>
            </ColorPicker>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginTop: 20, marginBottom: 8 }}>Accent Color</Text>
            <ColorPicker
              value={pickedAccentRef.current}
              onCompleteJS={handleAccentChange}
            >
              <View style={styles.pickerWrapper}>
                <Preview hideInitialColor />
                <Panel1 />
                <HueSlider />
              </View>
            </ColorPicker>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => { hapticLight(); setPickerVisible(false); }}
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResetTheme}
                style={[styles.modalCancelBtn, { borderColor: colors.red }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: colors.red }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmCustom}
                style={styles.modalSaveBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSaveText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Timer Sound Picker */}
      <SoundPickerModal
        visible={timerSoundPickerVisible}
        currentSoundID={timerSoundID}
        onSelect={handleTimerSoundSelect}
        onClose={() => setTimerSoundPickerVisible(false)}
      />

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
                style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                onPress={handleSilencePickerSet}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Set Timer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.accent }}
                onPress={handleSilencePickerIndefinite}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>Until I Turn It Off</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
    </ImageBackground>
  );
}

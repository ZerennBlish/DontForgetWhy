import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import notifee from '@notifee/react-native';
import { loadSettings, saveSettings, getDefaultTimerSound, saveDefaultTimerSound } from '../services/settings';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight, refreshHapticsSetting } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes, type ThemeName } from '../theme/colors';
import SoundPickerModal from '../components/SoundPickerModal';
import type { SystemSound } from '../components/SoundPickerModal';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const presetNames = Object.keys(themes) as (ThemeName & keyof typeof themes)[];

export default function SettingsScreen({ navigation }: Props) {
  const { colors, themeName, customAccent, setTheme, setCustomTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [timerSoundName, setTimerSoundName] = useState<string | null>(null);
  const [timerSoundID, setTimerSoundID] = useState<number | null>(null);
  const [timerSoundPickerVisible, setTimerSoundPickerVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickedColorRef = useRef(customAccent || colors.accent);
  const [hasPermissionIssues, setHasPermissionIssues] = useState(false);

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
    backBtn: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '600',
      marginBottom: 16,
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

  const handleTimeFormatToggle = async (value: boolean) => {
    hapticLight();
    const newFormat = value ? '24h' : '12h';
    setTimeFormat(newFormat);
    await saveSettings({ timeFormat: newFormat });
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

  const handleColorChange = (result: ColorFormatsObject) => {
    pickedColorRef.current = result.hex;
  };

  const handleConfirmCustom = () => {
    setPickerVisible(false);
    setCustomTheme(pickedColorRef.current);
  };

  const isCustomActive = themeName === 'custom';

  return (
    <ImageBackground source={require('../../assets/gear.png')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {hasPermissionIssues && (
        <TouchableOpacity
          style={styles.permissionBanner}
          onPress={() => navigation.navigate('Onboarding', { startSlide: 2 })}
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
        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.themeGrid}>
          {presetNames.map((name) => {
            const t = themes[name];
            const isActive = name === themeName;
            return (
              <TouchableOpacity
                key={name}
                style={styles.themeItem}
                onPress={() => setTheme(name)}
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
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Custom theme circle */}
          <TouchableOpacity
            style={styles.themeItem}
            onPress={() => {
              pickedColorRef.current = customAccent || colors.accent;
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
          onPress={() => navigation.navigate('Onboarding', { startSlide: 2 })}
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
          const version =
            Constants.expoConfig?.version
            || (Constants as any).manifest?.version
            || (Constants as any).manifest2?.extra?.expoClient?.version
            || 'unknown';
          const device = `${Platform.OS} ${Platform.Version}`;
          const body = encodeURIComponent(`\n\n---\nApp Version: ${version}\nDevice: ${device}`);
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
        onPress={() => navigation.navigate('About')}
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
      <Modal transparent visible={pickerVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pick a Color</Text>
            <ColorPicker
              value={pickedColorRef.current}
              onCompleteJS={handleColorChange}
            >
              <View style={styles.pickerWrapper}>
                <Preview hideInitialColor />
                <Panel1 />
                <HueSlider />
              </View>
            </ColorPicker>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
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
        </View>
      </Modal>

      {/* Timer Sound Picker */}
      <SoundPickerModal
        visible={timerSoundPickerVisible}
        currentSoundID={timerSoundID}
        onSelect={handleTimerSoundSelect}
        onClose={() => setTimerSoundPickerVisible(false)}
      />
    </ScrollView>
    </View>
    </ImageBackground>
  );
}

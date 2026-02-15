import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import { loadSettings, saveSettings } from '../services/settings';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight, refreshHapticsSetting } from '../utils/haptics';
import { previewAlarmSound } from '../services/notifications';
import { refreshGameSoundsSetting } from '../utils/gameSounds';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes, type ThemeName } from '../theme/colors';
import { ALARM_SOUNDS, getAlarmSoundById } from '../data/alarmSounds';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const presetNames = Object.keys(themes) as (ThemeName & keyof typeof themes)[];

const DEFAULT_SOUND_KEY = 'defaultAlarmSound';

export default function SettingsScreen({ navigation }: Props) {
  const { colors, themeName, customAccent, setTheme, setCustomTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [gameSoundsEnabled, setGameSoundsEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [defaultSoundId, setDefaultSoundId] = useState('default');
  const [soundPickerVisible, setSoundPickerVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickedColorRef = useRef(customAccent || colors.accent);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.textPrimary,
    },
    card: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.textTertiary,
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
      color: colors.textSecondary,
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
      color: colors.textTertiary,
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
    soundRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    soundPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    soundPillText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    soundOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    soundOptionLast: {
      borderBottomWidth: 0,
    },
    soundOptionIcon: {
      fontSize: 24,
      marginRight: 14,
    },
    soundOptionInfo: {
      flex: 1,
    },
    soundOptionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    soundOptionDesc: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 2,
    },
    soundOptionCheck: {
      fontSize: 18,
      color: colors.accent,
      fontWeight: '700',
    },
    soundPreviewBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    soundPreviewIcon: {
      fontSize: 16,
    },
  }), [colors, insets.bottom]);

  useEffect(() => {
    loadSettings().then((s) => {
      setTimeFormat(s.timeFormat);
      setGameSoundsEnabled(s.gameSoundsEnabled);
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
    // Load default alarm sound
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DEFAULT_SOUND_KEY);
        if (raw) setDefaultSoundId(raw);
      } catch {}
    })();
  }, []);

  const handleTimeFormatToggle = async (value: boolean) => {
    hapticLight();
    const newFormat = value ? '24h' : '12h';
    setTimeFormat(newFormat);
    await saveSettings({ timeFormat: newFormat });
  };

  const handleGameSoundsToggle = async (value: boolean) => {
    hapticLight();
    setGameSoundsEnabled(value);
    await saveSettings({ gameSoundsEnabled: value });
    refreshGameSoundsSetting(value);
  };

  const handleHapticsToggle = async (value: boolean) => {
    setHapticsEnabled(value);
    try {
      await AsyncStorage.setItem('hapticsEnabled', value ? 'true' : 'false');
    } catch {}
    await refreshHapticsSetting();
    if (value) hapticLight();
  };

  const handlePreviewSound = (channelId: string, label: string) => {
    hapticLight();
    previewAlarmSound(channelId, label);
  };

  const handleSelectDefaultSound = async (soundId: string) => {
    hapticLight();
    setDefaultSoundId(soundId);
    setSoundPickerVisible(false);
    try {
      await AsyncStorage.setItem(DEFAULT_SOUND_KEY, soundId);
    } catch {}
  };

  const handleColorChange = (result: ColorFormatsObject) => {
    pickedColorRef.current = result.hex;
  };

  const handleConfirmCustom = () => {
    setPickerVisible(false);
    setCustomTheme(pickedColorRef.current);
  };

  const isCustomActive = themeName === 'custom';
  const currentSound = getAlarmSoundById(defaultSoundId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

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
          <Text style={styles.label}>Game Sounds</Text>
          <Switch
            value={gameSoundsEnabled}
            onValueChange={handleGameSoundsToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={gameSoundsEnabled ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={styles.description}>
          Enhanced haptic patterns during games.
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
        <View style={styles.soundRow}>
          <Text style={styles.label}>Default Alarm Sound</Text>
          <TouchableOpacity
            style={styles.soundPill}
            onPress={() => setSoundPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text>{currentSound.icon}</Text>
            <Text style={styles.soundPillText}>{currentSound.label}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>
          Sound used for new alarms. Each alarm can override this.
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
          Re-run the permission setup for notifications, alarms, battery optimization, and more.
        </Text>
      </View>

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

      {/* Alarm Sound Picker Modal */}
      <Modal transparent visible={soundPickerVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Default Alarm Sound</Text>
            {ALARM_SOUNDS.map((sound, index) => (
              <TouchableOpacity
                key={sound.id}
                style={[
                  styles.soundOption,
                  index === ALARM_SOUNDS.length - 1 && styles.soundOptionLast,
                ]}
                onPress={() => handleSelectDefaultSound(sound.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.soundOptionIcon}>{sound.icon}</Text>
                <View style={styles.soundOptionInfo}>
                  <Text style={styles.soundOptionLabel}>{sound.label}</Text>
                  <Text style={styles.soundOptionDesc}>{sound.description}</Text>
                </View>
                {defaultSoundId === sound.id && (
                  <Text style={styles.soundOptionCheck}>{'\u2713'}</Text>
                )}
                <TouchableOpacity
                  style={styles.soundPreviewBtn}
                  onPress={() => handlePreviewSound(sound.channelId, sound.label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.soundPreviewIcon}>{'\u25B6'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            <View style={[styles.modalBtns, { marginTop: 16 }]}>
              <TouchableOpacity
                onPress={() => setSoundPickerVisible(false)}
                style={[styles.modalCancelBtn, { flex: 0, paddingHorizontal: 32 }]}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

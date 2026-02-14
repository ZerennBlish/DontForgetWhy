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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import { loadSettings, saveSettings } from '../services/settings';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes, type ThemeName } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const presetNames = Object.keys(themes) as (ThemeName & keyof typeof themes)[];

export default function SettingsScreen({ navigation }: Props) {
  const { colors, themeName, customAccent, setTheme, setCustomTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
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
  }), [colors, insets.bottom]);

  useEffect(() => {
    loadSettings().then((s) => {
      setTimeFormat(s.timeFormat);
    });
  }, []);

  const handleTimeFormatToggle = async (value: boolean) => {
    hapticLight();
    const newFormat = value ? '24h' : '12h';
    setTimeFormat(newFormat);
    await saveSettings({ timeFormat: newFormat });
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
    </ScrollView>
  );
}

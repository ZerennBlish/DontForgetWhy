import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Modal,
  ImageBackground,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes, type ThemeName } from '../theme/colors';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import { ChevronRightIcon, LockIcon } from '../components/Icons';
import ProGate from '../components/ProGate';
import useEntitlement from '../hooks/useEntitlement';
import { getProDetails, isProUser, type ProDetails } from '../services/proStatus';
import { useAppIcon } from '../hooks/useAppIcon';
import TimePicker from '../components/TimePicker';
import { getButtonStyles } from '../theme/buttonStyles';
import type { RootStackParamList } from '../navigation/types';
import type { BackupFrequency } from '../services/backupRestore';
import { useSettings } from '../hooks/useSettings';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function themeDisplayName(name: ThemeName): string {
  if (name === 'highContrast') return 'High Contrast';
  if (name === 'sunset') return 'Sunset';
  if (name === 'ruby') return 'Ruby';
  if (name === 'vivid') return 'Vivid';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatPurchaseDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'recently';
  }
}

const PRO_THEMES: Set<ThemeName> = new Set(['vivid', 'sunset', 'ruby']);

export default function SettingsScreen({ navigation }: Props) {
  const { colors, themeName, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [proGateVisible, setProGateVisible] = useState(false);

  const gearIcon = useAppIcon('gear');
  const warningIcon = useAppIcon('warning');
  const cameraIcon = useAppIcon('camera');
  const closeXIcon = useAppIcon('closeX');
  const checkmarkIcon = useAppIcon('checkmark');

  const {
    timeFormat, timeInputMode, hapticsEnabled, voiceRoasts,
    isPro: initialIsPro, isFounder, proDetails: initialProDetails,
    hasPermissionIssues,
    silenceAll, silenceRemaining,
    silencePickerVisible,
    pickerHours, setPickerHours, pickerMinutes, setPickerMinutes,
    bgUri, bgOpacity,
    lastBackup, isExporting, isImporting, showNudge,
    autoBackupEnabled, autoBackupFrequency, autoBackupFolderName,
    googleUser,
    handleTimeFormatToggle, handleTimeInputModeChange,
    handleHapticsToggle, gameSoundsEnabled, handleGameSoundsToggle,
    handleVoiceToggle,
    handleSilenceToggle, handleSilencePickerCancel,
    handleSilencePickerSet, handleSilencePickerIndefinite,
    handlePickBackground, handleClearBackground, handleSetOverlayOpacity,
    handleExport, handleImport,
    handleAutoBackupToggle, handleChangeFolder, handleFrequencyChange,
    handleSendFeedback,
    handleResetTutorials,
    handleGoogleSignIn, handleGoogleSignOut,
    calSyncEnabled, isSyncing, syncResult, syncError,
    handleCalSyncToggle, handleSyncNow,
  } = useSettings(navigation);

  const entitlement = useEntitlement();
  const [isPro, setIsPro] = useState<boolean>(initialIsPro);
  const [proDetails, setProDetails] = useState<ProDetails | null>(initialProDetails);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);
  const restoreResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (restoreResultTimerRef.current) clearTimeout(restoreResultTimerRef.current);
    };
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    if (restoreLoading) return;
    hapticLight();
    setRestoreLoading(true);
    setRestoreResult(null);
    try {
      await entitlement.restore();
    } finally {
      const restored = isProUser();
      setRestoreResult(restored ? 'Purchase restored!' : 'No purchases found');
      setRestoreLoading(false);
      if (restoreResultTimerRef.current) clearTimeout(restoreResultTimerRef.current);
      restoreResultTimerRef.current = setTimeout(() => setRestoreResult(null), 3000);
    }
  }, [entitlement, restoreLoading]);

  useEffect(() => {
    if (entitlement.isPro && !isPro) {
      setIsPro(true);
      setProDetails(getProDetails());
    }
  }, [entitlement.isPro, isPro]);

  useEffect(() => {
    if (entitlement.error) {
      setPurchaseError(entitlement.error);
      const t = setTimeout(() => setPurchaseError(null), 3000);
      return () => clearTimeout(t);
    }
    setPurchaseError(null);
  }, [entitlement.error]);

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
      fontSize: 26,
      color: colors.overlayText,
      fontFamily: FONTS.extraBold,
    },
    permissionBanner: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: colors.red + '25',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.red + '4D',
    },
    permissionBannerText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.red,
      flex: 1,
    },
    sectionHeader: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      color: colors.accent,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginHorizontal: 20,
      marginTop: 24,
      marginBottom: 8,
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
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    description: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.textSecondary,
      marginTop: 12,
      lineHeight: 20,
    },
    sectionLabel: {
      fontSize: 15,
      fontFamily: FONTS.semiBold,
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
    themeName: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    themeNameActive: {
      fontFamily: FONTS.bold,
      color: colors.accent,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    setupGuideDesc: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.textSecondary,
      marginTop: 12,
      lineHeight: 20,
    },
    aboutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    proCard: {
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.card + 'F0',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent + '30',
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 8,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    proHeaderText: {
      fontSize: 16,
      fontFamily: FONTS.bold,
      color: colors.accent,
    },
    proBodyText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.textSecondary,
      lineHeight: 20,
      marginTop: 6,
    },
    proBadge: {
      backgroundColor: colors.accent + '20',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    proBadgeText: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      color: colors.accent,
    },
    proUnlockBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
    },
    proUnlockBtnText: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: '#FFFFFF',
    },
    proRestoreBtn: {
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 4,
    },
    proRestoreText: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: colors.accent,
    },
    proErrorText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.red,
      textAlign: 'center',
      marginTop: 10,
    },
    proLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.modalOverlay,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [colors, insets.bottom]);

  const currentThemeDisplayName = themeDisplayName(themeName);

  return (
    <ImageBackground source={require('../../assets/gear.webp')} style={{ flex: 1 }} resizeMode="cover">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
    <View style={styles.header}>
      <View style={styles.headerBack}>
        <BackButton onPress={() => navigation.goBack()} forceDark />
      </View>
      <View style={styles.headerHome}>
        <HomeButton forceDark />
      </View>
      <View style={{ alignItems: 'center' }}>
        <Image source={gearIcon} style={{ width: 36, height: 36, marginBottom: 2 }} resizeMode="contain" />
        <Text style={styles.title}>Settings</Text>
      </View>
    </View>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {hasPermissionIssues && (
        <TouchableOpacity
          style={styles.permissionBanner}
          onPress={() => { hapticLight(); navigation.navigate('Onboarding', { startSlide: 2 }); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Fix notification permissions"
        >
          <Image source={warningIcon} style={{ width: 18, height: 18 }} resizeMode="contain" />
          <Text style={styles.permissionBannerText}>Some permissions need attention</Text>
          <ChevronRightIcon color={colors.textTertiary} size={16} />
        </TouchableOpacity>
      )}

      {/* ===== DFW PRO ===== */}
      <Text style={styles.sectionHeader}>DFW Pro</Text>

      {isFounder ? (
        <View style={styles.proCard}>
          <Text style={styles.proHeaderText}>Founding User</Text>
          <Text style={styles.proBodyText}>
            You were here before Pro existed. Everything is unlocked for you — forever. Thank you for believing in this app early.
          </Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>
      ) : isPro ? (
        <View style={styles.proCard}>
          <Text style={styles.proHeaderText}>Pro Unlocked</Text>
          <Text style={styles.proBodyText}>
            {proDetails?.purchaseDate
              ? `Purchased ${formatPurchaseDate(proDetails.purchaseDate)}`
              : 'Thanks for going Pro.'}
          </Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>
      ) : (
        <View style={styles.proCard}>
          <Text style={styles.proHeaderText}>Upgrade to Pro</Text>
          <Text style={styles.proBodyText}>
            Unlimited games, premium themes, calendar sync, and more.
          </Text>
          <TouchableOpacity
            style={[styles.proUnlockBtn, entitlement.loading && { opacity: 0.6 }]}
            onPress={() => { hapticLight(); entitlement.purchase(); }}
            disabled={entitlement.loading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Unlock Pro for ${entitlement.productPrice ?? '$1.99'}`}
          >
            <Text style={styles.proUnlockBtnText}>
              {`Unlock Pro — ${entitlement.productPrice ?? '$1.99'}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.proRestoreBtn}
            onPress={() => { hapticLight(); entitlement.restore(); }}
            disabled={entitlement.loading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Restore previous purchase"
          >
            <Text style={styles.proRestoreText}>Restore Purchase</Text>
          </TouchableOpacity>
          {purchaseError ? (
            <Text style={styles.proErrorText} accessibilityLiveRegion="polite">
              {purchaseError}
            </Text>
          ) : null}
          {entitlement.loading ? (
            <View style={styles.proLoadingOverlay} pointerEvents="auto">
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : null}
        </View>
      )}

      {/* ===== GENERAL ===== */}
      <Text style={styles.sectionHeader}>General</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>24-Hour Time</Text>
          <Switch
            value={timeFormat === '24h'}
            onValueChange={handleTimeFormatToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={timeFormat === '24h' ? colors.textPrimary : colors.textTertiary}
            accessibilityLabel="Toggle 24-hour time"
          />
        </View>
        <Text style={styles.description}>
          Show times as 14:30 instead of 2:30 PM.
        </Text>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.label}>Time Input Style</Text>
        <View style={{ flexDirection: 'row', backgroundColor: colors.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 12, padding: 2, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: timeInputMode === 'scroll' ? colors.accent : 'transparent' }}
            onPress={() => handleTimeInputModeChange('scroll')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Scroll input mode"
            accessibilityState={{ selected: timeInputMode === 'scroll' }}
          >
            <Text style={{ fontSize: 13, fontFamily: FONTS.semiBold, color: timeInputMode === 'scroll' ? colors.textPrimary : colors.textTertiary }}>Scroll</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: timeInputMode === 'type' ? colors.accent : 'transparent' }}
            onPress={() => handleTimeInputModeChange('type')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Keypad input mode"
            accessibilityState={{ selected: timeInputMode === 'type' }}
          >
            <Text style={{ fontSize: 13, fontFamily: FONTS.semiBold, color: timeInputMode === 'type' ? colors.textPrimary : colors.textTertiary }}>Type</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>
          Choose how you set alarm and timer times: scroll wheels or text input.
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
            accessibilityLabel="Toggle silence all alarms"
          />
        </View>
        {silenceAll && (
          <Text style={{ fontSize: 13, color: colors.orange, fontFamily: FONTS.semiBold, marginTop: 10 }}>
            {silenceRemaining || 'Silenced until you turn it off'}
          </Text>
        )}
        <Text style={styles.description}>
          Mute all alarm sounds and vibrations. Alarms still fire and show notifications.
        </Text>
      </View>

      {/* ===== APPEARANCE ===== */}
      <Text style={styles.sectionHeader}>Appearance</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => { hapticLight(); setThemeModalVisible(true); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Theme: ${currentThemeDisplayName}. Tap to change.`}
      >
        <View style={styles.row}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.accent,
              marginRight: 12,
            }} />
            <Text style={styles.label}>
              {currentThemeDisplayName}
            </Text>
          </View>
          <ChevronRightIcon color={colors.textTertiary} size={16} />
        </View>
      </TouchableOpacity>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionLabel}>Screen Background</Text>
        <Text style={[styles.description, { marginTop: 0, marginBottom: 16 }]}>Photo background for Alarms, Timers, Reminders, Notes, and Calendar</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity
            onPress={handlePickBackground}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Choose background photo"
          >
            {bgUri ? (
              <Image source={{ uri: bgUri }} style={{ width: 80, height: 80, borderRadius: 8 }} resizeMode="cover" />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                <Image source={cameraIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
                <Text style={{ fontSize: 10, fontFamily: FONTS.regular, color: colors.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)', marginTop: 4 }}>Tap to set</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, justifyContent: 'center', gap: 10 }}>
            <TouchableOpacity
              style={btn.secondarySmall}
              onPress={handlePickBackground}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Choose background photo"
            >
              <Text style={btn.secondarySmallText}>Change Photo</Text>
            </TouchableOpacity>
            {bgUri && (
              <TouchableOpacity
                style={btn.destructiveSmall}
                onPress={handleClearBackground}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Remove background photo"
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
                  onPress={() => handleSetOverlayOpacity(val)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${Math.round(val * 100)}% overlay darkness`}
                  accessibilityState={{ selected: bgOpacity === val }}
                >
                  <Text style={{ fontSize: 12, fontFamily: FONTS.semiBold, color: colors.textPrimary }}>{Math.round(val * 100)}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {/* ===== SOUND & HAPTICS ===== */}
      <Text style={styles.sectionHeader}>Sound & Haptics</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Voice Roasts</Text>
          <Switch
            value={voiceRoasts}
            onValueChange={handleVoiceToggle}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Toggle voice clips"
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
            accessibilityLabel="Toggle haptic feedback"
          />
        </View>
        <Text style={styles.description}>
          Touch feedback for buttons, toggles, and interactions.
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
            accessibilityLabel="Toggle game sounds"
          />
        </View>
        <Text style={styles.description}>
          Sound effects for chess, checkers, and memory match.
        </Text>
      </View>

      {/* ===== GOOGLE ACCOUNT ===== */}
      <Text style={styles.sectionHeader}>Google Account</Text>

      <View style={styles.card}>
        {googleUser ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              {googleUser.photoURL && (
                <Image
                  source={{ uri: googleUser.photoURL }}
                  style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }}
                />
              )}
              <View style={{ flex: 1 }}>
                {googleUser.displayName && (
                  <Text style={{ fontSize: 14, fontFamily: FONTS.semiBold, color: colors.textPrimary }}>
                    {googleUser.displayName}
                  </Text>
                )}
                <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.textSecondary }}>
                  {googleUser.email}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={btn.secondary}
              onPress={handleGoogleSignOut}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Disconnect Google account"
            >
              <Text style={btn.secondaryText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={btn.primary}
            onPress={handleGoogleSignIn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Connect Google account"
          >
            <Text style={btn.primaryText}>Connect Google Account</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.description}>
          Optional. Enables calendar sync and future connected features. Your local data stays on your phone either way.
        </Text>
      </View>

      {googleUser && isPro && (
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.label}>Google Calendar Sync</Text>
              <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.textSecondary, marginTop: 2 }}>
                Push alarms & reminders to Google Calendar
              </Text>
            </View>
            <Switch
              value={calSyncEnabled}
              onValueChange={handleCalSyncToggle}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={calSyncEnabled ? colors.textPrimary : colors.textTertiary}
              accessibilityLabel="Toggle Google Calendar sync"
              disabled={isSyncing}
            />
          </View>

          {calSyncEnabled && (
            <TouchableOpacity
              style={{ marginTop: 12, paddingVertical: 10, alignItems: 'center' }}
              onPress={handleSyncNow}
              disabled={isSyncing}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Sync alarms and reminders to Google Calendar"
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={{ fontSize: 14, fontFamily: FONTS.semiBold, color: colors.accent }}>
                  Sync Now
                </Text>
              )}
            </TouchableOpacity>
          )}

          {syncResult && (
            <Text
              style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.success, textAlign: 'center', marginTop: 8 }}
              accessibilityLiveRegion="polite"
            >
              {`Synced ${syncResult.synced} item${syncResult.synced === 1 ? '' : 's'}`}
              {syncResult.errors > 0 ? (
                <Text style={{ color: colors.red }}>{` (${syncResult.errors} failed)`}</Text>
              ) : null}
            </Text>
          )}
          {syncError && (
            <Text
              style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.red, textAlign: 'center', marginTop: 8 }}
              accessibilityLiveRegion="polite"
            >
              {syncError}
            </Text>
          )}
        </View>
      )}

      {googleUser && !isPro && (
        <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.textTertiary, fontStyle: 'italic', marginHorizontal: 20, marginTop: 8 }}>
          Calendar sync available with Pro
        </Text>
      )}

      {/* ===== DATA ===== */}
      <Text style={styles.sectionHeader}>Data</Text>

      <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.textTertiary, fontStyle: 'italic', lineHeight: 18, marginHorizontal: 20, marginBottom: 12 }}>
        Everything stays on your phone. Exports go wherever you send them {'\u2014'} not to us. We don't have servers. We don't want your data.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Your Memories</Text>

        <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: lastBackup ? colors.textSecondary : colors.textTertiary, marginBottom: showNudge ? 4 : 16 }}>
          {lastBackup
            ? `Last export: ${new Date(lastBackup).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
            : 'Never exported'}
        </Text>

        {showNudge && (
          <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.orange, fontStyle: 'italic', marginBottom: 16 }}>
            It's been a while. Your memories aren't backed up.
          </Text>
        )}

        <TouchableOpacity
          style={[btn.primary, { opacity: isExporting || isImporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={isExporting || isImporting}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Export backup"
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
          accessibilityRole="button"
          accessibilityLabel="Import backup"
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
            accessibilityLabel="Toggle auto backup"
          />
        </View>

        {autoBackupEnabled && (
          <>
            {autoBackupFolderName && (
              <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.textSecondary, marginTop: 8 }}>
                Saving to {autoBackupFolderName}
              </Text>
            )}

            <TouchableOpacity onPress={handleChangeFolder} activeOpacity={0.7} style={{ marginTop: 8 }} accessibilityRole="button" accessibilityLabel="Change auto backup folder">
              <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.accent }}>Change folder</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', backgroundColor: colors.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 12, padding: 2, marginTop: 12 }}>
              {(['daily', 'weekly', 'monthly'] as BackupFrequency[]).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: autoBackupFrequency === freq ? colors.accent : 'transparent' }}
                  onPress={() => handleFrequencyChange(freq)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${freq.charAt(0).toUpperCase() + freq.slice(1)} backup frequency`}
                  accessibilityState={{ selected: autoBackupFrequency === freq }}
                >
                  <Text style={{ fontSize: 13, fontFamily: FONTS.semiBold, color: autoBackupFrequency === freq ? colors.textPrimary : colors.textTertiary }}>
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {/* ===== SUPPORT ===== */}
      <Text style={styles.sectionHeader}>Support</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={handleResetTutorials}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Reset tutorial guide"
      >
        <View style={styles.aboutRow}>
          <Text style={styles.label}>Tutorial Guide</Text>
          <ChevronRightIcon color={colors.textTertiary} size={16} />
        </View>
        <Text style={styles.description}>
          Show feature tips again
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { marginTop: 16 }]}
        onPress={handleSendFeedback}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Send feedback"
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
        accessibilityRole="button"
        accessibilityLabel="About Don't Forget Why"
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
          accessibilityRole="button"
          accessibilityLabel="Run setup wizard"
        >
          <Text style={btn.primaryText}>Setup Guide</Text>
        </TouchableOpacity>
        <Text style={styles.setupGuideDesc}>
          Re-run setup. In case you forgot to do something...
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.card, { marginTop: 16, opacity: restoreLoading ? 0.6 : 1 }]}
        onPress={handleRestorePurchases}
        disabled={restoreLoading}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Restore previous purchase"
      >
        <View style={styles.aboutRow}>
          <Text style={styles.label}>Restore Purchases</Text>
          {restoreLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <ChevronRightIcon color={colors.textTertiary} size={16} />
          )}
        </View>
        <Text style={styles.description}>
          Restore a previous Pro purchase from Google Play.
        </Text>
      </TouchableOpacity>
      {restoreResult ? (
        <Text
          style={{
            fontSize: 12,
            fontFamily: FONTS.regular,
            color: restoreResult === 'Purchase restored!' ? colors.success : colors.textTertiary,
            marginHorizontal: 16,
            marginTop: 4,
          }}
          accessibilityLiveRegion="polite"
        >
          {restoreResult}
        </Text>
      ) : null}
      {purchaseError ? (
        <Text
          style={{
            fontSize: 12,
            fontFamily: FONTS.regular,
            color: colors.red,
            marginHorizontal: 16,
            marginTop: 4,
          }}
          accessibilityLiveRegion="polite"
        >
          {purchaseError}
        </Text>
      ) : null}

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
          }} accessibilityViewIsModal={true}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: colors.textPrimary }}>Silence Duration</Text>
              <TouchableOpacity
                onPress={handleSilencePickerCancel}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close silence picker"
              >
                <Image source={closeXIcon} style={{ width: 16, height: 16 }} resizeMode="contain" />
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
                    <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.textTertiary, marginTop: 6 }}>Hours</Text>
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
                    <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.textTertiary, marginTop: 6 }}>Minutes</Text>
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
                accessibilityRole="button"
                accessibilityLabel="Set silence timer"
              >
                <Text style={btn.primaryText}>Set Timer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={btn.secondary}
                onPress={handleSilencePickerIndefinite}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Silence until turned off"
              >
                <Text style={btn.secondaryText}>Until I Turn It Off</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme picker modal */}
      <Modal transparent visible={themeModalVisible} animationType="slide" onRequestClose={() => { hapticLight(); setThemeModalVisible(false); }}>
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
          }} accessibilityViewIsModal={true}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: colors.textPrimary }}>Choose Theme</Text>
              <TouchableOpacity
                onPress={() => { hapticLight(); setThemeModalVisible(false); }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close theme picker"
              >
                <Image source={closeXIcon} style={{ width: 16, height: 16 }} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            <View style={styles.themeGrid}>
              {(Object.keys(themes) as ThemeName[]).map((name) => {
                const t = themes[name];
                const isActive = name === themeName;
                const displayName = themeDisplayName(name);
                const isLocked = !isPro && PRO_THEMES.has(name);
                return (
                  <TouchableOpacity
                    key={name}
                    style={styles.themeItem}
                    onPress={() => {
                      hapticLight();
                      if (isLocked) {
                        setThemeModalVisible(false);
                        setProGateVisible(true);
                        return;
                      }
                      setTheme(name);
                      setThemeModalVisible(false);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${displayName} theme${isLocked ? ' (Pro)' : ''}`}
                    accessibilityState={{ selected: isActive }}
                  >
                    <View
                      style={[
                        styles.themeCircleOuter,
                        {
                          borderColor: isActive ? t.accent : t.border,
                          backgroundColor: t.background,
                          opacity: isLocked ? 0.5 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.themeCircleInner, { backgroundColor: t.accent }]}>
                        {isLocked ? (
                          <LockIcon color={t.textPrimary} size={14} />
                        ) : (
                          isActive && <Image source={checkmarkIcon} style={{ width: 16, height: 16 }} resizeMode="contain" />
                        )}
                      </View>
                    </View>
                    <Text style={[styles.themeName, isActive && styles.themeNameActive]}>
                      {displayName}
                    </Text>
                    {isLocked && (
                      <Text style={{ fontSize: 9, fontFamily: FONTS.bold, color: colors.accent, marginTop: 2 }}>
                        PRO
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    {proGateVisible && (
      <ProGate
        visible={proGateVisible}
        onClose={() => {
          setProGateVisible(false);
        }}
        isPro={entitlement.isPro}
        loading={entitlement.loading}
        error={entitlement.error}
        productPrice={entitlement.productPrice}
        onPurchase={entitlement.purchase}
        onRestore={entitlement.restore}
      />
    )}
    {isImporting && (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.overlayText, fontSize: 15, fontFamily: FONTS.semiBold, marginTop: 16 }}>
          Importing memories...
        </Text>
      </View>
    )}
    </View>
    </ImageBackground>
  );
}

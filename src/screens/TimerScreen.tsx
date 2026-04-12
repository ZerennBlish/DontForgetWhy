import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TimerPreset } from '../types/timer';
import { isPinned } from '../services/widgetPins';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { playChirp } from '../utils/soundFeedback';
import { cycleSoundMode, getSoundModeIcon, getSoundModeLabel } from '../utils/soundModeUtils';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import APP_ICONS from '../data/appIconAssets';
import MEDIA_ICONS, { GlowIcon } from '../assets/mediaIcons';
import TimePicker from '../components/TimePicker';
import SoundPickerModal from '../components/SoundPickerModal';
import type { RootStackParamList } from '../navigation/types';
import { useTimerScreen, formatCountdown, formatDuration } from '../hooks/useTimerScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Timers'>;

export default function TimerScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const presetCardWidth = (screenWidth - 32 - 16) / 3;

  const {
    activeTimers,
    bgUri, setBgUri, bgOpacity,
    recentPresets, restPresets, customPreset, pinnedPresets, pinnedIds,
    userTimers,
    customModal,
    customHours, setCustomHours,
    customMinutes, setCustomMinutes,
    customSeconds, setCustomSeconds,
    soundMode, setSoundMode,
    isCreatingNew,
    newTimerName, setNewTimerName,
    newTimerIcon, setNewTimerIcon,
    editingUserTimer,
    timeInputMode,
    iconInputRef,
    timerSoundName, timerSoundID,
    timerSoundPickerVisible, setTimerSoundPickerVisible,
    handleStartTimer, handleLongPress,
    handleRemoveTimer, handleTogglePause,
    handlePinToggle,
    handleStartUserTimer,
    handleModalSave, handleModalSaveOnly, handleTimerSoundSelect,
    closeModal,
  } = useTimerScreen();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 60 + insets.bottom,
    },
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    subsectionLabel: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
      marginBottom: 8,
    },
    activeCard: {
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.sectionTimer + '15',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.sectionTimer,
      borderLeftWidth: 3,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    activeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    activeIcon: {
      fontSize: 24,
    },
    activeLabel: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
    },
    activeRight: {
      alignItems: 'flex-end',
      gap: 8,
    },
    activeCountdown: {
      fontSize: 30,
      fontFamily: FONTS.bold,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    activeDone: {
      fontSize: 18,
      color: colors.red,
      fontFamily: FONTS.bold,
    },
    activeActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      padding: 6,
    },
    cancelBtn: {
      padding: 6,
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetCard: {
      width: presetCardWidth,
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.sectionTimer + '15',
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.sectionTimer,
      borderLeftWidth: 3,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    presetIcon: {
      fontSize: 20,
      marginBottom: 2,
    },
    presetLabel: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    presetDuration: {
      fontSize: 10,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      marginTop: 2,
    },
    cardPinOverlay: {
      position: 'absolute',
      top: 5,
      left: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30,30,40,0.7)' : 'rgba(0,0,0,0.15)',
      zIndex: 1,
    },
    cardPinOverlayText: {
      fontSize: 8,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: FONTS.bold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    soundModeIconBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1.5,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalSubtitle: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      textAlign: 'center',
      marginBottom: 20,
    },
    modalInputRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    modalInputGroup: {
      flex: 1,
      alignItems: 'center',
    },
    modalInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      width: '100%',
    },
    modalInputLabel: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      marginTop: 6,
    },
    modalBtns: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 24,
      marginTop: 8,
    },
    newTimerHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    emojiCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1.5,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiCircleText: {
      fontSize: 24,
    },
    headerNameInput: {
      flex: 1,
      marginHorizontal: 12,
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      backgroundColor: 'transparent',
      paddingVertical: 4,
    },
    headerSoundBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1.5,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiHintSmall: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      textAlign: 'center',
      marginBottom: 8,
    },
    hiddenInput: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1,
    },
  }), [colors, insets.bottom, presetCardWidth]);

  const renderPresetCard = (preset: TimerPreset, openModal?: boolean) => {
    const pinned = isPinned(preset.id, pinnedIds);
    return (
      <TouchableOpacity
        key={preset.id}
        style={styles.presetCard}
        onPress={() => openModal ? handleLongPress(preset) : handleStartTimer(preset)}
        onLongPress={() => { hapticLight(); handlePinToggle(preset); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Start ${preset.label} timer, ${preset.id === 'custom' ? 'Custom' : openModal ? 'Set' : formatDuration(preset.customSeconds || preset.seconds)}`}
      >
        <TouchableOpacity
          onPress={() => { hapticLight(); handlePinToggle(preset); }}
          style={styles.cardPinOverlay}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={pinned ? 'Unpin timer' : 'Pin timer'}
        >
          <Text style={[styles.cardPinOverlayText, pinned && { color: colors.accent }]}>
            {pinned ? 'Pinned' : 'Pin'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.presetIcon}>{preset.icon}</Text>
        <Text style={styles.presetLabel}>{preset.label}</Text>
        <Text style={styles.presetDuration}>
          {preset.id === 'custom' ? 'Custom' : openModal ? 'Set' : formatDuration(preset.customSeconds || preset.seconds)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bgUri ? (
          <>
            <Image source={{ uri: bgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBgUri(null)} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${bgOpacity})` }]} />
          </>
        ) : (
          <Image
            source={require('../../assets/fullscreenicon.webp')}
            style={{ width: '100%', height: '100%', opacity: colors.mode === 'dark' ? 0.15 : 0.06 }}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <BackButton onPress={() => navigation.goBack()} forceDark={!!bgUri} />
          <HomeButton forceDark={!!bgUri} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Image source={APP_ICONS.stopwatch} style={{ width: 36, height: 36, marginBottom: 2 }} resizeMode="contain" />
          <Text style={{ fontSize: 20, color: bgUri ? colors.overlayText : colors.textPrimary, textAlign: 'center', marginBottom: 8, fontFamily: FONTS.extraBold }}>Timers</Text>
        </View>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* Active Timers */}
      {activeTimers.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, bgUri && { color: colors.overlayText }]}>Active Timers</Text>
          {activeTimers.map((timer) => (
            <View key={timer.id} style={styles.activeCard}>
              <View style={styles.activeLeft}>
                <Text style={styles.activeIcon}>{timer.icon}</Text>
                <Text style={styles.activeLabel}>{timer.label}</Text>
              </View>
              <View style={styles.activeRight}>
                <Text
                  style={[
                    styles.activeCountdown,
                    timer.remainingSeconds <= 0 && styles.activeDone,
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  {timer.remainingSeconds <= 0
                    ? '\u23F0 Done!'
                    : formatCountdown(timer.remainingSeconds)}
                </Text>
                <View style={styles.activeActions}>
                  {timer.remainingSeconds > 0 && (
                    <TouchableOpacity
                      onPress={() => { hapticLight(); handleTogglePause(timer.id); }}
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={timer.isRunning ? 'Pause timer' : 'Resume timer'}
                    >
                      <GlowIcon
                        source={timer.isRunning ? MEDIA_ICONS.pause : MEDIA_ICONS.play}
                        size={20}
                        glowColor={timer.isRunning ? colors.success : colors.accent}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => { hapticHeavy(); handleRemoveTimer(timer.id); }}
                    style={styles.cancelBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel timer"
                  >
                    <GlowIcon source={APP_ICONS.closeX} size={20} glowColor={colors.red} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* My Timers */}
      {(userTimers.length > 0 || pinnedPresets.length > 0) && (
        <View style={styles.section}>
          <Text style={[styles.subsectionLabel, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>My Timers</Text>
          <View style={styles.presetGrid}>
            {userTimers.map((ut) => (
              <TouchableOpacity
                key={ut.id}
                style={styles.presetCard}
                onPress={() => handleStartUserTimer(ut)}
                onLongPress={() => { hapticLight(); handlePinToggle({ id: ut.id, icon: ut.icon, label: ut.label, seconds: ut.seconds }); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Start ${ut.label} timer, ${formatDuration(ut.seconds)}`}
              >
                <TouchableOpacity
                  onPress={() => { hapticLight(); handlePinToggle({ id: ut.id, icon: ut.icon, label: ut.label, seconds: ut.seconds }); }}
                  style={styles.cardPinOverlay}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={isPinned(ut.id, pinnedIds) ? 'Unpin timer' : 'Pin timer'}
                >
                  <Text style={[styles.cardPinOverlayText, isPinned(ut.id, pinnedIds) && { color: colors.accent }]}>
                    {isPinned(ut.id, pinnedIds) ? 'Pinned' : 'Pin'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.presetIcon}>{ut.icon}</Text>
                <Text style={styles.presetLabel}>{ut.label}</Text>
                <Text style={styles.presetDuration}>
                  {formatDuration(ut.seconds)}
                </Text>
              </TouchableOpacity>
            ))}
            {pinnedPresets.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.presetCard}
                onPress={() => handleStartTimer(p)}
                onLongPress={() => { hapticLight(); handlePinToggle(p); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Start ${p.label} timer, ${formatDuration(p.customSeconds || p.seconds)}`}
              >
                <TouchableOpacity
                  onPress={() => { hapticLight(); handlePinToggle(p); }}
                  style={styles.cardPinOverlay}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Unpin timer"
                >
                  <Text style={[styles.cardPinOverlayText, { color: colors.accent }]}>Pinned</Text>
                </TouchableOpacity>
                <Text style={styles.presetIcon}>{p.icon}</Text>
                <Text style={styles.presetLabel}>{p.label}</Text>
                <Text style={styles.presetDuration}>
                  {formatDuration(p.customSeconds || p.seconds)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Recent Presets */}
      {recentPresets.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.subsectionLabel, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>Recent</Text>
          <View style={styles.presetGrid}>
            {recentPresets.map((p) => renderPresetCard(p))}
          </View>
        </View>
      )}

      {/* All Timers */}
      <View style={styles.section}>
        <Text style={[styles.subsectionLabel, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
          {recentPresets.length > 0 ? 'All Timers' : 'Quick Start'}
        </Text>
        <View style={styles.presetGrid}>
          {customPreset && renderPresetCard(customPreset, true)}
          {restPresets.map((p) => renderPresetCard(p, true))}
        </View>
      </View>

      {/* Default Timer Sound */}
      <View style={{ paddingHorizontal: 0, marginTop: 16, marginBottom: 24 }}>
        <TouchableOpacity
          onPress={() => { hapticLight(); setTimerSoundPickerVisible(true); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Select timer sound"
          style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.accent, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: colors.accent }}>Timer Sound</Text>
          <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: colors.textTertiary }}>{timerSoundName || 'Default'} <Text style={{ color: colors.accent }}>{'\u203A'}</Text></Text>
        </TouchableOpacity>
      </View>

      {/* Custom Duration / New Timer / Edit Timer Modal */}
      <Modal transparent visible={!!customModal} animationType="fade" onRequestClose={() => { hapticLight(); closeModal(); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} accessibilityViewIsModal={true}>
            {isCreatingNew || editingUserTimer ? (
              <>
                <View style={styles.newTimerHeaderRow}>
                  <TouchableOpacity
                    style={styles.emojiCircle}
                    onPress={() => { hapticLight(); iconInputRef.current?.focus(); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Choose emoji"
                  >
                    {newTimerIcon === '\u{1F60A}' ? (
                      <Image source={APP_ICONS.plus} style={{ width: 24, height: 24 }} resizeMode="contain" />
                    ) : (
                      <Text style={styles.emojiCircleText}>{newTimerIcon}</Text>
                    )}
                  </TouchableOpacity>
                  <TextInput
                    style={styles.headerNameInput}
                    placeholder="Name your timer"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={30}
                    value={newTimerName}
                    onChangeText={setNewTimerName}
                    autoFocus={isCreatingNew}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setSoundMode((prev) => {
                        const next = cycleSoundMode(prev);
                        if (next === 'vibrate') { hapticMedium(); }
                        if (next === 'sound') { hapticLight(); setTimeout(() => hapticLight(), 100); playChirp(); }
                        return next;
                      });
                    }}
                    style={styles.headerSoundBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Sound mode: ${getSoundModeLabel(soundMode)}`}
                  >
                    <Image source={getSoundModeIcon(soundMode)} style={{ width: 26, height: 26 }} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.emojiHintSmall}>Tap </Text>
                  <Image source={APP_ICONS.plus} style={{ width: 16, height: 16, marginTop: -4 }} resizeMode="contain" />
                  <Text style={styles.emojiHintSmall}> to set </Text>
                  <Image source={APP_ICONS.smiley} style={{ width: 20, height: 20, marginTop: -4 }} resizeMode="contain" />
                </View>
                <TextInput
                  ref={iconInputRef}
                  style={styles.hiddenInput}
                  autoCorrect={false}
                  onChangeText={(text) => {
                    if (text) {
                      const graphemes = [...text];
                      setNewTimerIcon(graphemes[graphemes.length - 1] || '\u{1F60A}');
                    }
                    if (iconInputRef.current) {
                      iconInputRef.current.setNativeProps({ text: '' });
                      iconInputRef.current.blur();
                    }
                  }}
                />
              </>
            ) : (
              <>
                <View style={styles.modalTitleRow}>
                  <View style={{ width: 48 }} />
                  <Text style={styles.modalTitle}>
                    {(customModal?.icon ?? '') + ' ' + (customModal?.label ?? '')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSoundMode((prev) => {
                        const next = cycleSoundMode(prev);
                        if (next === 'vibrate') { hapticMedium(); }
                        if (next === 'sound') { hapticLight(); setTimeout(() => hapticLight(), 100); playChirp(); }
                        return next;
                      });
                    }}
                    style={styles.soundModeIconBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Sound mode: ${getSoundModeLabel(soundMode)}`}
                  >
                    <Image source={getSoundModeIcon(soundMode)} style={{ width: 26, height: 26 }} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>
                  Set custom duration
                </Text>
              </>
            )}
            {timeInputMode === 'type' ? (
              <View style={styles.modalInputRow}>
                <View style={styles.modalInputGroup}>
                  <TextInput
                    style={styles.modalInput}
                    value={String(customHours)}
                    onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setCustomHours(isNaN(n) ? 0 : Math.min(n, 23)); }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={styles.modalInputLabel}>hr</Text>
                </View>
                <View style={styles.modalInputGroup}>
                  <TextInput
                    style={styles.modalInput}
                    value={String(customMinutes)}
                    onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setCustomMinutes(isNaN(n) ? 0 : Math.min(n, 59)); }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={styles.modalInputLabel}>min</Text>
                </View>
                <View style={styles.modalInputGroup}>
                  <TextInput
                    style={styles.modalInput}
                    value={String(customSeconds)}
                    onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setCustomSeconds(isNaN(n) ? 0 : Math.min(n, 59)); }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={styles.modalInputLabel}>sec</Text>
                </View>
              </View>
            ) : (
              <TimePicker
                hours={customHours}
                minutes={customMinutes}
                seconds={customSeconds}
                onHoursChange={setCustomHours}
                onMinutesChange={setCustomMinutes}
                onSecondsChange={setCustomSeconds}
                showSeconds={true}
                maxHours={24}
                maxMinutes={60}
                maxSeconds={60}
                labels={{ hours: 'hr', minutes: 'min', seconds: 'sec' }}
              />
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => { hapticLight(); closeModal(); }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(30, 30, 40, 0.7)',
                  borderWidth: 1.5,
                  borderColor: colors.red,
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Image source={APP_ICONS.closeX} style={{ width: 22, height: 22 }} resizeMode="contain" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleModalSaveOnly}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(30, 30, 40, 0.7)',
                  borderWidth: 1.5,
                  borderColor: colors.accent,
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Save timer"
              >
                <Image source={APP_ICONS.save} style={{ width: 24, height: 24 }} resizeMode="contain" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleModalSave}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(30, 30, 40, 0.7)',
                  borderWidth: 1.5,
                  borderColor: colors.success,
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Save and start timer"
              >
                <Image source={MEDIA_ICONS.play} style={{ width: 26, height: 26 }} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SoundPickerModal
        visible={timerSoundPickerVisible}
        onSelect={handleTimerSoundSelect}
        onClose={() => setTimerSoundPickerVisible(false)}
        currentSoundID={timerSoundID}
      />
    </ScrollView>
    </View>
  );
}

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Modal,
  Keyboard,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WEEKDAYS, WEEKENDS, ALL_DAYS } from '../types/alarm';
import type { SoundMode } from '../utils/soundModeUtils';
import { cycleSoundMode, getSoundModeIcon, getSoundModeLabel } from '../utils/soundModeUtils';
import { useAlarmForm } from '../hooks/useAlarmForm';
import DayPickerRow from '../components/DayPickerRow';
import SoundPickerModal from '../components/SoundPickerModal';
import type { SystemSound } from '../components/SoundPickerModal';
import { useTheme } from '../theme/ThemeContext';
import { getButtonStyles } from '../theme/buttonStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { playChirp } from '../utils/soundFeedback';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import TimePicker from '../components/TimePicker';
import EmojiPickerModal from '../components/EmojiPickerModal';
import { AlarmIcon } from '../components/Icons';
import type { RootStackParamList } from '../navigation/types';

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAlarm'>;

export default function CreateAlarmScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const btn = getButtonStyles(colors);

  const form = useAlarmForm({
    existingAlarm: route.params?.alarm,
    initialDate: route.params?.initialDate,
  });

  // UI-only state
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiModalVisible, setEmojiModalVisible] = useState(false);
  const [systemSoundPickerVisible, setSystemSoundPickerVisible] = useState(false);

  const cardBg = colors.card + 'BF';

  const navigateBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('AlarmList');
    }
  };

  const handleSave = () => {
    hapticMedium();
    if (!form.hasContent()) {
      Alert.alert(
        'Really? Nothing?',
        "No nickname, no reason, no icon. You're literally setting a mystery alarm. Future you is going to be SO confused.",
        [
          { text: "Go back, I'll fix it", style: 'cancel' },
          { text: 'I like chaos', onPress: () => form.save(navigateBack) },
        ],
      );
      return;
    }
    form.save(navigateBack);
  };

  const openTimeModal = () => {
    hapticLight();
    form.prepareTimeModal();
    setTimeModalVisible(true);
  };

  const handleTimeModalDone = () => {
    hapticLight();
    form.confirmTimeModal();
    setTimeModalVisible(false);
  };

  const handleTimeModalCancel = () => {
    hapticLight();
    setTimeModalVisible(false);
  };

  const handleSystemSoundSelect = (sound: SystemSound | null) => {
    hapticLight();
    form.applySystemSound(sound);
    setSystemSoundPickerVisible(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top + 10,
      paddingHorizontal: 20,
      paddingBottom: 10,
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
    content: {
      padding: 20,
      paddingTop: 20,
      paddingBottom: 60 + insets.bottom,
    },
    heading: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    timeContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
    },
    hourInput: {
      fontSize: 56,
      fontWeight: '700',
      color: colors.textPrimary,
      backgroundColor: cardBg,
      borderRadius: 16,
      width: 90,
      textAlign: 'center',
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeColon: {
      fontSize: 56,
      fontWeight: '700',
      color: colors.textPrimary,
      marginHorizontal: 4,
    },
    minuteInput: {
      fontSize: 56,
      fontWeight: '700',
      color: colors.textPrimary,
      backgroundColor: cardBg,
      borderRadius: 16,
      width: 90,
      textAlign: 'center',
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    nicknameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    nicknameInput: {
      flex: 1,
      backgroundColor: cardBg,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noteInput: {
      backgroundColor: cardBg,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    charCount: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: 'right',
      marginTop: 4,
      marginBottom: 24,
    },
    emojiCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: cardBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emojiCircleText: {
      fontSize: 22,
    },
    quickEmojiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24,
    },
    quickEmojiBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickEmojiBtnActive: {
      borderWidth: 2,
      borderColor: colors.accent,
    },
    toggleCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 48,
      marginTop: 16,
      marginBottom: 24,
    },
    toggleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    ampmContainer: {
      flexDirection: 'column',
      marginLeft: 12,
      gap: 4,
    },
    ampmBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ampmBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    ampmText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    ampmTextActive: {
      color: colors.textPrimary,
    },
    timeDisplay: {
      alignItems: 'center',
      marginBottom: 32,
      paddingVertical: 20,
      paddingHorizontal: 32,
      backgroundColor: cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'center',
    },
    timeDisplayText: {
      fontSize: 48,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    timeDisplayHint: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
    },
    timeDisplayInput: {
      fontSize: 48,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      minWidth: 60,
      padding: 0,
    },
    timeModalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    timeModalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    timeModalBtns: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modeContainer: {
      flexDirection: 'row',
      backgroundColor: cardBg,
      borderRadius: 12,
      padding: 2,
      marginBottom: 16,
    },
    modeBtn: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modeBtnActive: {
      backgroundColor: colors.accent,
    },
    modeBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    modeBtnTextActive: {
      color: colors.textPrimary,
    },
    setDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 48,
      marginBottom: 8,
    },
    setDateText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    setDateChevron: {
      fontSize: 11,
      color: colors.textTertiary,
      marginLeft: 2,
    },
    clearDateBtn: {
      padding: 8,
    },
    clearDateText: {
      fontSize: 16,
      color: colors.textTertiary,
    },
    calHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    calNav: {
      padding: 8,
    },
    calNavText: {
      fontSize: 20,
      color: colors.accent,
    },
    calTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    calWeekRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    calWeekDay: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calCell: {
      width: '14.28%' as unknown as number,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calDay: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calDaySelected: {
      backgroundColor: colors.accent,
    },
    calDayText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    calDayTextDisabled: {
      color: colors.textTertiary,
      opacity: 0.4,
    },
    calDayTextSelected: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    selectedDateText: {
      fontSize: 14,
      color: colors.accent,
      textAlign: 'center',
      marginBottom: 24,
      fontWeight: '600',
    },
    scheduleSection: {
      marginBottom: 8,
    },
    headerRight: {
      position: 'absolute',
      right: 20,
      top: insets.top + 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    soundModeIconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: cardBg,
    },
    soundModeIconText: {
      fontSize: 18,
    },
    soundRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      marginBottom: 16,
    },
  }), [colors, cardBg, insets.top, insets.bottom]);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={require('../../assets/fullscreenicon.png')}
          style={{ width: '100%', height: '100%', opacity: colors.mode === 'dark' ? 0.15 : 0.06 }}
          resizeMode="cover"
        />
      </View>
      <View style={styles.header}>
        <View style={styles.headerBack}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.headerHome}>
          <HomeButton />
        </View>
        <Text style={styles.heading}>{form.isEditing ? 'Edit Alarm' : 'New Alarm'}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={btn.primarySmall} onPress={handleSave} activeOpacity={0.8}>
            <Text style={btn.primarySmallText}>{form.isEditing ? 'Update' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {form.timeInputMode === 'type' ? (
          <View style={styles.timeDisplay}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                ref={form.hourRef}
                style={styles.timeDisplayInput}
                value={form.hourText}
                onChangeText={form.handleHourChange}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.timeDisplayText}>:</Text>
              <TextInput
                ref={form.minuteRef}
                style={styles.timeDisplayInput}
                value={form.minuteText}
                onChangeText={form.handleMinuteChange}
                onKeyPress={form.handleMinuteKeyPress}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
              {form.timeFormat === '12h' && (
                <View style={{ marginLeft: 12, gap: 4 }}>
                  <TouchableOpacity
                    style={[styles.ampmBtn, form.ampm === 'AM' && styles.ampmBtnActive]}
                    onPress={() => { hapticLight(); form.setAmpm('AM'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.ampmText, form.ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ampmBtn, form.ampm === 'PM' && styles.ampmBtnActive]}
                    onPress={() => { hapticLight(); form.setAmpm('PM'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.ampmText, form.ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => { hapticLight(); Keyboard.dismiss(); }}
              activeOpacity={0.7}
              style={[btn.primarySmall, { alignSelf: 'stretch', marginHorizontal: 40, marginTop: 10 }]}
            >
              <Text style={btn.primarySmallText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={openTimeModal}
            activeOpacity={0.7}
            style={styles.timeDisplay}
          >
            <Text style={styles.timeDisplayText}>
              {form.timeFormat === '12h'
                ? `${form.pickerHours}:${String(form.pickerMinutes).padStart(2, '0')} ${form.ampm}`
                : `${String(form.pickerHours).padStart(2, '0')}:${String(form.pickerMinutes).padStart(2, '0')}`}
            </Text>
            <Text style={styles.timeDisplayHint}>Tap to set time</Text>
          </TouchableOpacity>
        )}

      {/* Time Picker Modal */}
      <Modal transparent visible={timeModalVisible} animationType="fade">
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalCard}>
            <Text style={styles.timeModalTitle}>Set Time</Text>
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TimePicker
                  key={`modal-${form.timeFormat}`}
                  hours={form.modalHours}
                  minutes={form.modalMinutes}
                  onHoursChange={form.handleModalHoursChange}
                  onMinutesChange={form.handleModalMinutesChange}
                  minHours={form.timeFormat === '12h' ? 1 : 0}
                  maxHours={form.timeFormat === '12h' ? 13 : 24}
                  padHours={form.timeFormat === '24h'}
                  labels={{ hours: '', minutes: '' }}
                />
                {form.timeFormat === '12h' && (
                  <View style={{ marginLeft: 16, gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.ampmBtn, form.modalAmpm === 'AM' && styles.ampmBtnActive]}
                      onPress={() => { hapticLight(); form.setModalAmpm('AM'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.ampmText, form.modalAmpm === 'AM' && styles.ampmTextActive]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ampmBtn, form.modalAmpm === 'PM' && styles.ampmBtnActive]}
                      onPress={() => { hapticLight(); form.setModalAmpm('PM'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.ampmText, form.modalAmpm === 'PM' && styles.ampmTextActive]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.timeModalBtns}>
              <TouchableOpacity onPress={handleTimeModalCancel} style={[btn.secondary, { flex: 1 }]} activeOpacity={0.7}>
                <Text style={btn.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTimeModalDone} style={[btn.primary, { flex: 1 }]} activeOpacity={0.7}>
                <Text style={btn.primaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

        <Text style={styles.label}>Schedule</Text>
        <View style={styles.scheduleSection}>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[styles.modeBtn, form.mode === 'one-time' && styles.modeBtnActive]}
              onPress={() => { hapticLight(); form.switchMode('one-time'); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, form.mode === 'one-time' && styles.modeBtnTextActive]}>
                One-time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, form.mode === 'recurring' && styles.modeBtnActive]}
              onPress={() => { hapticLight(); form.switchMode('recurring'); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, form.mode === 'recurring' && styles.modeBtnTextActive]}>
                Recurring
              </Text>
            </TouchableOpacity>
          </View>

          <DayPickerRow
            selectedDays={form.selectedDays}
            onToggleDay={(day) => form.handleToggleDay(day, form.mode, form.clearDate)}
            onSelectWeekdays={() => form.handleQuickDays([...WEEKDAYS], form.clearDate)}
            onSelectWeekends={() => form.handleQuickDays([...WEEKENDS], form.clearDate)}
            onSelectEveryday={() => form.handleQuickDays([...ALL_DAYS], form.clearDate)}
            isWeekdaysSelected={form.isWeekdaysSelected}
            isWeekendsSelected={form.isWeekendsSelected}
            isEverydaySelected={form.isEverydaySelected}
            showQuickDays={form.mode === 'recurring'}
            onToggleCalendar={form.toggleCalendar}
            isCalendarOpen={form.showCalendar}
            colors={colors}
          />
          {form.mode === 'recurring' && (
            <>
              {form.selectedDate && (
                <View style={styles.setDateRow}>
                  <Text style={styles.setDateText}>
                    {'\u{1F4C5}'} {formatDateDisplay(form.selectedDate)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { hapticLight(); form.setSelectedDate(null); }}
                    style={styles.clearDateBtn}
                  >
                    <Text style={styles.clearDateText}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {form.mode === 'one-time' && (
            <View style={styles.setDateRow}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => { hapticLight(); form.toggleCalendar(); }}
                activeOpacity={0.6}
              >
                <Text style={styles.setDateText}>
                  {'\u{1F4C5}'} {form.selectedDate ? formatDateDisplay(form.selectedDate) : 'Set date'}
                </Text>
              </TouchableOpacity>
              {form.selectedDate ? (
                <TouchableOpacity
                  onPress={() => { hapticLight(); form.setSelectedDate(null); }}
                  style={styles.clearDateBtn}
                >
                  <Text style={styles.clearDateText}>{'\u2715'}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.setDateChevron}>{form.showCalendar ? '\u25B4' : '\u25BE'}</Text>
              )}
            </View>
          )}

          {form.showCalendar && (
            <>
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={() => { hapticLight(); form.handleCalPrev(); }} style={styles.calNav}>
                  <Text style={styles.calNavText}>{'\u2039'}</Text>
                </TouchableOpacity>
                <Text style={styles.calTitle}>{form.MONTH_NAMES[form.calMonth]} {form.calYear}</Text>
                <TouchableOpacity onPress={() => { hapticLight(); form.handleCalNext(); }} style={styles.calNav}>
                  <Text style={styles.calNavText}>{'\u203A'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.calWeekRow}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <Text key={i} style={styles.calWeekDay}>{d}</Text>
                ))}
              </View>
              <View style={styles.calGrid}>
                {Array.from({ length: form.calFirstDay }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.calCell} />
                ))}
                {Array.from({ length: form.calDays }).map((_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(form.calYear, form.calMonth, day);
                  dateObj.setHours(0, 0, 0, 0);
                  const isPast = dateObj.getTime() < today.getTime();
                  const dateStr = `${form.calYear}-${String(form.calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = form.selectedDate === dateStr;
                  return (
                    <View key={day} style={styles.calCell}>
                      <TouchableOpacity
                        style={[styles.calDay, isSelected && styles.calDaySelected]}
                        onPress={() => { hapticLight(); form.handleSelectDate(day); }}
                        disabled={isPast}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.calDayText,
                          isPast && styles.calDayTextDisabled,
                          isSelected && styles.calDayTextSelected,
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
              {form.selectedDate && (
                <Text style={styles.selectedDateText}>{formatDateDisplay(form.selectedDate)}</Text>
              )}
            </>
          )}
        </View>

        <Text style={styles.label}>Nickname</Text>
        <View style={styles.nicknameRow}>
          <TextInput
            style={styles.nicknameInput}
            value={form.nickname}
            onChangeText={form.setNickname}
            placeholder="e.g. Pill O'Clock, Dog Time"
            placeholderTextColor={colors.textTertiary}
            maxLength={40}
          />
          <TouchableOpacity
            style={styles.emojiCircle}
            onPress={() => { hapticLight(); setEmojiPickerOpen((o) => !o); }}
            activeOpacity={0.7}
          >
            {form.selectedIcon ? <Text style={styles.emojiCircleText}>{form.selectedIcon}</Text> : <AlarmIcon color={colors.textSecondary} size={22} />}
          </TouchableOpacity>
        </View>
        {emojiPickerOpen && (
          <View style={styles.quickEmojiRow}>
            {['\u{1F48A}', '\u{1F3E5}', '\u{1F3CB}\u{FE0F}', '\u{1F43E}', '\u{1F4BC}', '\u{1F392}', '\u{2615}', '\u{1F373}', '\u{1F697}', '\u{1F4C5}', '\u{1F6CF}\u{FE0F}', '\u{1F9F9}'].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => { hapticLight(); form.setSelectedIcon(form.selectedIcon === emoji ? null : emoji); setEmojiPickerOpen(false); }}
                style={[styles.quickEmojiBtn, form.selectedIcon === emoji && styles.quickEmojiBtnActive]}
              >
                <Text style={{ fontSize: 18 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            {form.selectedIcon && (
              <TouchableOpacity
                onPress={() => { hapticLight(); form.setSelectedIcon(null); setEmojiPickerOpen(false); }}
                style={[styles.quickEmojiBtn, { borderColor: colors.red + '40' }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, color: colors.red, fontWeight: '600' }}>{'\u2715'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => { hapticLight(); setEmojiModalVisible(true); }}
              style={styles.quickEmojiBtn}
            >
              <Text style={{ fontSize: 18, color: colors.textTertiary }}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Why are you setting this alarm?</Text>
        <TextInput
          style={styles.noteInput}
          value={form.note}
          onChangeText={form.setNote}
          placeholder={form.placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={200}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{form.note.length}/200</Text>

        <Text style={styles.label}>Wake-up Photo</Text>
        <Text style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 10, marginTop: -6 }}>Shows when this alarm fires</Text>
        {form.photoUri ? (
          <View style={{ marginBottom: 24, position: 'relative' as const }}>
            <TouchableOpacity onPress={form.pickPhoto} activeOpacity={0.8}>
              <Image
                source={{ uri: form.photoUri }}
                style={{ width: '100%', height: 160, borderRadius: 12 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ position: 'absolute' as const, top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => {
                Alert.alert('Remove Photo', 'Remove the wake-up photo for this alarm?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: form.clearPhoto },
                ]);
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={form.pickPhoto}
            activeOpacity={0.7}
            style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed' as const, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}
          >
            <Text style={{ fontSize: 28, marginBottom: 4 }}>{'\u{1F4F7}'}</Text>
            <Text style={{ fontSize: 14, color: colors.textTertiary }}>Tap to add photo</Text>
          </TouchableOpacity>
        )}

        {(() => {
          const guessWhyDisabled = !form.nickname.trim() && form.note.trim().length < 3 && !form.selectedIcon;
          return (
            <>
              <View style={[styles.toggleCard, { marginTop: 4 }, guessWhyDisabled && { opacity: 0.5 }]}>
                <Text style={[styles.toggleLabel, { flex: 0, marginRight: 0 }]}>Guess Why</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Guess Why', 'When this alarm fires, you\'ll have to guess why you set it before you can dismiss it. Requires a nickname, note, or icon to play.')}
                  activeOpacity={0.7}
                  style={{ marginLeft: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 'auto' }}
                >
                  <Text style={{ fontSize: 12, color: colors.textTertiary, fontWeight: '700' }}>i</Text>
                </TouchableOpacity>
                <Switch
                  value={form.guessWhy}
                  onValueChange={(v) => { hapticLight(); form.setGuessWhy(v); }}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={form.guessWhy ? colors.textPrimary : colors.textTertiary}
                  disabled={guessWhyDisabled}
                />
              </View>
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: -22, marginBottom: 20, paddingLeft: 16 }}>
                {guessWhyDisabled ? 'Add a nickname, note, or icon first' : 'Play a guessing game when this alarm fires'}
              </Text>
            </>
          );
        })()}

        <View style={[styles.toggleCard, { marginTop: 4 }]}>
          <Text style={styles.toggleLabel}>Private Alarm</Text>
          <Switch
            value={form.selectedPrivate}
            onValueChange={(v) => { hapticLight(); form.setSelectedPrivate(v); }}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={form.selectedPrivate ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: -22, marginBottom: form.selectedPrivate ? 2 : 20, paddingLeft: 16 }}>Hides name and details from the alarm list</Text>
        {form.selectedPrivate && (
          <Text style={{ fontSize: 10, color: colors.textTertiary, opacity: 0.6, marginBottom: 20, paddingLeft: 16, fontStyle: 'italic' }}>{form.privateHint}</Text>
        )}

        <View style={styles.soundRow}>
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => {
                form.setSoundMode((prev: SoundMode) => {
                  const next = cycleSoundMode(prev);
                  if (next === 'vibrate') { hapticMedium(); }
                  if (next === 'sound') { hapticLight(); setTimeout(() => hapticLight(), 100); playChirp(); }
                  return next;
                });
              }}
              style={[
                styles.soundModeIconBtn,
                form.soundMode === 'sound' && { backgroundColor: colors.accent },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.soundModeIconText}>
                {getSoundModeIcon(form.soundMode)}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>
              {getSoundModeLabel(form.soundMode)}
            </Text>
          </View>
          {form.soundMode === 'sound' && (
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => { hapticLight(); setSystemSoundPickerVisible(true); }}
                activeOpacity={0.7}
                style={{ backgroundColor: colors.accent + '20', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.accent }} numberOfLines={1}>
                  {form.selectedSoundName || 'Default Sound'}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>Select Sound</Text>
            </View>
          )}
        </View>

        <SoundPickerModal
          visible={systemSoundPickerVisible}
          onSelect={handleSystemSoundSelect}
          onClose={() => setSystemSoundPickerVisible(false)}
          currentSoundID={form.selectedSystemSoundID}
        />
      </ScrollView>

      <EmojiPickerModal
        visible={emojiModalVisible}
        onSelect={(emoji) => form.setSelectedIcon(form.selectedIcon === emoji ? null : emoji)}
        onClose={() => setEmojiModalVisible(false)}
      />
    </View>
  );
}

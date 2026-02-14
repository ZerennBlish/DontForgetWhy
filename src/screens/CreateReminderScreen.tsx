import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import type { Reminder } from '../types/reminder';
import {
  getReminders,
  addReminder,
  updateReminder,
} from '../services/reminderStorage';
import {
  scheduleReminderNotification,
  cancelReminderNotification,
  requestPermissions,
} from '../services/notifications';
import { loadSettings } from '../services/settings';
import { getRandomPlaceholder } from '../data/placeholders';
import guessWhyIcons from '../data/guessWhyIcons';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { refreshTimerWidget } from '../widget/updateWidget';
import { hapticLight, hapticMedium } from '../utils/haptics';
import type { RootStackParamList } from '../navigation/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

type Props = NativeStackScreenProps<RootStackParamList, 'CreateReminder'>;

export default function CreateReminderScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const editId = route.params?.reminderId;

  const [existing, setExisting] = useState<Reminder | null>(null);
  const [text, setText] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('\u{1F4DD}');
  const [selectedPrivate, setSelectedPrivate] = useState(false);
  const [hasDueDate, setHasDueDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hasDueTime, setHasDueTime] = useState(false);
  const [dueHours, setDueHours] = useState('09');
  const [dueMinutes, setDueMinutes] = useState('00');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [placeholder] = useState(getRandomPlaceholder);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadSettings().then((s) => setTimeFormat(s.timeFormat));
  }, []);

  useEffect(() => {
    if (!editId) return;
    getReminders().then((reminders) => {
      const found = reminders.find((r) => r.id === editId);
      if (!found) return;
      setExisting(found);
      setText(found.text);
      setNickname(found.nickname || '');
      setSelectedIcon(found.icon);
      setSelectedPrivate(found.private);
      if (found.dueDate) {
        setHasDueDate(true);
        setSelectedDate(found.dueDate);
        const [, mo] = found.dueDate.split('-').map(Number);
        const [yr] = found.dueDate.split('-').map(Number);
        setCalMonth(mo - 1);
        setCalYear(yr);
      }
      if (found.dueTime) {
        setHasDueTime(true);
        const [h, m] = found.dueTime.split(':').map(Number);
        if (timeFormat === '12h') {
          setAmpm(h >= 12 ? 'PM' : 'AM');
          setDueHours((h % 12 || 12).toString());
        } else {
          setDueHours(h.toString().padStart(2, '0'));
        }
        setDueMinutes(m.toString().padStart(2, '0'));
      }
    });
  }, [editId, timeFormat]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calDays = getDaysInMonth(calYear, calMonth);
  const calFirstDay = getFirstDayOfMonth(calYear, calMonth);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 60 + insets.bottom,
    },
    heading: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 32,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    textInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 80,
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
    nicknameInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 24,
    },
    iconCell: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconCellActive: {
      backgroundColor: colors.activeBackground,
      borderColor: colors.accent,
    },
    iconEmoji: {
      fontSize: 22,
    },
    toggleCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    toggleDescription: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 12,
      lineHeight: 20,
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
      marginTop: 8,
      marginBottom: 16,
      fontWeight: '600',
    },
    timeContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    timeInput: {
      fontSize: 40,
      fontWeight: '700',
      color: colors.textPrimary,
      backgroundColor: colors.card,
      borderRadius: 12,
      width: 80,
      textAlign: 'center',
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeSeparator: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.accent,
      marginHorizontal: 8,
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
      backgroundColor: colors.card,
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
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
    },
    saveBtnText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  }), [colors, insets.bottom]);

  const handleCalPrev = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleCalNext = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < today.getTime()) return;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const doSave = async (dueDate: string | null, dueTime: string | null) => {
    try {
      // Only need notification permissions if a time is set (time triggers notifications)
      if (dueTime) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert('Permissions Needed', 'Enable notifications to schedule reminder nudges.');
          return;
        }
      }

      if (existing) {
        // Cancel old notification
        if (existing.notificationId) {
          await cancelReminderNotification(existing.notificationId).catch(() => {});
        }

        const updated: Reminder = {
          ...existing,
          icon: selectedIcon,
          text: text.trim(),
          nickname: nickname.trim() || undefined,
          private: selectedPrivate,
          dueDate,
          dueTime,
          notificationId: null,
        };

        // Schedule new notification if applicable
        if (dueTime && !updated.completed) {
          const notifId = await scheduleReminderNotification(updated).catch(() => null);
          updated.notificationId = notifId;
        }

        await updateReminder(updated);
      } else {
        const reminder: Reminder = {
          id: uuidv4(),
          icon: selectedIcon,
          text: text.trim(),
          nickname: nickname.trim() || undefined,
          private: selectedPrivate,
          completed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
          dueDate,
          dueTime,
          notificationId: null,
          pinned: false,
        };

        // Schedule notification if time is set (time drives notifications)
        if (dueTime) {
          const notifId = await scheduleReminderNotification(reminder).catch(() => null);
          reminder.notificationId = notifId;
        }

        await addReminder(reminder);
      }

      refreshTimerWidget();
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('AlarmList');
      }
    } catch (error: any) {
      console.error('[SAVE REMINDER ERROR]', error);
      Alert.alert('Error', 'Failed to save reminder: ' + error.message);
    }
  };

  const handleSave = async () => {
    hapticMedium();
    if (!text.trim()) {
      Alert.alert('Hold Up', 'Give this reminder some text so you know what to remember.');
      return;
    }

    // Build 24h time string (independent of date)
    let dueTime: string | null = null;
    if (hasDueTime) {
      let h: number;
      if (timeFormat === '12h') {
        let h12 = parseInt(dueHours, 10) || 12;
        h12 = Math.min(12, Math.max(1, h12));
        if (ampm === 'AM') {
          h = h12 === 12 ? 0 : h12;
        } else {
          h = h12 === 12 ? 12 : h12 + 12;
        }
      } else {
        h = Math.min(23, Math.max(0, parseInt(dueHours, 10) || 0));
      }
      const m = Math.min(59, Math.max(0, parseInt(dueMinutes, 10) || 0));
      dueTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    const dueDate = hasDueDate ? selectedDate : null;

    // Warn if combined date+time is in the past
    if (dueTime && dueDate) {
      const [py, pm, pd] = dueDate.split('-').map(Number);
      const [ph, pmin] = dueTime.split(':').map(Number);
      const combined = new Date(py, pm - 1, pd, ph, pmin, 0, 0);
      if (combined.getTime() <= Date.now()) {
        Alert.alert(
          'Time Already Passed',
          'The selected date and time are in the past. Save anyway?',
          [
            { text: 'Change Time', style: 'cancel' },
            { text: 'Save Anyway', onPress: () => doSave(dueDate, dueTime) },
          ],
        );
        return;
      }
    }

    await doSave(dueDate, dueTime);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>
        {existing ? 'Edit Reminder' : 'New Reminder'}
      </Text>

      <Text style={styles.label}>What do you need to remember?</Text>
      <TextInput
        style={styles.textInput}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={200}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{text.length}/200</Text>

      <Text style={styles.label}>Nickname (optional, for privacy)</Text>
      <TextInput
        style={styles.nicknameInput}
        value={nickname}
        onChangeText={setNickname}
        placeholder="e.g. Important thing, Weekly task"
        placeholderTextColor={colors.textTertiary}
        maxLength={40}
      />

      <Text style={styles.label}>What's it for?</Text>
      <View style={styles.iconGrid}>
        {guessWhyIcons.map((icon) => (
          <TouchableOpacity
            key={icon.id}
            style={[
              styles.iconCell,
              selectedIcon === icon.emoji && styles.iconCellActive,
            ]}
            onPress={() => { hapticLight(); setSelectedIcon(selectedIcon === icon.emoji ? '' : icon.emoji); }}
            activeOpacity={0.7}
          >
            <Text style={styles.iconEmoji}>{icon.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Private</Text>
          <Switch
            value={selectedPrivate}
            onValueChange={(v) => { hapticLight(); setSelectedPrivate(v); }}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={selectedPrivate ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={styles.toggleDescription}>
          Hides details on the reminder card and widget.
        </Text>
      </View>

      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Due Time</Text>
          <Switch
            value={hasDueTime}
            onValueChange={(v) => { hapticLight(); setHasDueTime(v); }}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={hasDueTime ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={styles.toggleDescription}>
          {hasDueTime
            ? 'You\'ll get a notification at this time.'
            : 'No time set \u2014 no notification.'}
        </Text>
      </View>

      {hasDueTime && (
        <View style={styles.timeContainer}>
          <TextInput
            style={styles.timeInput}
            value={dueHours}
            onChangeText={(t) => setDueHours(t.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={styles.timeSeparator}>:</Text>
          <TextInput
            style={styles.timeInput}
            value={dueMinutes}
            onChangeText={(t) => setDueMinutes(t.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholderTextColor={colors.textTertiary}
          />
          {timeFormat === '12h' && (
            <View style={styles.ampmContainer}>
              <TouchableOpacity
                style={[styles.ampmBtn, ampm === 'AM' && styles.ampmBtnActive]}
                onPress={() => setAmpm('AM')}
                activeOpacity={0.7}
              >
                <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ampmBtn, ampm === 'PM' && styles.ampmBtnActive]}
                onPress={() => setAmpm('PM')}
                activeOpacity={0.7}
              >
                <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Due Date</Text>
          <Switch
            value={hasDueDate}
            onValueChange={(v) => {
              hapticLight();
              setHasDueDate(v);
              if (!v) setSelectedDate(null);
            }}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={hasDueDate ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={styles.toggleDescription}>
          Set a date for this reminder.
        </Text>
      </View>

      {hasDueDate && (
        <>
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={handleCalPrev} style={styles.calNav}>
              <Text style={styles.calNavText}>{'\u2039'}</Text>
            </TouchableOpacity>
            <Text style={styles.calTitle}>{MONTH_NAMES[calMonth]} {calYear}</Text>
            <TouchableOpacity onPress={handleCalNext} style={styles.calNav}>
              <Text style={styles.calNavText}>{'\u203A'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calWeekRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <Text key={i} style={styles.calWeekDay}>{d}</Text>
            ))}
          </View>
          <View style={styles.calGrid}>
            {Array.from({ length: calFirstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.calCell} />
            ))}
            {Array.from({ length: calDays }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(calYear, calMonth, day);
              dateObj.setHours(0, 0, 0, 0);
              const isPast = dateObj.getTime() < today.getTime();
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              return (
                <View key={day} style={styles.calCell}>
                  <TouchableOpacity
                    style={[styles.calDay, isSelected && styles.calDaySelected]}
                    onPress={() => handleSelectDate(day)}
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
          {selectedDate && (
            <Text style={styles.selectedDateText}>{formatDateDisplay(selectedDate)}</Text>
          )}
        </>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.saveBtnText}>
          {existing ? 'Update Reminder' : 'Save Reminder'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

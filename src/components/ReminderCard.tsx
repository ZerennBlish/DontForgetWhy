import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import type { Reminder, CompletionEntry } from '../types/reminder';
import { hasCompletedToday } from '../services/reminderStorage';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import APP_ICONS from '../data/appIconAssets';
import SwipeableRow from './SwipeableRow';
import { formatTime } from '../utils/time';

interface ReminderCardProps {
  reminder: Reminder;
  pinned: boolean;
  timeFormat: '12h' | '24h';
  reminderFilter: string;
  onToggleComplete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  onClearHistory: (id: string) => void;
  onPress: (id: string) => void;
  isOverdue: (dateStr: string) => boolean;
  formatDueDate: (dateStr: string) => string;
}

function formatCompletionDates(history: CompletionEntry[]): string {
  if (!history || history.length === 0) return '';
  return history
    .map((entry) => {
      const d = new Date(entry.completedAt);
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = d.getDate();
      return `${month} ${day}`;
    })
    .join(', ');
}

function ReminderCard({
  reminder,
  pinned,
  timeFormat,
  reminderFilter,
  onToggleComplete,
  onTogglePin,
  onDelete,
  onClearHistory,
  onPress,
  isOverdue,
  formatDueDate,
}: ReminderCardProps) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.sectionReminder + '15',
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.sectionReminder,
      borderLeftWidth: 3,
      borderLeftColor: colors.sectionReminder,
      marginBottom: 8,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    cardCompleted: {
      opacity: 0.45,
    },
    checkbox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.textTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    checkboxDone: {
      backgroundColor: colors.sectionReminder,
      borderColor: colors.sectionReminder,
    },
    middle: {
      flex: 1,
      marginRight: 12,
    },
    reminderText: {
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
    },
    reminderTextDone: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
    privateText: {
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
      fontStyle: 'italic',
    },
    reminderSecondaryText: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      marginTop: 2,
    },
    dueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 6,
    },
    dueText: {
      fontSize: 12,
      color: colors.textTertiary,
      fontFamily: FONTS.regular,
    },
    dueOverdue: {
      color: colors.red,
      fontFamily: FONTS.semiBold,
    },
    pinDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
      marginLeft: 6,
    },
    right: {
      alignItems: 'center',
      gap: 6,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 6,
    },
    pinBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    pinBtnActive: {
      borderColor: colors.accent,
    },
    pinBtnText: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    clearBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    clearHistoryText: {
      fontSize: 12,
      fontFamily: FONTS.semiBold,
      color: colors.red,
    },
    historyText: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      fontFamily: FONTS.regular,
    },
  }), [colors]);

  const displayPrimary = reminder.private
    ? (reminder.nickname || 'Private')
    : reminder.nickname
      ? `${reminder.icon} ${reminder.nickname}`
      : reminder.text ? `${reminder.icon} ${reminder.text}` : reminder.icon;

  const displaySecondary = !reminder.private && reminder.nickname && reminder.text
    ? reminder.text
    : null;

  const isRecurringInCompleted = reminderFilter === 'completed' && reminder.recurring && !reminder.completed;

  const handleDeletePress = () => {
    if (isRecurringInCompleted) {
      Alert.alert('Clear completion history?', 'The reminder stays active.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => onClearHistory(reminder.id) },
      ]);
    } else {
      Alert.alert('Delete this reminder?', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(reminder.id) },
      ]);
    }
  };

  return (
    <SwipeableRow onDelete={() => onDelete(reminder.id)} enabled={!reminder.deletedAt && !isRecurringInCompleted}>
      <View style={[styles.card, reminder.completed && styles.cardCompleted]}>
        <TouchableOpacity
          style={[styles.checkbox, (reminder.completed || (reminder.recurring && hasCompletedToday(reminder))) && styles.checkboxDone]}
          onPress={() => onToggleComplete(reminder.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={(reminder.completed || (reminder.recurring && hasCompletedToday(reminder))) ? 'Mark incomplete' : 'Mark complete'}
        >
          {(reminder.completed || (reminder.recurring && hasCompletedToday(reminder))) && (
            <Image source={APP_ICONS.checkmark} style={{ width: 16, height: 16 }} resizeMode="contain" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.middle}
          onPress={() => { hapticLight(); onPress(reminder.id); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={displayPrimary}
          accessibilityHint="Tap to edit"
        >
          <Text
            style={[
              reminder.private ? styles.privateText : styles.reminderText,
              reminder.completed && styles.reminderTextDone,
            ]}
            numberOfLines={2}
          >
            {displayPrimary}
          </Text>
          {displaySecondary && !reminder.completed && (
            <Text style={styles.reminderSecondaryText} numberOfLines={2}>
              {displaySecondary}
            </Text>
          )}
          {!reminder.completed && (reminder.dueDate || reminder.dueTime) && (
            <View style={styles.dueRow}>
              <Text style={[
                styles.dueText,
                reminder.dueDate && isOverdue(reminder.dueDate) && styles.dueOverdue,
              ]}>
                {reminder.dueDate && isOverdue(reminder.dueDate) ? 'Overdue \u2022 ' : ''}
                {reminder.dueDate ? formatDueDate(reminder.dueDate) : ''}
                {reminder.dueDate && reminder.dueTime ? ' at ' : ''}
                {reminder.dueTime ? formatTime(reminder.dueTime, timeFormat) : ''}
                {reminder.recurring ? (
                  reminder.days && reminder.days.length > 0 && reminder.days.length < 7
                    ? ` \u2022 Weekly`
                    : reminder.days && reminder.days.length === 7
                      ? ` \u2022 Daily`
                      : ` \u2022 Yearly`
                ) : ''}
              </Text>
              {pinned && <View style={styles.pinDot} />}
            </View>
          )}
          {isRecurringInCompleted && reminder.completionHistory && reminder.completionHistory.length > 0 && (
            <Text style={styles.historyText} numberOfLines={2}>
              {formatCompletionDates(reminder.completionHistory)}
            </Text>
          )}
          {(reminder.completed || (!reminder.dueDate && !reminder.dueTime && !isRecurringInCompleted)) && pinned && (
            <View style={styles.dueRow}>
              <View style={styles.pinDot} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.right}>
          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={() => onTogglePin(reminder.id)}
              style={[styles.pinBtn, pinned && styles.pinBtnActive]}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={pinned ? 'Unpin from widget' : 'Pin to widget'}
            >
              <Text style={[styles.pinBtnText, pinned && { color: colors.accent }]}>
                {pinned ? 'Pinned' : 'Pin'}
              </Text>
            </TouchableOpacity>
            {isRecurringInCompleted && (
              <TouchableOpacity
                onPress={handleDeletePress}
                style={styles.clearBtn}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="Clear completion history"
              >
                <Text style={styles.clearHistoryText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SwipeableRow>
  );
}

export default React.memo(ReminderCard);

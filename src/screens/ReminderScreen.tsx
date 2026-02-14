import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ToastAndroid,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Reminder } from '../types/reminder';
import {
  getReminders,
  deleteReminder,
  toggleReminderComplete,
} from '../services/reminderStorage';
import { cancelReminderNotification, scheduleReminderNotification } from '../services/notifications';
import {
  getPinnedReminders,
  togglePinReminder,
  isReminderPinned,
  unpinReminder,
  pruneReminderPins,
} from '../services/widgetPins';
import { refreshTimerWidget } from '../widget/updateWidget';
import { loadSettings } from '../services/settings';
import { formatTime } from '../utils/time';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReminderScreenProps {
  onNavigateCreate: (reminderId?: string) => void;
}

function formatDueDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ReminderScreen({ onNavigateCreate }: ReminderScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');

  const loadData = useCallback(async () => {
    const [loaded, settings] = await Promise.all([
      getReminders(),
      loadSettings(),
    ]);
    setReminders(loaded);
    setTimeFormat(settings.timeFormat);
    const pruned = await pruneReminderPins(loaded.map((r) => r.id));
    setPinnedIds(pruned);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleToggleComplete = async (id: string) => {
    const updated = await toggleReminderComplete(id);
    if (!updated) return;
    if (updated.completed && updated.notificationId) {
      await cancelReminderNotification(updated.notificationId).catch(() => {});
    } else if (!updated.completed && updated.dueTime) {
      // Un-completing: reschedule notification if time is in future
      const notifId = await scheduleReminderNotification(updated).catch(() => null);
      if (notifId) {
        const { updateReminder } = await import('../services/reminderStorage');
        await updateReminder({ ...updated, notificationId: notifId });
      }
    }
    await loadData();
    refreshTimerWidget();
  };

  const handleDelete = (id: string) => {
    const reminder = reminders.find((r) => r.id === id);
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (reminder?.notificationId) {
            await cancelReminderNotification(reminder.notificationId).catch(() => {});
          }
          await unpinReminder(id);
          await deleteReminder(id);
          await loadData();
          refreshTimerWidget();
        },
      },
    ]);
  };

  const handleTogglePin = async (id: string) => {
    const currentlyPinned = isReminderPinned(id, pinnedIds);
    if (!currentlyPinned && pinnedIds.length >= 3) {
      ToastAndroid.show('Widget full \u2014 unpin one first', ToastAndroid.SHORT);
      return;
    }
    const newState = await togglePinReminder(id);
    const updated = await getPinnedReminders();
    setPinnedIds(updated);
    refreshTimerWidget();
    ToastAndroid.show(
      newState ? 'Pinned to widget' : 'Unpinned from widget',
      ToastAndroid.SHORT,
    );
  };

  // Sort: incomplete first (by createdAt desc), then completed (by completedAt desc)
  const sorted = useMemo(() => {
    const incomplete = reminders
      .filter((r) => !r.completed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const complete = reminders
      .filter((r) => r.completed)
      .sort((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bTime - aTime;
      });
    return [...incomplete, ...complete];
  }, [reminders]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 100 + insets.bottom,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 80 + insets.bottom,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardCompleted: {
      opacity: 0.5,
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
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkmark: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    middle: {
      flex: 1,
      marginRight: 12,
    },
    reminderText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    reminderTextDone: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
    privateText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textTertiary,
      fontStyle: 'italic',
    },
    dueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 6,
    },
    dueText: {
      fontSize: 13,
      color: colors.textTertiary,
    },
    dueOverdue: {
      color: colors.red,
      fontWeight: '600',
    },
    pinIcon: {
      fontSize: 12,
      color: colors.accent,
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
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    pinBtnActive: {
      backgroundColor: colors.activeBackground,
    },
    pinBtnText: {
      fontSize: 13,
    },
    editBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.activeBackground,
    },
    editText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    deleteBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    deleteText: {
      color: colors.red,
      fontSize: 13,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      bottom: 36 + insets.bottom,
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    fabText: {
      fontSize: 32,
      color: colors.textPrimary,
      fontWeight: '300',
      marginTop: -2,
    },
  }), [colors, insets.bottom]);

  const isOverdue = (dateStr: string): boolean => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    due.setHours(23, 59, 59, 999);
    return due.getTime() < Date.now();
  };

  const renderItem = ({ item }: { item: Reminder }) => {
    const pinned = isReminderPinned(item.id, pinnedIds);
    const displayText = item.private
      ? (item.nickname || '\u{1F512} Private')
      : `${item.icon} ${item.text}`;

    return (
      <View style={[styles.card, item.completed && styles.cardCompleted]}>
        <TouchableOpacity
          style={[styles.checkbox, item.completed && styles.checkboxDone]}
          onPress={() => handleToggleComplete(item.id)}
          activeOpacity={0.7}
        >
          {item.completed && <Text style={styles.checkmark}>{'\u2713'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.middle}
          onPress={() => onNavigateCreate(item.id)}
          onLongPress={() => handleDelete(item.id)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              item.private ? styles.privateText : styles.reminderText,
              item.completed && styles.reminderTextDone,
            ]}
            numberOfLines={2}
          >
            {displayText}
          </Text>
          {!item.completed && (item.dueDate || item.dueTime) && (
            <View style={styles.dueRow}>
              <Text style={[
                styles.dueText,
                item.dueDate && isOverdue(item.dueDate) && styles.dueOverdue,
              ]}>
                {item.dueDate && isOverdue(item.dueDate) ? 'Overdue \u2022 ' : ''}
                {item.dueDate ? formatDueDate(item.dueDate) : ''}
                {item.dueDate && item.dueTime ? ' at ' : ''}
                {item.dueTime ? formatTime(item.dueTime, timeFormat) : ''}
              </Text>
              {pinned && <Text style={styles.pinIcon}>{'\u{1F4CC}'}</Text>}
            </View>
          )}
          {(item.completed || (!item.dueDate && !item.dueTime)) && pinned && (
            <View style={styles.dueRow}>
              <Text style={styles.pinIcon}>{'\u{1F4CC}'}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.right}>
          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={() => handleTogglePin(item.id)}
              style={[styles.pinBtn, pinned && styles.pinBtnActive]}
              activeOpacity={0.6}
            >
              <Text style={[styles.pinBtnText, { opacity: pinned ? 1 : 0.3 }]}>
                {'\u{1F4CC}'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onNavigateCreate(item.id)}
              style={styles.editBtn}
            >
              <Text style={styles.editText}>{'\u270F\uFE0F'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'\u{1F4DD}'}</Text>
          <Text style={styles.emptyText}>Nothing to remember</Text>
          <Text style={styles.emptySubtext}>
            Must be nice. Tap + to ruin that.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => onNavigateCreate()}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

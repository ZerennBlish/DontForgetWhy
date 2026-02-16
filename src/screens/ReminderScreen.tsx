import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Reminder } from '../types/reminder';
import {
  getReminders,
  deleteReminder,
  toggleReminderComplete,
  restoreReminder,
  permanentlyDeleteReminder,
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
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import SwipeableRow from '../components/SwipeableRow';
import UndoToast from '../components/UndoToast';

interface ReminderScreenProps {
  onNavigateCreate: (reminderId?: string) => void;
  onReminderCountChange?: (count: number) => void;
}

function formatDeletedAgo(deletedAt: string): string {
  const ms = Date.now() - new Date(deletedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return 'Deleted today';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 1) return 'Deleted yesterday';
  if (days < 30) return `Deleted ${days} days ago`;
  return `Deleted ${Math.floor(days / 30)}mo ago`;
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

export default function ReminderScreen({ onNavigateCreate, onReminderCountChange }: ReminderScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [reminderSort, setReminderSort] = useState<'due' | 'created' | 'name'>('due');
  const [reminderFilter, setReminderFilter] = useState<'active' | 'completed' | 'has-date' | 'deleted'>('active');
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [deletedReminder, setDeletedReminder] = useState<Reminder | null>(null);
  const [deletedReminderPinned, setDeletedReminderPinned] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoKey, setUndoKey] = useState(0);

  const loadData = useCallback(async () => {
    const [loaded, settings] = await Promise.all([
      getReminders(true),
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

  // Propagate active reminder count to parent on every change
  useEffect(() => {
    if (onReminderCountChange) {
      onReminderCountChange(reminders.filter((r) => !r.completed && !r.deletedAt).length);
    }
  }, [reminders, onReminderCountChange]);

  const handleToggleComplete = async (id: string) => {
    hapticMedium();
    const updated = await toggleReminderComplete(id);
    if (!updated) return;
    if (updated.completed && updated.notificationId) {
      await cancelReminderNotification(updated.notificationId).catch(() => {});
    } else if (!updated.completed && updated.dueTime) {
      const notifId = await scheduleReminderNotification(updated).catch(() => null);
      if (notifId) {
        const { updateReminder } = await import('../services/reminderStorage');
        await updateReminder({ ...updated, notificationId: notifId });
      }
    }
    await loadData();
    refreshTimerWidget();
  };

  const handleSwipeComplete = async (id: string) => {
    hapticMedium();
    try {
      const updated = await toggleReminderComplete(id);
      if (!updated) return;
      if (updated.completed && updated.notificationId) {
        await cancelReminderNotification(updated.notificationId).catch(() => {});
      } else if (!updated.completed && updated.dueTime) {
        const notifId = await scheduleReminderNotification(updated).catch(() => null);
        if (notifId) {
          const { updateReminder } = await import('../services/reminderStorage');
          await updateReminder({ ...updated, notificationId: notifId });
        }
      }
      refreshTimerWidget();
      await loadData();
    } catch (e) {
      console.error('[SWIPE COMPLETE]', e);
    }
  };

  const handleDelete = async (id: string) => {
    hapticHeavy();
    const reminder = reminders.find((r) => r.id === id);
    if (!reminder) return;
    const wasPinned = isReminderPinned(id, pinnedIds);
    setDeletedReminder(reminder);
    setDeletedReminderPinned(wasPinned);
    await unpinReminder(id);
    await deleteReminder(id);
    await loadData();
    refreshTimerWidget();
    setUndoKey((k) => k + 1);
    setShowUndo(true);
  };

  const handleUndoDelete = async () => {
    setShowUndo(false);
    if (!deletedReminder) return;
    await restoreReminder(deletedReminder.id);
    if (deletedReminderPinned) {
      await togglePinReminder(deletedReminder.id);
    }
    await loadData();
    refreshTimerWidget();
    setDeletedReminder(null);
  };

  const handleUndoDismiss = () => {
    setShowUndo(false);
    setDeletedReminder(null);
  };

  const handleRestore = async (id: string) => {
    await restoreReminder(id);
    await loadData();
    refreshTimerWidget();
  };

  const handlePermanentDelete = async (id: string) => {
    await permanentlyDeleteReminder(id);
    await loadData();
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

  const sorted = useMemo(() => {
    let list = reminders;

    if (reminderFilter === 'deleted') {
      list = list.filter((r) => !!r.deletedAt);
      list = [...list].sort((a, b) =>
        new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
      );
      return list;
    }

    // Exclude deleted for all non-deleted filters
    list = list.filter((r) => !r.deletedAt);

    // Filter
    if (reminderFilter === 'active') list = list.filter((r) => !r.completed);
    else if (reminderFilter === 'completed') list = list.filter((r) => r.completed);
    else if (reminderFilter === 'has-date') list = list.filter((r) => r.dueDate !== null);

    // Sort
    if (reminderSort === 'due') {
      const getSortableDateTime = (r: Reminder): number => {
        const now = new Date();
        if (r.dueDate && r.dueTime) {
          const [y, m, d] = r.dueDate.split('-').map(Number);
          const [h, min] = r.dueTime.split(':').map(Number);
          return new Date(y, m - 1, d, h, min, 0, 0).getTime();
        }
        if (r.dueDate) {
          const [y, m, d] = r.dueDate.split('-').map(Number);
          return new Date(y, m - 1, d, 23, 59, 0, 0).getTime();
        }
        if (r.dueTime) {
          const [h, min] = r.dueTime.split(':').map(Number);
          const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min, 0, 0);
          if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
          }
          return target.getTime();
        }
        return Infinity;
      };
      const withDue = list.filter((r) => r.dueDate || r.dueTime).sort(
        (a, b) => getSortableDateTime(a) - getSortableDateTime(b),
      );
      const noDue = list.filter((r) => !r.dueDate && !r.dueTime).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      list = [...withDue, ...noDue];
    } else if (reminderSort === 'name') {
      list = [...list].sort((a, b) =>
        a.text.toLowerCase().localeCompare(b.text.toLowerCase())
      );
    } else {
      list = [...list].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [reminders, reminderSort, reminderFilter]);

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
      width: 90,
      height: 90,
      opacity: 0.35,
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
    sortFilterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 6,
      gap: 6,
      flexWrap: 'wrap',
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    pillTextActive: {
      color: colors.textPrimary,
    },
    sortFilterLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 2,
    },
    sortFilterToggleRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 2,
    },
    sortFilterToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
    },
    sortFilterToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    sortFilterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    deletedAgo: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    restoreBtn: {
      backgroundColor: colors.activeBackground,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    restoreText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    foreverBtn: {
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    foreverText: {
      color: colors.red,
      fontSize: 13,
      fontWeight: '600',
    },
  }), [colors, insets.bottom]);

  const isOverdue = (dateStr: string): boolean => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    due.setHours(23, 59, 59, 999);
    return due.getTime() < Date.now();
  };

  const renderItem = ({ item }: { item: Reminder }) => {
    if (item.deletedAt) {
      const deletedDisplayText = item.private
        ? (item.nickname || '\u{1F512} Private')
        : item.text ? `${item.icon} ${item.text}` : item.icon;
      return (
        <View style={[styles.card, { opacity: 0.7 }]}>
          <View style={styles.middle}>
            <Text style={[styles.reminderText, { color: colors.textTertiary }]} numberOfLines={2}>
              {deletedDisplayText}
            </Text>
            <Text style={styles.deletedAgo}>
              {formatDeletedAgo(item.deletedAt)}
            </Text>
          </View>
          <View style={styles.right}>
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={() => handleRestore(item.id)} style={styles.restoreBtn} activeOpacity={0.7}>
                <Text style={styles.restoreText}>Restore</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handlePermanentDelete(item.id)} style={styles.foreverBtn} activeOpacity={0.7}>
                <Text style={styles.foreverText}>Forever</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    const pinned = isReminderPinned(item.id, pinnedIds);
    const displayText = item.private
      ? (item.nickname || '\u{1F512} Private')
      : item.text ? `${item.icon} ${item.text}` : item.icon;

    return (
      <SwipeableRow
        onSwipeLeft={() => handleDelete(item.id)}
        onSwipeRightAnimateOut={() => handleSwipeComplete(item.id)}
        leftColor="#1A2E1A"
        leftIcon={'\u2705'}
        leftIconColor="#B0B0CC"
        rightColor="#2E1A1A"
        rightIcon={'\u{1F5D1}'}
        rightIconColor="#B0B0CC"
      >
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
      </SwipeableRow>
    );
  };

  return (
    <View style={styles.container}>
      {reminders.length === 0 ? (
        <View style={styles.empty}>
          <Image source={require('../../assets/icon.png')} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Nothing to remember</Text>
          <Text style={styles.emptySubtext}>
            Must be nice. Tap + to ruin that.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.sortFilterToggleRow}>
            <TouchableOpacity
              style={styles.sortFilterToggleBtn}
              onPress={() => { hapticLight(); setShowSortFilter((prev) => !prev); }}
              activeOpacity={0.7}
            >
              {(reminderSort !== 'due' || reminderFilter !== 'active') && <View style={styles.sortFilterDot} />}
              <Text style={styles.sortFilterToggleText}>
                Sort & Filter {showSortFilter ? '\u25B4' : '\u25BE'}
              </Text>
            </TouchableOpacity>
          </View>

          {showSortFilter && (
            <>
              <Text style={styles.sortFilterLabel}>Sort</Text>
              <View style={styles.sortFilterRow}>
                {(['due', 'created', 'name'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pill, reminderSort === s && styles.pillActive]}
                    onPress={() => { hapticLight(); setReminderSort(s); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, reminderSort === s && styles.pillTextActive]}>
                      {s === 'due' ? 'Due Date' : s === 'created' ? 'Created' : 'Name'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sortFilterLabel}>Filter</Text>
              <View style={styles.sortFilterRow}>
                {(['active', 'completed', 'has-date', 'deleted'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.pill, reminderFilter === f && styles.pillActive]}
                    onPress={() => { hapticLight(); setReminderFilter(f); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, reminderFilter === f && styles.pillTextActive]}>
                      {f === 'active' ? 'Active' : f === 'completed' ? 'Completed' : f === 'has-date' ? 'Has Date' : 'Deleted'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'\u{1F50D}'}</Text>
              <Text style={styles.emptyText}>No matches</Text>
              <Text style={styles.emptySubtext}>Try a different filter.</Text>
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
        </>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => onNavigateCreate()}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <UndoToast
        key={undoKey}
        visible={showUndo}
        message="Reminder deleted"
        onUndo={handleUndoDelete}
        onDismiss={handleUndoDismiss}
      />
    </View>
  );
}

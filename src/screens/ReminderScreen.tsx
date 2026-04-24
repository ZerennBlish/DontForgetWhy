import React, { useState, useCallback, useMemo } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Reminder } from '../types/reminder';
import {
  getReminders,
  deleteReminder,
  toggleReminderComplete,
  completeRecurringReminder,
  getNextCycleTimestamp,
  hasCompletedToday,
  clearCompletionHistory,
  updateReminder,
  restoreReminder,
  permanentlyDeleteReminder,
} from '../services/reminderStorage';
import { cancelReminderNotification, cancelReminderNotifications, scheduleReminderNotification } from '../services/notifications';
import {
  getPinnedReminders,
  togglePinReminder,
  isReminderPinned,
  unpinReminder,
  pruneReminderPins,
} from '../services/widgetPins';
import { refreshWidgets } from '../widget/updateWidget';
import { loadSettings } from '../services/settings';
import { useAppIcon } from '../hooks/useAppIcon';
import { getRandomReminderQuote } from '../data/reminderQuotes';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import UndoToast from '../components/UndoToast';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import ReminderCard from '../components/ReminderCard';
import DeletedReminderCard from '../components/DeletedReminderCard';
import TutorialOverlay from '../components/TutorialOverlay';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { useTutorial } from '../hooks/useTutorial';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reminders'>;

const SIX_HOURS = 6 * 60 * 60 * 1000;

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

function isDoneEnabled(reminder: Reminder): boolean {
  if (!reminder.recurring) return true;
  if (!reminder.dueTime) {
    // Date-only yearly: only completable on due date or the day before
    if (reminder.dueDate && (!reminder.days || reminder.days.length === 0)) {
      const [y, mo, d] = reminder.dueDate.split('-').map(Number);
      const dueDay = new Date(y, mo - 1, d);
      dueDay.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffMs = dueDay.getTime() - now.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      return Math.abs(diffDays) <= 1;
    }
    return true;
  }
  if (hasCompletedToday(reminder)) return false;
  const cycleTs = getNextCycleTimestamp(reminder);
  if (cycleTs === null) return true;
  return Date.now() >= cycleTs - SIX_HOURS;
}


export default function ReminderScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const tutorial = useTutorial('reminders');
  const insets = useSafeAreaInsets();

  const bellIcon = useAppIcon('bell');
  const plusIcon = useAppIcon('plus');
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
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [appQuote, setAppQuote] = useState(getRandomReminderQuote);

  const loadData = useCallback(async () => {
    const [loaded, settings] = await Promise.all([
      getReminders(true),
      loadSettings(),
    ]);
    setReminders(loaded);
    setTimeFormat(settings.timeFormat);
    const pruned = await pruneReminderPins(loaded.map((r) => r.id));
    setPinnedIds(pruned);
    loadBackground().then(setBgUri);
    getOverlayOpacity().then(setBgOpacity);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setAppQuote(getRandomReminderQuote());
      loadData();
    }, [loadData]),
  );

  const handleToggleComplete = async (id: string) => {
    hapticMedium();
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    // Recurring: reschedule for next occurrence, keep active
    if (reminder.recurring) {
      if (hasCompletedToday(reminder)) {
        ToastAndroid.show('Already completed today', ToastAndroid.SHORT);
        return;
      }
      if (!isDoneEnabled(reminder)) {
        ToastAndroid.show('Not available yet', ToastAndroid.SHORT);
        return;
      }
      await completeRecurringReminder(id);
      await loadData();
      refreshWidgets();
      ToastAndroid.show('Rescheduled', ToastAndroid.SHORT);
      return;
    }

    // One-time: toggle completed state
    const updated = await toggleReminderComplete(id);
    if (!updated) return;
    if (updated.completed) {
      if (reminder.notificationIds?.length) {
        await cancelReminderNotifications(reminder.notificationIds).catch(() => {});
      } else if (reminder.notificationId) {
        await cancelReminderNotification(reminder.notificationId).catch(() => {});
      }
    } else if (!updated.completed && updated.dueTime) {
      const notifIds = await scheduleReminderNotification(updated).catch(() => [] as string[]);
      if (notifIds.length > 0) {
        await updateReminder({ ...updated, notificationId: notifIds[0] || null, notificationIds: notifIds });
      }
    }
    await loadData();
    refreshWidgets();
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
    refreshWidgets();
    setUndoKey((k) => k + 1);
    setShowUndo(true);
  };

  const handleClearHistory = async (id: string) => {
    hapticMedium();
    await clearCompletionHistory(id);
    await loadData();
    ToastAndroid.show('History cleared', ToastAndroid.SHORT);
  };

  const handleUndoDelete = async () => {
    setShowUndo(false);
    if (!deletedReminder) return;
    await restoreReminder(deletedReminder.id);
    if (deletedReminderPinned) {
      await togglePinReminder(deletedReminder.id);
    }
    await loadData();
    refreshWidgets();
    setDeletedReminder(null);
  };

  const handleUndoDismiss = () => {
    setShowUndo(false);
    setDeletedReminder(null);
  };

  const handleRestore = async (id: string) => {
    hapticLight();
    await restoreReminder(id);
    await loadData();
    refreshWidgets();
  };

  const handlePermanentDelete = async (id: string) => {
    hapticHeavy();
    await permanentlyDeleteReminder(id);
    await loadData();
  };

  const handleTogglePin = async (id: string) => {
    hapticLight();
    const currentlyPinned = isReminderPinned(id, pinnedIds);
    if (!currentlyPinned && pinnedIds.length >= 3) {
      ToastAndroid.show('Widget full \u2014 unpin one first', ToastAndroid.SHORT);
      return;
    }
    const newState = await togglePinReminder(id);
    const updated = await getPinnedReminders();
    setPinnedIds(updated);
    refreshWidgets();
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
    if (reminderFilter === 'active') list = list.filter((r) => {
      if (!r.completed) return true;
      // Completed one-time reminders: show until 12am the day after completion
      if (r.completed && !r.recurring && r.completedAt) {
        const completedDate = new Date(r.completedAt);
        const hideAfter = new Date(completedDate);
        hideAfter.setDate(hideAfter.getDate() + 1);
        hideAfter.setHours(0, 0, 0, 0);
        return Date.now() < hideAfter.getTime();
      }
      return false;
    });
    else if (reminderFilter === 'completed') list = list.filter((r) =>
      r.completed || (r.recurring && r.completionHistory && r.completionHistory.length > 0)
    );
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
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top + 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
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
    screenTitle: {
      fontSize: 20,
      color: colors.textPrimary,
      marginBottom: 8,
      fontFamily: FONTS.extraBold,
    },
    subtitleText: {
      fontSize: 12,
      color: colors.textTertiary,
      paddingHorizontal: 2,
      fontFamily: FONTS.regular,
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
    emptyText: {
      fontSize: 18,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 6,
      fontFamily: FONTS.regular,
    },
    quoteText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
      opacity: 0.7,
      textAlign: 'center',
      paddingHorizontal: 20,
      marginBottom: 4,
      fontFamily: FONTS.regular,
    },
    fab: {
      position: 'absolute',
      bottom: 36 + insets.bottom,
      right: 24,
      width: 56,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
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
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    pillTextActive: {
      color: colors.textPrimary,
    },
    sortFilterLabel: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
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
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    sortFilterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
  }), [colors, insets.bottom]);

  const isOverdue = useCallback((dateStr: string): boolean => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    due.setHours(23, 59, 59, 999);
    return due.getTime() < Date.now();
  }, []);

  const keyExtractor = useCallback((item: Reminder) => item.id, []);

  const renderItem = useCallback(({ item }: { item: Reminder }) => {
    if (item.deletedAt) {
      return (
        <DeletedReminderCard
          reminder={item}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          formatDeletedAgo={formatDeletedAgo}
        />
      );
    }
    return (
      <ReminderCard
        reminder={item}
        pinned={isReminderPinned(item.id, pinnedIds)}
        timeFormat={timeFormat}
        reminderFilter={reminderFilter}
        onToggleComplete={handleToggleComplete}
        onTogglePin={handleTogglePin}
        onDelete={handleDelete}
        onClearHistory={handleClearHistory}
        onPress={(id) => navigation.navigate('CreateReminder', { reminderId: id })}
        isOverdue={isOverdue}
        formatDueDate={formatDueDate}
      />
    );
  }, [pinnedIds, reminderFilter, timeFormat, handleRestore, handlePermanentDelete, handleDelete, handleClearHistory, handleToggleComplete, handleTogglePin, isOverdue, navigation]);

  const nonDeletedReminderCount = reminders.filter(r => !r.deletedAt).length;

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bgUri ? (
          <>
            <Image source={{ uri: bgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBgUri(null)} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${bgOpacity})` }]} />
          </>
        ) : (
          <Image
            source={require('../../assets/fullscreenicon.webp')}
            style={{ width: '100%', height: '100%', opacity: colors.watermarkOpacity }}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={styles.header}>
        <View style={styles.headerBack}>
          <BackButton onPress={() => navigation.goBack()} forceDark={!!bgUri} />
        </View>
        <View style={styles.headerHome}>
          <HomeButton forceDark={!!bgUri} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Image source={bellIcon} style={{ width: 36, height: 36, marginBottom: 2 }} resizeMode="contain" />
          <Text style={[styles.screenTitle, bgUri && { color: colors.overlayText }]}>Reminders</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={[styles.subtitleText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
          {(() => { const c = reminders.filter(r => !r.completed && !r.deletedAt).length; return `${c} reminder${c !== 1 ? 's' : ''}`; })()}
        </Text>
      </View>
      <View style={styles.sortFilterToggleRow}>
        <TouchableOpacity
          style={styles.sortFilterToggleBtn}
          onPress={() => {
            hapticLight();
            setShowSortFilter((prev) => {
              if (prev) { setReminderFilter('active'); }
              return !prev;
            });
          }}
          activeOpacity={0.7}
          accessibilityLabel={`Sort and Filter${showSortFilter ? ', expanded' : ''}`}
          accessibilityRole="button"
        >
          {(reminderSort !== 'due' || reminderFilter !== 'active') && <View style={styles.sortFilterDot} />}
          <Text style={[styles.sortFilterToggleText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
            Sort & Filter {showSortFilter ? '\u25B4' : '\u25BE'}
          </Text>
        </TouchableOpacity>
      </View>

      {showSortFilter && (
        <>
          <Text style={[styles.sortFilterLabel, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>Sort</Text>
          <View style={styles.sortFilterRow}>
            {(['due', 'created', 'name'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pill, reminderSort === s && styles.pillActive]}
                onPress={() => { hapticLight(); setReminderSort(s); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: reminderSort === s }}
              >
                <Text style={[styles.pillText, reminderSort === s && styles.pillTextActive]}>
                  {s === 'due' ? 'Due Date' : s === 'created' ? 'Created' : 'Name'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sortFilterLabel, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>Filter</Text>
          <View style={styles.sortFilterRow}>
            {(['active', 'completed', 'has-date', 'deleted'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, reminderFilter === f && styles.pillActive]}
                onPress={() => { hapticLight(); setReminderFilter(f); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: reminderFilter === f }}
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
          {nonDeletedReminderCount === 0 && (
            <Text style={[styles.quoteText, bgUri && { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>
              {appQuote}
            </Text>
          )}
          <Text style={[styles.emptyText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
            {nonDeletedReminderCount === 0
              ? 'Nothing to remember' : 'No matches'}
          </Text>
          <Text style={[styles.emptySubtext, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
            {nonDeletedReminderCount === 0
              ? 'Must be nice. Tap + to ruin that.' : 'Try a different filter.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          windowSize={5}
          maxToRenderPerBatch={8}
          initialNumToRender={8}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { hapticLight(); navigation.navigate('CreateReminder'); }}
        activeOpacity={0.8}
        accessibilityLabel="Create new reminder"
        accessibilityRole="button"
      >
        <Image source={plusIcon} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </TouchableOpacity>

      <UndoToast
        key={undoKey}
        visible={showUndo}
        message="Reminder deleted"
        onUndo={handleUndoDelete}
        onDismiss={handleUndoDismiss}
      />

      {tutorial.showTutorial && (
        <TutorialOverlay
          tips={tutorial.tips}
          currentIndex={tutorial.currentIndex}
          onNext={tutorial.nextTip}
          onPrev={tutorial.prevTip}
          onDismiss={tutorial.dismiss}
          sectionColor={colors.sectionReminder}
        />
      )}
    </View>
  );
}

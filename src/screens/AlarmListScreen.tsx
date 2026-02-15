import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AppState,
  ToastAndroid,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alarm } from '../types/alarm';
import type { ActiveTimer } from '../types/timer';
import { loadAlarms, deleteAlarm, toggleAlarm, addAlarm } from '../services/storage';
import { cancelAlarmNotifications, scheduleAlarm, scheduleTimerNotification, cancelTimerNotification, showTimerCountdownNotification, cancelTimerCountdownNotification } from '../services/notifications';
import { loadSettings } from '../services/settings';
import { loadStats, GuessWhyStats } from '../services/guessWhyStats';
import {
  loadActiveTimers,
  saveActiveTimers,
  addActiveTimer,
  removeActiveTimer,
} from '../services/timerStorage';
import { getPinnedAlarms, togglePinAlarm, isAlarmPinned, unpinAlarm, pruneAlarmPins } from '../services/widgetPins';
import { refreshTimerWidget } from '../widget/updateWidget';
import { getRandomAppOpenQuote } from '../data/appOpenQuotes';
import AlarmCard from '../components/AlarmCard';
import SwipeableRow from '../components/SwipeableRow';
import UndoToast from '../components/UndoToast';
import TimerScreen from './TimerScreen';
import ReminderScreen from './ReminderScreen';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight, hapticHeavy } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmList'>;

function recalculateTimers(timers: ActiveTimer[]): ActiveTimer[] {
  const now = Date.now();
  return timers.map((t) => {
    if (!t.isRunning) return t;
    const elapsed = Math.floor(
      (now - new Date(t.startedAt).getTime()) / 1000
    );
    const remaining = Math.max(0, t.totalSeconds - elapsed);
    return { ...t, remainingSeconds: remaining, isRunning: remaining > 0 };
  });
}

export default function AlarmListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [guessWhyEnabled, setGuessWhyEnabled] = useState(false);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [stats, setStats] = useState<GuessWhyStats | null>(null);
  const [appQuote, setAppQuote] = useState(getRandomAppOpenQuote);
  const [tab, setTab] = useState<'alarms' | 'timers' | 'reminders'>('alarms');
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [pinnedAlarmIds, setPinnedAlarmIds] = useState<string[]>([]);
  const [alarmSort, setAlarmSort] = useState<'time' | 'created' | 'name'>('time');
  const [alarmFilter, setAlarmFilter] = useState<'all' | 'active' | 'one-time' | 'recurring'>('all');
  const [deletedAlarm, setDeletedAlarm] = useState<Alarm | null>(null);
  const [deletedAlarmPinned, setDeletedAlarmPinned] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoKey, setUndoKey] = useState(0);
  const alertedRef = useRef<Set<string>>(new Set());

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    gamesPill: {
      backgroundColor: colors.activeBackground,
      borderRadius: 14,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 2,
    },
    gamesPillIcon: {
      fontSize: 22,
    },
    headerBtn: {
      padding: 4,
    },
    headerBtnIcon: {
      fontSize: 24,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 4,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 2,
      marginTop: 12,
    },
    tab: {
      flex: 1,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 8,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: colors.accent,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    tabTextActive: {
      color: colors.textPrimary,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    streakText: {
      fontSize: 13,
      fontWeight: '600',
    },
    bestStreakText: {
      fontSize: 13,
      color: colors.textTertiary,
    },
    quoteCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    quoteText: {
      fontSize: 15,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
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
    emptyQuote: {
      fontSize: 15,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 16,
      paddingHorizontal: 32,
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
  }), [colors, insets.bottom]);

  useFocusEffect(
    useCallback(() => {
      setAppQuote(getRandomAppOpenQuote());
      loadAlarms().then((loaded) => {
        setAlarms(loaded);
        pruneAlarmPins(loaded.map((a) => a.id)).then(setPinnedAlarmIds);
      });
      loadSettings().then((s) => {
        setGuessWhyEnabled(s.guessWhyEnabled);
        setTimeFormat(s.timeFormat);
      });
      loadStats().then(setStats);
    }, [])
  );

  // Load active timers on mount (picks up widget-started timers on cold start)
  useEffect(() => {
    loadActiveTimers().then((loaded) => {
      loaded.forEach((t) => {
        if (t.remainingSeconds <= 0 && !t.isRunning) {
          alertedRef.current.add(t.id);
        }
      });
      const recalculated = recalculateTimers(loaded);
      setActiveTimers(recalculated);
      if (recalculated.some((t) => t.isRunning)) {
        setTab('timers');
      }
      const needsSave = recalculated.some(
        (t, i) => t.remainingSeconds !== loaded[i].remainingSeconds
      );
      if (needsSave) saveActiveTimers(recalculated);
    });
  }, []);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers((prev) => {
        const hasRunning = prev.some(
          (t) => t.isRunning && t.remainingSeconds > 0
        );
        if (!hasRunning) return prev;

        let completed = false;
        const updated = prev.map((t) => {
          if (!t.isRunning || t.remainingSeconds <= 0) return t;
          const remaining = t.remainingSeconds - 1;
          if (remaining <= 0) {
            completed = true;
            return { ...t, remainingSeconds: 0, isRunning: false };
          }
          return { ...t, remainingSeconds: remaining };
        });

        if (completed) saveActiveTimers(updated);
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reload active timers when app returns to foreground (picks up widget-started timers)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadActiveTimers().then((loaded) => {
          const recalculated = recalculateTimers(loaded);
          setActiveTimers((prev) => {
            const prevIds = new Set(prev.map((t) => t.id));
            if (recalculated.some((t) => !prevIds.has(t.id))) {
              setTab('timers');
            }
            return recalculated;
          });
          const needsSave = recalculated.some(
            (t, i) => t.remainingSeconds !== loaded[i].remainingSeconds
          );
          if (needsSave) saveActiveTimers(recalculated);
        });
      }
    });
    return () => subscription.remove();
  }, []);

  // Alert for completed timers (notification already scheduled via trigger)
  useEffect(() => {
    for (const timer of activeTimers) {
      if (
        timer.remainingSeconds <= 0 &&
        !timer.isRunning &&
        !alertedRef.current.has(timer.id)
      ) {
        alertedRef.current.add(timer.id);
        cancelTimerCountdownNotification(timer.id).catch(
          (e) => console.error('[completion] cancelTimerCountdownNotification failed:', e),
        );
        const notifId = timer.notificationId;
        Alert.alert(
          '\u23F0 Timer Done!',
          `${timer.icon} ${timer.label} is done!`,
          [{
            text: 'Dismiss',
            onPress: () => {
              if (notifId) cancelTimerNotification(notifId);
            },
          }],
        );
      }
    }
  }, [activeTimers]);

  const handleToggle = async (id: string) => {
    const updated = await toggleAlarm(id);
    setAlarms(updated);
    refreshTimerWidget();
  };

  const handleDelete = async (id: string) => {
    hapticHeavy();
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;
    const wasPinned = isAlarmPinned(id, pinnedAlarmIds);
    setDeletedAlarm(alarm);
    setDeletedAlarmPinned(wasPinned);
    if (alarm.notificationIds?.length) {
      await cancelAlarmNotifications(alarm.notificationIds);
    }
    await unpinAlarm(id);
    const updated = await deleteAlarm(id);
    setAlarms(updated);
    setPinnedAlarmIds((prev) => prev.filter((pid) => pid !== id));
    refreshTimerWidget();
    setUndoKey((k) => k + 1);
    setShowUndo(true);
  };

  const handleUndoDelete = async () => {
    setShowUndo(false);
    if (!deletedAlarm) return;
    const restored = { ...deletedAlarm, notificationIds: [] as string[] };
    if (restored.enabled) {
      try {
        const ids = await scheduleAlarm(restored);
        restored.notificationIds = ids;
      } catch {}
    }
    const updated = await addAlarm(restored);
    setAlarms(updated);
    if (deletedAlarmPinned) {
      const pins = await togglePinAlarm(restored.id);
      setPinnedAlarmIds(pins);
    }
    refreshTimerWidget();
    setDeletedAlarm(null);
  };

  const handleUndoDismiss = () => {
    setShowUndo(false);
    setDeletedAlarm(null);
  };

  const handleEdit = (alarm: Alarm) => {
    navigation.navigate('CreateAlarm', { alarm });
  };

  const handlePress = (alarm: Alarm) => {
    if (guessWhyEnabled) {
      navigation.navigate('GuessWhy', { alarm });
    } else {
      navigation.navigate('AlarmFire', { alarm });
    }
  };

  const handleTogglePin = async (id: string) => {
    const currentlyPinned = isAlarmPinned(id, pinnedAlarmIds);
    if (!currentlyPinned && pinnedAlarmIds.length >= 3) {
      ToastAndroid.show('Widget full \u2014 unpin one first', ToastAndroid.SHORT);
      return;
    }
    const updated = await togglePinAlarm(id);
    setPinnedAlarmIds(updated);
    refreshTimerWidget();
    ToastAndroid.show(
      isAlarmPinned(id, updated) ? 'Pinned to widget' : 'Unpinned from widget',
      ToastAndroid.SHORT,
    );
  };

  const handleAddTimer = async (timer: ActiveTimer) => {
    const completionTimestamp = Date.now() + timer.remainingSeconds * 1000;
    let notificationId: string | undefined;
    try {
      notificationId = await scheduleTimerNotification(
        timer.label,
        timer.icon,
        completionTimestamp,
        timer.id,
      );
    } catch (error) {
      console.error('[handleAddTimer] scheduleTimerNotification failed:', error);
      Alert.alert('Timer Started', 'Timer is running but the notification could not be scheduled.');
    }
    showTimerCountdownNotification(timer.label, timer.icon, completionTimestamp, timer.id).catch(
      (e) => console.error('[handleAddTimer] showTimerCountdownNotification failed:', e),
    );
    const updated = await addActiveTimer({ ...timer, notificationId });
    setActiveTimers(updated);
  };

  const handleRemoveTimer = async (id: string) => {
    const timer = activeTimers.find((t) => t.id === id);
    if (timer?.notificationId) {
      await cancelTimerNotification(timer.notificationId);
    }
    cancelTimerCountdownNotification(id).catch(
      (e) => console.error('[handleRemoveTimer] cancelTimerCountdownNotification failed:', e),
    );
    const updated = await removeActiveTimer(id);
    setActiveTimers(updated);
  };

  const handleTogglePause = async (id: string) => {
    const timer = activeTimers.find((t) => t.id === id);
    if (!timer) return;

    if (timer.isRunning) {
      // Pausing — await cancellation before clearing notificationId
      if (timer.notificationId) {
        await cancelTimerNotification(timer.notificationId);
      }
      await cancelTimerCountdownNotification(timer.id).catch(
        (e) => console.error('[handleTogglePause] cancelTimerCountdownNotification failed:', e),
      );
      setActiveTimers((prev) => {
        const updated = prev.map((t) =>
          t.id === id ? { ...t, isRunning: false, notificationId: undefined } : t
        );
        saveActiveTimers(updated);
        return updated;
      });
    } else {
      // Resuming
      const elapsed = timer.totalSeconds - timer.remainingSeconds;
      const newStartedAt = new Date(Date.now() - elapsed * 1000).toISOString();
      setActiveTimers((prev) => {
        const updated = prev.map((t) =>
          t.id === id ? { ...t, isRunning: true, startedAt: newStartedAt } : t
        );
        saveActiveTimers(updated);
        return updated;
      });

      // Schedule notification and countdown for resumed timer
      if (timer.remainingSeconds > 0) {
        const ts = Date.now() + timer.remainingSeconds * 1000;
        scheduleTimerNotification(timer.label, timer.icon, ts, timer.id)
          .then((notifId) => {
            setActiveTimers((current) => {
              const withNotif = current.map((ct) =>
                ct.id === id ? { ...ct, notificationId: notifId } : ct
              );
              saveActiveTimers(withNotif);
              return withNotif;
            });
          })
          .catch((error) => {
            console.error('[handleTogglePause] scheduleTimerNotification failed:', error);
            Alert.alert('Timer Resumed', 'Timer is running but the notification could not be scheduled.');
          });
        showTimerCountdownNotification(timer.label, timer.icon, ts, timer.id).catch(
          (e) => console.error('[handleTogglePause] showTimerCountdownNotification failed:', e),
        );
      }
    }
  };

  const filteredAlarms = useMemo(() => {
    let list = alarms;
    if (alarmFilter === 'active') list = list.filter((a) => a.enabled);
    else if (alarmFilter === 'one-time') list = list.filter((a) => a.mode === 'one-time');
    else if (alarmFilter === 'recurring') list = list.filter((a) => a.mode === 'recurring');

    if (alarmSort === 'time') {
      list = [...list].sort((a, b) => a.time.localeCompare(b.time));
    } else if (alarmSort === 'name') {
      list = [...list].sort((a, b) => {
        const aName = (a.nickname || a.note || '').toLowerCase();
        const bName = (b.nickname || b.note || '').toLowerCase();
        return aName.localeCompare(bName);
      });
    } else {
      list = [...list].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return list;
  }, [alarms, alarmSort, alarmFilter]);

  const hasPlayed = stats && (stats.wins > 0 || stats.losses > 0 || stats.skips > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Don't Forget Why</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Games')}
              activeOpacity={0.7}
              style={styles.gamesPill}
            >
              <Text style={styles.gamesPillIcon}>{'\u{1F3AE}'}</Text>
            </TouchableOpacity>
            {hasPlayed && (
              <TouchableOpacity
                onPress={() => navigation.navigate('MemoryScore')}
                activeOpacity={0.7}
                style={styles.headerBtn}
              >
                <Text style={styles.headerBtnIcon}>{'\u{1F3C6}'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
              style={styles.headerBtn}
            >
              <Text style={styles.headerBtnIcon}>{'\u2699\uFE0F'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {alarms.filter(a => a.enabled).length} active alarm{alarms.filter(a => a.enabled).length !== 1 ? 's' : ''}
        </Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, tab === 'alarms' && styles.tabActive]}
            onPress={() => { hapticLight(); setTab('alarms'); }}
            activeOpacity={0.7}
          >
            <Text numberOfLines={1} style={[styles.tabText, tab === 'alarms' && styles.tabTextActive]}>
              Alarms
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'timers' && styles.tabActive]}
            onPress={() => { hapticLight(); setTab('timers'); }}
            activeOpacity={0.7}
          >
            <Text numberOfLines={1} style={[styles.tabText, tab === 'timers' && styles.tabTextActive]}>
              Timers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'reminders' && styles.tabActive]}
            onPress={() => { hapticLight(); setTab('reminders'); }}
            activeOpacity={0.7}
          >
            <Text numberOfLines={1} style={[styles.tabText, tab === 'reminders' && styles.tabTextActive]}>
              Reminders
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'alarms' && hasPlayed && (
          <View style={styles.streakRow}>
            <Text
              style={[
                styles.streakText,
                { color: stats.streak > 0 ? colors.accent : colors.red },
              ]}
            >
              {stats.streak > 0
                ? `\u{1F525} ${stats.streak} in a row`
                : '\u{1F480} Streak broken'}
            </Text>
            {stats.bestStreak > 0 && (
              <Text style={styles.bestStreakText}>Best: {stats.bestStreak}</Text>
            )}
          </View>
        )}
      </View>

      {tab === 'alarms' ? (
        <>
          {alarms.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'\u23F0'}</Text>
              <Text style={styles.emptyText}>No alarms yet</Text>
              <Text style={styles.emptySubtext}>
                Tap + to set one and immediately forget why.
              </Text>
              <Text style={styles.emptyQuote}>{appQuote}</Text>
            </View>
          ) : (
            <>
              <View style={styles.quoteCard}>
                <Text style={styles.quoteText}>{appQuote}</Text>
              </View>

              <Text style={styles.sortFilterLabel}>Sort</Text>
              <View style={styles.sortFilterRow}>
                {(['time', 'created', 'name'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pill, alarmSort === s && styles.pillActive]}
                    onPress={() => { hapticLight(); setAlarmSort(s); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, alarmSort === s && styles.pillTextActive]}>
                      {s === 'time' ? 'Time' : s === 'created' ? 'Created' : 'Name'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sortFilterLabel}>Filter</Text>
              <View style={styles.sortFilterRow}>
                {(['all', 'active', 'one-time', 'recurring'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.pill, alarmFilter === f && styles.pillActive]}
                    onPress={() => { hapticLight(); setAlarmFilter(f); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, alarmFilter === f && styles.pillTextActive]}>
                      {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'one-time' ? 'One-time' : 'Recurring'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FlatList
                data={filteredAlarms}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <SwipeableRow
                    onSwipeLeft={() => handleDelete(item.id)}
                    onSwipeRight={() => handleDelete(item.id)}
                    leftColor="#2E1A1A"
                    leftIcon={'\u{1F5D1}'}
                    leftIconColor="#B0B0CC"
                    rightColor="#2E1A1A"
                    rightIcon={'\u{1F5D1}'}
                    rightIconColor="#B0B0CC"
                  >
                    <AlarmCard
                      alarm={item}
                      timeFormat={timeFormat}
                      guessWhyEnabled={guessWhyEnabled}
                      isPinned={isAlarmPinned(item.id, pinnedAlarmIds)}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onPress={handlePress}
                      onTogglePin={handleTogglePin}
                    />
                  </SwipeableRow>
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}

          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('CreateAlarm')}
            activeOpacity={0.8}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>

          <UndoToast
            key={undoKey}
            visible={showUndo}
            message="Alarm deleted"
            onUndo={handleUndoDelete}
            onDismiss={handleUndoDismiss}
          />
        </>
      ) : tab === 'timers' ? (
        <TimerScreen
          activeTimers={activeTimers}
          onAddTimer={handleAddTimer}
          onRemoveTimer={handleRemoveTimer}
          onTogglePause={handleTogglePause}
        />
      ) : (
        <ReminderScreen
          onNavigateCreate={(reminderId) =>
            navigation.navigate('CreateReminder', reminderId ? { reminderId } : undefined)
          }
        />
      )}
    </View>
  );
}

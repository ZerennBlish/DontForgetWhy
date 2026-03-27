import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AppState,
  useWindowDimensions,
} from 'react-native';
import { TabView } from 'react-native-tab-view';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alarm } from '../types/alarm';
import type { ActiveTimer } from '../types/timer';
import { loadAlarms } from '../services/storage';
import { scheduleTimerNotification, cancelTimerNotification, showTimerCountdownNotification, cancelTimerCountdownNotification } from '../services/notifications';
import { loadSettings, getDefaultTimerSound } from '../services/settings';
import { loadStats, GuessWhyStats } from '../services/guessWhyStats';
import {
  loadActiveTimers,
  saveActiveTimers,
} from '../services/timerStorage';
import { pruneAlarmPins } from '../services/widgetPins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReminders } from '../services/reminderStorage';
import { getNotes } from '../services/noteStorage';
import { getRandomAppOpenQuote } from '../data/appOpenQuotes';
import AlarmsTab from './AlarmsTab';
import TimerScreen from './TimerScreen';
import ReminderScreen from './ReminderScreen';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
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

export default function AlarmListScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [stats, setStats] = useState<GuessWhyStats | null>(null);
  const [appQuote, setAppQuote] = useState(getRandomAppOpenQuote);
  const [index, setIndex] = useState(0);
  const tab = (['alarms', 'timers', 'reminders'] as const)[index];
  const [routes] = useState([
    { key: 'alarms', title: 'Alarms' },
    { key: 'timers', title: 'Timers' },
    { key: 'reminders', title: 'Reminders' },
  ]);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [pinnedAlarmIds, setPinnedAlarmIds] = useState<string[]>([]);
  const [reminderCount, setReminderCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);

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
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerGear: {
      position: 'absolute',
      right: 0,
      padding: 4,
    },
    headerGearIcon: {
      fontSize: 24,
    },
    navCardRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    navCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: colors.border,
    },
    navCardIcon: {
      fontSize: 20,
    },
    navCardText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    navBadge: {
      backgroundColor: colors.accent,
      borderRadius: 7,
      minWidth: 14,
      height: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    navBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '700',
    },
    subtitleRow: {
      flexDirection: 'row',
      marginTop: 12,
      paddingHorizontal: 2,
    },
    subtitleItem: {
      flex: 1,
      alignItems: 'center',
    },
    subtitleText: {
      fontSize: 13,
      color: colors.textTertiary,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 2,
      marginTop: 4,
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
  }), [colors, insets.bottom]);

  useFocusEffect(
    useCallback(() => {
      setAppQuote(getRandomAppOpenQuote());
      loadAlarms(true).then((loaded) => {
        setAlarms(loaded);
        pruneAlarmPins(loaded.filter((a) => !a.deletedAt).map((a) => a.id)).then(setPinnedAlarmIds);
      });
      loadSettings().then((s) => {
        setTimeFormat(s.timeFormat);
      });
      loadStats().then(setStats);
      getReminders().then((loaded) => {
        setReminderCount(loaded.filter((r) => !r.completed).length);
      });
      getNotes().then((loaded) => setNoteCount(loaded.length));
      loadBackground().then(setBgUri);
      getOverlayOpacity().then(setBgOpacity);
    }, [])
  );

  // Refresh reminder count when switching tabs (picks up changes from Reminders tab)
  useEffect(() => {
    getReminders().then((loaded) => {
      setReminderCount(loaded.filter((r) => !r.completed).length);
    });
  }, [tab]);

  // Cold-start: apply initialTab from navigation params on first render
  useEffect(() => {
    const tab = route.params?.initialTab;
    if (tab !== undefined) {
      setIndex(tab);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Widget deep-link: check pendingTabAction every time this screen gains focus
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('pendingTabAction').then((raw) => {
        if (raw) {
          AsyncStorage.removeItem('pendingTabAction');
          try {
            const parsed = JSON.parse(raw) as { tab: number; timestamp: number };
            if (Date.now() - parsed.timestamp < 10000) {
              setIndex(parsed.tab);
            }
          } catch {}
        }
      });
    }, [])
  );

  // Widget deep-link: check pendingTabAction when app returns from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        AsyncStorage.getItem('pendingTabAction').then((raw) => {
          if (raw) {
            AsyncStorage.removeItem('pendingTabAction');
            try {
              const parsed = JSON.parse(raw) as { tab: number; timestamp: number };
              if (Date.now() - parsed.timestamp < 10000) {
                setIndex(parsed.tab);
              }
            } catch {}
          }
        });
      }
    });
    return () => sub.remove();
  }, []);

  // Load active timers on mount (picks up widget-started timers on cold start)
  useEffect(() => {
    loadActiveTimers().then((loaded) => {
      const recalculated = recalculateTimers(loaded);
      setActiveTimers(recalculated);
      if (route.params?.initialTab === undefined && recalculated.some((t) => t.isRunning)) {
        setIndex(1);
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
              setIndex(1);
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

  const handleAddTimer = async (timer: ActiveTimer) => {
    const completionTimestamp = Date.now() + timer.remainingSeconds * 1000;

    // Load default timer sound
    let soundUri: string | undefined;
    let soundName: string | undefined;
    try {
      const defaultSound = await getDefaultTimerSound();
      console.log('[handleAddTimer] defaultSound:', JSON.stringify(defaultSound));
      if (defaultSound.uri) {
        soundUri = defaultSound.uri;
        soundName = defaultSound.name || 'Custom';
      }
    } catch (err) {
      console.error('[handleAddTimer] getDefaultTimerSound failed:', err);
    }

    let notificationId: string | undefined;
    try {
      console.log('[handleAddTimer] scheduling notification with sound:', soundUri, soundName);
      notificationId = await scheduleTimerNotification(
        timer.label,
        timer.icon,
        completionTimestamp,
        timer.id,
        soundUri,
        soundName,
        timer.soundId,
      );
      console.log('[handleAddTimer] notificationId:', notificationId);
    } catch (error) {
      console.error('[handleAddTimer] scheduleTimerNotification failed:', error);
      Alert.alert('Timer Started', 'Timer is running but the notification could not be scheduled.');
    }
    showTimerCountdownNotification(timer.label, timer.icon, completionTimestamp, timer.id).catch(
      (e) => console.error('[handleAddTimer] showTimerCountdownNotification failed:', e),
    );
    const timerWithNotif = { ...timer, notificationId };
    setActiveTimers((prev) => {
      const updated = [...prev, timerWithNotif];
      saveActiveTimers(updated);
      return updated;
    });
  };

  const handleRemoveTimer = async (id: string) => {
    const timer = activeTimers.find((t) => t.id === id);
    if (timer?.notificationId) {
      await cancelTimerNotification(timer.notificationId);
    }
    cancelTimerCountdownNotification(id).catch(
      (e) => console.error('[handleRemoveTimer] cancelTimerCountdownNotification failed:', e),
    );
    setActiveTimers((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveActiveTimers(updated);
      return updated;
    });
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
      // Resuming — schedule notification FIRST, only mark running on success
      const elapsed = timer.totalSeconds - timer.remainingSeconds;
      const newStartedAt = new Date(Date.now() - elapsed * 1000).toISOString();

      if (timer.remainingSeconds > 0) {
        const ts = Date.now() + timer.remainingSeconds * 1000;

        // Load default timer sound for rescheduled notification
        let rSoundUri: string | undefined;
        let rSoundName: string | undefined;
        try {
          const defaultSound = await getDefaultTimerSound();
          console.log('[handleTogglePause] defaultSound:', JSON.stringify(defaultSound));
          if (defaultSound.uri) {
            rSoundUri = defaultSound.uri;
            rSoundName = defaultSound.name || 'Custom';
          }
        } catch (err) {
          console.error('[handleTogglePause] getDefaultTimerSound failed:', err);
        }

        try {
          const notifId = await scheduleTimerNotification(
            timer.label, timer.icon, ts, timer.id, rSoundUri, rSoundName, timer.soundId,
          );
          // Notification scheduled — now mark timer as running
          setActiveTimers((prev) => {
            const updated = prev.map((t) =>
              t.id === id
                ? { ...t, isRunning: true, startedAt: newStartedAt, notificationId: notifId }
                : t
            );
            saveActiveTimers(updated);
            return updated;
          });
          showTimerCountdownNotification(timer.label, timer.icon, ts, timer.id).catch(
            (e) => console.error('[handleTogglePause] showTimerCountdownNotification failed:', e),
          );
        } catch (error) {
          console.error('[handleTogglePause] scheduleTimerNotification failed:', error);
          Alert.alert('Resume Failed', 'Could not schedule the timer notification. The timer remains paused.');
        }
      } else {
        // No time remaining — just mark as running (will finish immediately)
        setActiveTimers((prev) => {
          const updated = prev.map((t) =>
            t.id === id ? { ...t, isRunning: true, startedAt: newStartedAt } : t
          );
          saveActiveTimers(updated);
          return updated;
        });
      }
    }
  };

  const hasPlayed = stats && (stats.wins > 0 || stats.losses > 0 || stats.skips > 0);

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
            source={require('../../assets/fullscreenicon.png')}
            style={{ width: '100%', height: '100%', opacity: 0.07 }}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Don't Forget Why</Text>
          <TouchableOpacity
            onPress={() => { hapticLight(); navigation.navigate('Settings'); }}
            activeOpacity={0.7}
            style={styles.headerGear}
          >
            <Text style={styles.headerGearIcon}>{'\u2699\uFE0F'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navCardRow}>
          <TouchableOpacity
            onPress={() => { hapticLight(); navigation.navigate('Notepad'); }}
            activeOpacity={0.7}
            style={styles.navCard}
          >
            <Text style={styles.navCardIcon}>{'\u{1F4DD}'}</Text>
            <Text style={styles.navCardText}>Notes</Text>
            {noteCount > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{noteCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { hapticLight(); navigation.navigate('Calendar'); }}
            activeOpacity={0.7}
            style={styles.navCard}
          >
            <Text style={styles.navCardIcon}>{'\u{1F4C5}'}</Text>
            <Text style={styles.navCardText}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { hapticLight(); navigation.navigate('Games'); }}
            activeOpacity={0.7}
            style={styles.navCard}
          >
            <Text style={styles.navCardIcon}>{'\u{1F3AE}'}</Text>
            <Text style={styles.navCardText}>Games</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.subtitleRow}>
          <View style={styles.subtitleItem}>
            <Text style={styles.subtitleText}>
              {(() => { const c = alarms.filter(a => a.enabled && !a.deletedAt).length; return `${c} alarm${c !== 1 ? 's' : ''}`; })()}
            </Text>
          </View>
          <View style={styles.subtitleItem}>
            <Text style={styles.subtitleText}>
              {(() => { const c = activeTimers.filter(t => t.isRunning).length; return `${c} timer${c !== 1 ? 's' : ''}`; })()}
            </Text>
          </View>
          <View style={styles.subtitleItem}>
            <Text style={styles.subtitleText}>
              {`${reminderCount} reminder${reminderCount !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          {routes.map((route, i) => (
            <TouchableOpacity
              key={route.key}
              style={[styles.tab, index === i && styles.tabActive]}
              onPress={() => { hapticLight(); setIndex(i); }}
              activeOpacity={0.7}
            >
              <Text numberOfLines={1} style={[styles.tabText, index === i && styles.tabTextActive]}>
                {route.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {index === 0 && hasPlayed && stats.streak > 0 && (
          <View style={styles.streakRow}>
            <Text
              style={[
                styles.streakText,
                { color: colors.accent },
              ]}
            >
              {`\u{1F525} ${stats.streak} in a row`}
            </Text>
            {stats.bestStreak > 0 && (
              <Text style={styles.bestStreakText}>Best: {stats.bestStreak}</Text>
            )}
          </View>
        )}
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={({ route }) => {
          switch (route.key) {
            case 'alarms':
              return (
                <AlarmsTab
                  alarms={alarms}
                  setAlarms={setAlarms}
                  timeFormat={timeFormat}
                  navigation={navigation}
                  pinnedAlarmIds={pinnedAlarmIds}
                  setPinnedAlarmIds={setPinnedAlarmIds}
                  appQuote={appQuote}
                  stats={stats}
                />
              );
            case 'timers':
              return (
                <TimerScreen
                  activeTimers={activeTimers}
                  onAddTimer={handleAddTimer}
                  onRemoveTimer={handleRemoveTimer}
                  onTogglePause={handleTogglePause}
                />
              );
            case 'reminders':
              return (
                <ReminderScreen
                  onNavigateCreate={(reminderId) =>
                    navigation.navigate('CreateReminder', reminderId ? { reminderId } : undefined)
                  }
                  onReminderCountChange={setReminderCount}
                />
              );
            default:
              return null;
          }
        }}
        renderTabBar={() => null}
        onIndexChange={(i) => { hapticLight(); setIndex(i); }}
        initialLayout={{ width: layout.width }}
        lazy
        lazyPreloadDistance={0}
        swipeEnabled
      />
    </View>
  );
}

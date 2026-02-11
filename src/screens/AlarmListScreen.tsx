import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alarm } from '../types/alarm';
import type { ActiveTimer } from '../types/timer';
import { loadAlarms, deleteAlarm, toggleAlarm } from '../services/storage';
import { cancelAlarm } from '../services/notifications';
import { loadSettings } from '../services/settings';
import { loadStats, GuessWhyStats } from '../services/guessWhyStats';
import {
  loadActiveTimers,
  saveActiveTimers,
  addActiveTimer,
  removeActiveTimer,
} from '../services/timerStorage';
import { getRandomAppOpenQuote } from '../data/appOpenQuotes';
import AlarmCard from '../components/AlarmCard';
import TimerScreen from './TimerScreen';
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
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [guessWhyEnabled, setGuessWhyEnabled] = useState(false);
  const [stats, setStats] = useState<GuessWhyStats | null>(null);
  const [appQuote] = useState(getRandomAppOpenQuote);
  const [tab, setTab] = useState<'alarms' | 'timers'>('alarms');
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const alertedRef = useRef<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      loadAlarms().then(setAlarms);
      loadSettings().then((s) => setGuessWhyEnabled(s.guessWhyEnabled));
      loadStats().then(setStats);
    }, [])
  );

  // Load active timers on mount
  useEffect(() => {
    loadActiveTimers().then((loaded) => {
      loaded.forEach((t) => {
        if (t.remainingSeconds <= 0 && !t.isRunning) {
          alertedRef.current.add(t.id);
        }
      });
      const recalculated = recalculateTimers(loaded);
      setActiveTimers(recalculated);
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

  // Alert for completed timers
  useEffect(() => {
    for (const timer of activeTimers) {
      if (
        timer.remainingSeconds <= 0 &&
        !timer.isRunning &&
        !alertedRef.current.has(timer.id)
      ) {
        alertedRef.current.add(timer.id);
        Alert.alert(
          '\u23F0 Timer Done!',
          `${timer.icon} ${timer.label} is done!`
        );
      }
    }
  }, [activeTimers]);

  const handleToggle = async (id: string) => {
    const updated = await toggleAlarm(id);
    setAlarms(updated);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Alarm', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelAlarm(id);
          const updated = await deleteAlarm(id);
          setAlarms(updated);
        },
      },
    ]);
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

  const handleAddTimer = async (timer: ActiveTimer) => {
    const updated = await addActiveTimer(timer);
    setActiveTimers(updated);
  };

  const handleRemoveTimer = async (id: string) => {
    const updated = await removeActiveTimer(id);
    setActiveTimers(updated);
  };

  const handleTogglePause = (id: string) => {
    setActiveTimers((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== id) return t;
        if (t.isRunning) {
          return { ...t, isRunning: false };
        }
        const elapsed = t.totalSeconds - t.remainingSeconds;
        const newStartedAt = new Date(
          Date.now() - elapsed * 1000
        ).toISOString();
        return { ...t, isRunning: true, startedAt: newStartedAt };
      });
      saveActiveTimers(updated);
      return updated;
    });
  };

  const hasPlayed = stats && (stats.wins > 0 || stats.losses > 0 || stats.skips > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Don't Forget Why</Text>
          <View style={styles.headerIcons}>
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
            onPress={() => setTab('alarms')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'alarms' && styles.tabTextActive]}>
              Alarms
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'timers' && styles.tabActive]}
            onPress={() => setTab('timers')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === 'timers' && styles.tabTextActive]}>
              Timers
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'alarms' && hasPlayed && (
          <View style={styles.streakRow}>
            <Text
              style={[
                styles.streakText,
                { color: stats.streak > 0 ? '#4A90D9' : '#FF6B6B' },
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
                Tap + to create your first reminder
              </Text>
              <Text style={styles.emptyQuote}>{appQuote}</Text>
            </View>
          ) : (
            <>
              <View style={styles.quoteCard}>
                <Text style={styles.quoteText}>{appQuote}</Text>
              </View>
              <FlatList
                data={alarms}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <AlarmCard
                    alarm={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onPress={handlePress}
                  />
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
        </>
      ) : (
        <TimerScreen
          activeTimers={activeTimers}
          onAddTimer={handleAddTimer}
          onRemoveTimer={handleRemoveTimer}
          onTogglePause={handleTogglePause}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121220',
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
    color: '#EAEAFF',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerBtn: {
    padding: 4,
  },
  headerBtnIcon: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#7A7A9E',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E2E',
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
    backgroundColor: '#4A90D9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7A9E',
  },
  tabTextActive: {
    color: '#fff',
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
    color: '#7A7A9E',
  },
  quoteCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 15,
    color: '#B0B0CC',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7A7A9E',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#555',
    marginTop: 6,
  },
  emptyQuote: {
    fontSize: 15,
    color: '#B0B0CC',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
});

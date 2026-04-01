import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  AppState,
  useWindowDimensions,
} from 'react-native';
import { TabView } from 'react-native-tab-view';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alarm } from '../types/alarm';
import { loadAlarms } from '../services/storage';
import { loadSettings } from '../services/settings';
import { loadStats, GuessWhyStats } from '../services/guessWhyStats';
import { pruneAlarmPins } from '../services/widgetPins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReminders } from '../services/reminderStorage';
import AlarmsTab from './AlarmsTab';
import ReminderScreen from './ReminderScreen';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmList'>;

export default function AlarmListScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [stats, setStats] = useState<GuessWhyStats | null>(null);
  const [index, setIndex] = useState(0);
  const tab = (['alarms', 'reminders'] as const)[index];
  const [routes] = useState([
    { key: 'alarms', title: 'Alarms' },
    { key: 'reminders', title: 'Reminders' },
  ]);
  const [pinnedAlarmIds, setPinnedAlarmIds] = useState<string[]>([]);
  const [reminderCount, setReminderCount] = useState(0);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: insets.top + 10,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    subtitleRow: {
      flexDirection: 'row',
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
        <View style={styles.backButton}>
          <BackButton onPress={() => navigation.goBack()} />
          <HomeButton />
        </View>

        <View style={styles.subtitleRow}>
          <View style={styles.subtitleItem}>
            <Text style={styles.subtitleText}>
              {(() => { const c = alarms.filter(a => a.enabled && !a.deletedAt).length; return `${c} alarm${c !== 1 ? 's' : ''}`; })()}
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
                  stats={stats}
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

import React, { useState, useCallback } from 'react';
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
import { loadAlarms, deleteAlarm, toggleAlarm } from '../services/storage';
import { cancelAlarm } from '../services/notifications';
import { loadSettings } from '../services/settings';
import { loadStats, GuessWhyStats } from '../services/guessWhyStats';
import { getRandomAppOpenQuote } from '../data/appOpenQuotes';
import AlarmCard from '../components/AlarmCard';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmList'>;

export default function AlarmListScreen({ navigation }: Props) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [guessWhyEnabled, setGuessWhyEnabled] = useState(false);
  const [stats, setStats] = useState<GuessWhyStats | null>(null);
  const [appQuote] = useState(getRandomAppOpenQuote);

  useFocusEffect(
    useCallback(() => {
      loadAlarms().then(setAlarms);
      loadSettings().then((s) => setGuessWhyEnabled(s.guessWhyEnabled));
      loadStats().then(setStats);
    }, [])
  );

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
        {hasPlayed && (
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
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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

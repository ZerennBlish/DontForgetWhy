import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatTime } from '../utils/time';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmFire'>;

const categoryEmoji: Record<string, string> = {
  meds: '💊',
  appointment: '📅',
  task: '✅',
  'self-care': '🧘',
  general: '🔔',
};

export default function AlarmFireScreen({ route, navigation }: Props) {
  const { alarm } = route.params;

  const handleDismiss = () => {
    navigation.goBack();
  };

  const handleSnooze = () => {
    // In a full implementation, this would reschedule 5 min later
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.emoji}>{categoryEmoji[alarm.category] ?? '🔔'}</Text>
        <Text style={styles.time}>{formatTime(alarm.time)}</Text>
        <Text style={styles.categoryLabel}>{alarm.category.toUpperCase()}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.note}>{alarm.note}</Text>
        <View style={styles.divider} />
        <Text style={styles.quote}>"{alarm.quote}"</Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.snoozeBtn}
          onPress={handleSnooze}
          activeOpacity={0.8}
        >
          <Text style={styles.snoozeBtnText}>Snooze 5 min</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissBtnText}>I'm On It</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121220',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  top: {
    alignItems: 'center',
    marginTop: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  time: {
    fontSize: 56,
    fontWeight: '800',
    color: '#EAEAFF',
    letterSpacing: -2,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90D9',
    letterSpacing: 2,
    marginTop: 8,
  },
  middle: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  note: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EAEAFF',
    textAlign: 'center',
    lineHeight: 38,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: '#2A2A3E',
    marginVertical: 24,
    borderRadius: 1,
  },
  quote: {
    fontSize: 17,
    color: '#7A7A9E',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 26,
    paddingHorizontal: 12,
  },
  bottom: {
    gap: 12,
  },
  snoozeBtn: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  snoozeBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B0B0CC',
  },
  dismissBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

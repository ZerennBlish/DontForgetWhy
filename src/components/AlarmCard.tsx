import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Alarm, AlarmCategory } from '../types/alarm';
import { formatTime } from '../utils/time';

const categoryLabels: Record<AlarmCategory, string> = {
  meds: '💊 Meds',
  appointment: '📅 Appt',
  task: '✅ Task',
  'self-care': '🧘 Self-Care',
  general: '🔔 General',
};

interface AlarmCardProps {
  alarm: Alarm;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: (alarm: Alarm) => void;
}

export default function AlarmCard({ alarm, onToggle, onDelete, onPress }: AlarmCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, !alarm.enabled && styles.cardDisabled]}
      onPress={() => onPress(alarm)}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={[styles.time, !alarm.enabled && styles.textDisabled]}>
          {formatTime(alarm.time)}
        </Text>
        <Text style={[styles.note, !alarm.enabled && styles.textDisabled]} numberOfLines={1}>
          {alarm.nickname ? `${alarm.nickname} 🔒` : alarm.note}
        </Text>
        <Text style={[styles.category, !alarm.enabled && styles.textDisabled]}>
          {categoryLabels[alarm.category]}
        </Text>
      </View>
      <View style={styles.right}>
        <Switch
          value={alarm.enabled}
          onValueChange={() => onToggle(alarm.id)}
          trackColor={{ false: '#555', true: '#4A90D9' }}
          thumbColor={alarm.enabled ? '#fff' : '#999'}
        />
        <TouchableOpacity onPress={() => onDelete(alarm.id)} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  time: {
    fontSize: 32,
    fontWeight: '700',
    color: '#EAEAFF',
    letterSpacing: -1,
  },
  note: {
    fontSize: 15,
    color: '#B0B0CC',
    marginTop: 4,
  },
  category: {
    fontSize: 13,
    color: '#7A7A9E',
    marginTop: 4,
  },
  textDisabled: {
    color: '#555',
  },
  right: {
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#3A1A1A',
  },
  deleteText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
  },
});

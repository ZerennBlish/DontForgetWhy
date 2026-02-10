import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Alarm, AlarmCategory } from '../types/alarm';
import { formatTime } from '../utils/time';

const categoryLabels: Record<AlarmCategory, string> = {
  meds: '\u{1F48A} Meds',
  appointment: '\u{1F4C5} Appt',
  task: '\u2705 Task',
  'self-care': '\u{1F9D8} Self-Care',
  general: '\u{1F514} General',
};

interface AlarmCardProps {
  alarm: Alarm;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (alarm: Alarm) => void;
  onPress: (alarm: Alarm) => void;
}

function getDetailLine(alarm: Alarm): string {
  if (alarm.icon && alarm.nickname) return `${alarm.icon} ${alarm.nickname}`;
  if (alarm.icon) return alarm.icon;
  if (alarm.nickname) return `${alarm.nickname} \u{1F512}`;
  return alarm.note;
}

export default function AlarmCard({ alarm, onToggle, onDelete, onEdit, onPress }: AlarmCardProps) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handlePeek = () => {
    setRevealed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), 3000);
  };

  const isHidden = alarm.private && !revealed;
  const detailText = isHidden ? '\u{1F512} Private Alarm' : getDetailLine(alarm);
  const detailStyle = isHidden ? styles.privateText : styles.detail;

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
        <Text
          style={[detailStyle, !alarm.enabled && styles.textDisabled]}
          numberOfLines={1}
        >
          {detailText}
        </Text>
        <Text style={[styles.category, !alarm.enabled && styles.textDisabled]}>
          {categoryLabels[alarm.category]}
        </Text>
      </View>
      <View style={styles.right}>
        {alarm.private && (
          <TouchableOpacity onPress={handlePeek} style={styles.peekBtn} activeOpacity={0.6}>
            <Text style={styles.peekIcon}>{'\u{1F441}'}</Text>
          </TouchableOpacity>
        )}
        <Switch
          value={alarm.enabled}
          onValueChange={() => onToggle(alarm.id)}
          trackColor={{ false: '#555', true: '#4A90D9' }}
          thumbColor={alarm.enabled ? '#fff' : '#999'}
        />
        <View style={styles.btnRow}>
          <TouchableOpacity onPress={() => onEdit(alarm)} style={styles.editBtn}>
            <Text style={styles.editText}>{'\u270F\uFE0F'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(alarm.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
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
  detail: {
    fontSize: 15,
    color: '#B0B0CC',
    marginTop: 4,
  },
  privateText: {
    fontSize: 15,
    color: '#7A7A9E',
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
  peekBtn: {
    padding: 4,
  },
  peekIcon: {
    fontSize: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1A2A44',
  },
  editText: {
    color: '#4A90D9',
    fontSize: 13,
    fontWeight: '600',
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

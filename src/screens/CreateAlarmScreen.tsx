import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import { AlarmCategory } from '../types/alarm';
import { addAlarm } from '../services/storage';
import { scheduleAlarm, requestPermissions } from '../services/notifications';
import { getRandomQuote } from '../services/quotes';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAlarm'>;

const categories: { key: AlarmCategory; label: string; icon: string }[] = [
  { key: 'meds', label: 'Meds', icon: '💊' },
  { key: 'appointment', label: 'Appt', icon: '📅' },
  { key: 'task', label: 'Task', icon: '✅' },
  { key: 'self-care', label: 'Self-Care', icon: '🧘' },
  { key: 'general', label: 'General', icon: '🔔' },
];

export default function CreateAlarmScreen({ navigation }: Props) {
  const [hours, setHours] = useState('08');
  const [minutes, setMinutes] = useState('00');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<AlarmCategory>('general');

  const handleSave = async () => {
    if (!note.trim()) {
      Alert.alert('Note Required', "What's the reason for this alarm? That's the whole point.");
      return;
    }

    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert('Permissions Needed', 'Enable notifications to use alarms.');
      return;
    }

    const h = Math.min(23, Math.max(0, parseInt(hours, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(minutes, 10) || 0));
    const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    const alarm = {
      id: uuidv4(),
      time,
      note: note.trim(),
      quote: getRandomQuote(),
      enabled: true,
      recurring: false,
      days: [],
      category,
      createdAt: new Date().toISOString(),
    };

    const notificationId = await scheduleAlarm(alarm);
    await addAlarm({ ...alarm, notificationId });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>New Alarm</Text>

      <View style={styles.timeContainer}>
        <TextInput
          style={styles.timeInput}
          value={hours}
          onChangeText={(t) => setHours(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholderTextColor="#555"
        />
        <Text style={styles.timeSeparator}>:</Text>
        <TextInput
          style={styles.timeInput}
          value={minutes}
          onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholderTextColor="#555"
        />
      </View>

      <Text style={styles.label}>Why are you setting this alarm?</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="e.g. Take your meds — you'll feel off all day if you skip"
        placeholderTextColor="#555"
        multiline
        maxLength={200}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{note.length}/200</Text>

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[
              styles.categoryChip,
              category === c.key && styles.categoryChipActive,
            ]}
            onPress={() => setCategory(c.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryIcon}>{c.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                category === c.key && styles.categoryTextActive,
              ]}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.saveBtnText}>Save Alarm</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121220',
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#EAEAFF',
    marginBottom: 32,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  timeInput: {
    fontSize: 56,
    fontWeight: '700',
    color: '#EAEAFF',
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    width: 110,
    textAlign: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4A90D9',
    marginHorizontal: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B0B0CC',
    marginBottom: 10,
  },
  noteInput: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#EAEAFF',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  charCount: {
    fontSize: 12,
    color: '#555',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 24,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 40,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#1A2A44',
    borderColor: '#4A90D9',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#7A7A9E',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#4A90D9',
  },
  saveBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

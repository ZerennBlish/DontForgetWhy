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
  Switch,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import type { AlarmCategory } from '../types/alarm';
import { addAlarm } from '../services/storage';
import { scheduleAlarm, requestPermissions } from '../services/notifications';
import { getRandomQuote } from '../services/quotes';
import { getRandomPlaceholder } from '../data/placeholders';
import guessWhyIcons from '../data/guessWhyIcons';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAlarm'>;

const iconCategoryMap: Record<string, AlarmCategory> = {
  '\u{1F48A}': 'meds',
  '\u{1FA7A}': 'appointment',
  '\u{1F4C5}': 'appointment',
  '\u{1F465}': 'task',
  '\u{1F476}': 'general',
  '\u26BD': 'self-care',
  '\u{1F3CB}\uFE0F': 'self-care',
  '\u{1F634}': 'self-care',
  '\u{1F6BF}': 'self-care',
};

function categoryFromIcon(emoji: string | null): AlarmCategory {
  if (!emoji) return 'general';
  return iconCategoryMap[emoji] || 'general';
}

export default function CreateAlarmScreen({ navigation }: Props) {
  const [hours, setHours] = useState('08');
  const [minutes, setMinutes] = useState('00');
  const [nickname, setNickname] = useState('');
  const [note, setNote] = useState('');
  const [placeholder] = useState(getRandomPlaceholder);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedPrivate, setSelectedPrivate] = useState(false);

  const handleIconPress = (emoji: string) => {
    setSelectedIcon(selectedIcon === emoji ? null : emoji);
  };

  const handleSave = async () => {
    if (!note.trim() && !selectedIcon) {
      Alert.alert('Hold Up', "Hold up \u2014 give this alarm at least a note or an icon so you'll know what it's for.");
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
      nickname: nickname.trim() || undefined,
      note: note.trim(),
      quote: getRandomQuote(),
      enabled: true,
      recurring: false,
      days: [],
      category: categoryFromIcon(selectedIcon),
      icon: selectedIcon || undefined,
      private: selectedPrivate,
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

      <Text style={styles.label}>Nickname (shows on lock screen)</Text>
      <TextInput
        style={styles.nicknameInput}
        value={nickname}
        onChangeText={setNickname}
        placeholder="e.g. Pill O'Clock, Dog Time, Morning Stuff"
        placeholderTextColor="#555"
        maxLength={40}
      />

      <Text style={styles.label}>Why are you setting this alarm?</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder={placeholder}
        placeholderTextColor="#555"
        multiline
        maxLength={200}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{note.length}/200</Text>

      <Text style={styles.label}>What's it for?</Text>
      <View style={styles.iconGrid}>
        {guessWhyIcons.map((icon) => (
          <TouchableOpacity
            key={icon.id}
            style={[
              styles.iconCell,
              selectedIcon === icon.emoji && styles.iconCellActive,
            ]}
            onPress={() => handleIconPress(icon.emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.iconEmoji}>{icon.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Private Alarm</Text>
          <Switch
            value={selectedPrivate}
            onValueChange={setSelectedPrivate}
            trackColor={{ false: '#2A2A3E', true: '#4A90D9' }}
            thumbColor={selectedPrivate ? '#EAEAFF' : '#7A7A9E'}
          />
        </View>
        <Text style={styles.toggleDescription}>
          Hides details on the alarm list. Tap the eye icon to peek.
        </Text>
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
  nicknameInput: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#EAEAFF',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    marginBottom: 24,
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1E2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  iconCellActive: {
    backgroundColor: '#1A2A44',
    borderColor: '#4A90D9',
  },
  iconEmoji: {
    fontSize: 22,
  },
  toggleCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EAEAFF',
    flex: 1,
    marginRight: 12,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#7A7A9E',
    marginTop: 12,
    lineHeight: 20,
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

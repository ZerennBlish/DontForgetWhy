import React, { useState, useMemo, useEffect } from 'react';
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
import { addAlarm, updateAlarm } from '../services/storage';
import { scheduleAlarm, requestPermissions } from '../services/notifications';
import { loadSettings } from '../services/settings';
import { getRandomQuote } from '../services/quotes';
import { getRandomPlaceholder } from '../data/placeholders';
import guessWhyIcons from '../data/guessWhyIcons';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAlarm'>;

const iconCategoryMap: Record<string, AlarmCategory> = {
  '\u{1F48A}': 'meds',
  '\u{1FA7A}': 'appointment',
  '\u2695\uFE0F': 'meds',
  '\u{1F4C5}': 'appointment',
  '\u{1F465}': 'task',
  '\u{1F3CB}\uFE0F': 'self-care',
  '\u{1F634}': 'self-care',
  '\u{1F6BF}': 'self-care',
};

function categoryFromIcon(emoji: string | null): AlarmCategory {
  if (!emoji) return 'general';
  return iconCategoryMap[emoji] || 'general';
}

export default function CreateAlarmScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const existingAlarm = route.params?.alarm;
  const isEditing = !!existingAlarm;

  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [hours, setHours] = useState(
    existingAlarm ? existingAlarm.time.split(':')[0] : '08'
  );
  const [minutes, setMinutes] = useState(
    existingAlarm ? existingAlarm.time.split(':')[1] : '00'
  );
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(() => {
    if (!existingAlarm) return 'AM';
    const h = parseInt(existingAlarm.time.split(':')[0], 10);
    return h >= 12 ? 'PM' : 'AM';
  });
  const [nickname, setNickname] = useState(existingAlarm?.nickname || '');

  useEffect(() => {
    loadSettings().then((s) => {
      setTimeFormat(s.timeFormat);
      if (s.timeFormat === '12h') {
        setHours((prev) => {
          const h24 = parseInt(prev, 10) || 0;
          const h12 = h24 % 12 || 12;
          return h12.toString();
        });
      }
    });
  }, []);
  const [note, setNote] = useState(existingAlarm?.note || '');
  const [placeholder] = useState(getRandomPlaceholder);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(
    existingAlarm?.icon || null
  );
  const [selectedPrivate, setSelectedPrivate] = useState(
    existingAlarm?.private || false
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 60 + insets.bottom,
    },
    heading: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
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
      color: colors.textPrimary,
      backgroundColor: colors.card,
      borderRadius: 16,
      width: 110,
      textAlign: 'center',
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeSeparator: {
      fontSize: 48,
      fontWeight: '700',
      color: colors.accent,
      marginHorizontal: 12,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
    },
    nicknameInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    noteInput: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    charCount: {
      fontSize: 12,
      color: colors.textTertiary,
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
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconCellActive: {
      backgroundColor: colors.activeBackground,
      borderColor: colors.accent,
    },
    iconEmoji: {
      fontSize: 22,
    },
    toggleCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    toggleDescription: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 12,
      lineHeight: 20,
    },
    ampmContainer: {
      flexDirection: 'column',
      marginLeft: 12,
      gap: 4,
    },
    ampmBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ampmBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    ampmText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    ampmTextActive: {
      color: colors.textPrimary,
    },
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
    },
    saveBtnText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  }), [colors, insets.bottom]);

  const handleIconPress = (emoji: string) => {
    setSelectedIcon(selectedIcon === emoji ? null : emoji);
  };

  const handleSave = async () => {
    try {
      if (!note.trim() && !selectedIcon) {
        Alert.alert('Hold Up', "Hold up \u2014 give this alarm at least a note or an icon so you'll know what it's for.");
        return;
      }

      let h: number;
      if (timeFormat === '12h') {
        let h12 = parseInt(hours, 10) || 12;
        h12 = Math.min(12, Math.max(1, h12));
        if (ampm === 'AM') {
          h = h12 === 12 ? 0 : h12;
        } else {
          h = h12 === 12 ? 12 : h12 + 12;
        }
      } else {
        h = Math.min(23, Math.max(0, parseInt(hours, 10) || 0));
      }
      const m = Math.min(59, Math.max(0, parseInt(minutes, 10) || 0));
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      if (!isEditing || existingAlarm!.enabled) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert('Permissions Needed', 'Enable notifications to use alarms.');
          return;
        }
      }

      if (isEditing) {
        const updated = {
          ...existingAlarm,
          time,
          nickname: nickname.trim() || undefined,
          note: note.trim(),
          category: categoryFromIcon(selectedIcon),
          icon: selectedIcon || undefined,
          private: selectedPrivate,
        };
        await updateAlarm(updated);
      } else {
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
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('[SAVE ERROR]', error);
      Alert.alert('Error', 'Failed to save alarm: ' + error.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{isEditing ? 'Edit Alarm' : 'New Alarm'}</Text>

      <View style={styles.timeContainer}>
        <TextInput
          style={styles.timeInput}
          value={hours}
          onChangeText={(t) => setHours(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={styles.timeSeparator}>:</Text>
        <TextInput
          style={styles.timeInput}
          value={minutes}
          onChangeText={(t) => setMinutes(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholderTextColor={colors.textTertiary}
        />
        {timeFormat === '12h' && (
          <View style={styles.ampmContainer}>
            <TouchableOpacity
              style={[styles.ampmBtn, ampm === 'AM' && styles.ampmBtnActive]}
              onPress={() => setAmpm('AM')}
              activeOpacity={0.7}
            >
              <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ampmBtn, ampm === 'PM' && styles.ampmBtnActive]}
              onPress={() => setAmpm('PM')}
              activeOpacity={0.7}
            >
              <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.label}>Nickname (shows on lock screen)</Text>
      <TextInput
        style={styles.nicknameInput}
        value={nickname}
        onChangeText={setNickname}
        placeholder="e.g. Pill O'Clock, Dog Time, Morning Stuff"
        placeholderTextColor={colors.textTertiary}
        maxLength={40}
      />

      <Text style={styles.label}>Why are you setting this alarm?</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
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
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={selectedPrivate ? colors.textPrimary : colors.textTertiary}
          />
        </View>
        <Text style={styles.toggleDescription}>
          Hides details on the alarm list. Tap the eye icon to peek.
        </Text>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.saveBtnText}>
          {isEditing ? 'Update Alarm' : 'Save Alarm'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

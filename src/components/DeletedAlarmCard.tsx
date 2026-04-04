import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getButtonStyles } from '../theme/buttonStyles';
import { formatTime, formatDeletedAgo } from '../utils/time';
import { hapticLight, hapticHeavy } from '../utils/haptics';
import type { Alarm } from '../types/alarm';

interface DeletedAlarmCardProps {
  alarm: Alarm;
  timeFormat: '12h' | '24h';
  onRestore: () => void;
  onPermanentDelete: () => void;
}

function DeletedAlarmCard({ alarm, timeFormat, onRestore, onPermanentDelete }: DeletedAlarmCardProps) {
  const { colors } = useTheme();
  const btn = getButtonStyles(colors);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.sectionAlarm + '66',
      borderLeftWidth: 3,
      borderLeftColor: colors.sectionAlarm + '66',
      opacity: 0.7,
      elevation: 1,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    left: { flex: 1, marginRight: 12 },
    time: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textTertiary,
      letterSpacing: -1,
    },
    detail: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 4,
    },
    deletedAgo: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  }), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.time}>
          {formatTime(alarm.time, timeFormat)}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {alarm.private ? 'Alarm' : `${alarm.icon || '\u23F0'} ${alarm.nickname || alarm.note || 'Alarm'}`}
        </Text>
        <Text style={styles.deletedAgo}>
          {formatDeletedAgo(alarm.deletedAt!)}
        </Text>
      </View>
      <View style={styles.right}>
        <TouchableOpacity onPress={() => { hapticLight(); onRestore(); }} style={btn.ghostSmall} activeOpacity={0.7} accessibilityLabel="Restore alarm" accessibilityRole="button">
          <Text style={btn.ghostSmallText}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { hapticHeavy(); onPermanentDelete(); }} style={btn.destructiveSmall} activeOpacity={0.7} accessibilityLabel="Permanently delete alarm" accessibilityRole="button">
          <Text style={btn.destructiveSmallText}>Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(DeletedAlarmCard);

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
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

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.sectionAlarm + '15',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.sectionAlarm,
      borderLeftWidth: 3,
      borderLeftColor: colors.sectionAlarm,
      opacity: 0.7,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    capsuleBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    capsuleBtnText: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    capsuleBtnDestructiveText: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.red,
    },
    left: { flex: 1, marginRight: 12 },
    time: {
      fontSize: 22,
      fontFamily: FONTS.bold,
      color: colors.textTertiary,
      letterSpacing: -1,
    },
    detail: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      marginTop: 4,
    },
    deletedAgo: {
      fontSize: 12,
      fontFamily: FONTS.regular,
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
        <TouchableOpacity onPress={() => { hapticLight(); onRestore(); }} style={styles.capsuleBtn} activeOpacity={0.7} accessibilityLabel="Restore alarm" accessibilityRole="button">
          <Text style={styles.capsuleBtnText}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { hapticHeavy(); onPermanentDelete(); }} style={styles.capsuleBtn} activeOpacity={0.7} accessibilityLabel="Permanently delete alarm" accessibilityRole="button">
          <Text style={styles.capsuleBtnDestructiveText}>Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(DeletedAlarmCard);

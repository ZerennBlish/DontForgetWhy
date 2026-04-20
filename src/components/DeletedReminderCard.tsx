import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Reminder } from '../types/reminder';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { getButtonStyles } from '../theme/buttonStyles';

interface DeletedReminderCardProps {
  reminder: Reminder;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  formatDeletedAgo: (deletedAt: string) => string;
}

function DeletedReminderCard({ reminder, onRestore, onPermanentDelete, formatDeletedAgo }: DeletedReminderCardProps) {
  const { colors } = useTheme();
  const btn = getButtonStyles(colors);

  const styles = useMemo(() => StyleSheet.create({
    deletedCard: {
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.card,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.sectionReminder + '66',
      borderLeftWidth: 3,
      borderLeftColor: colors.sectionReminder + '66',
      marginBottom: 8,
      opacity: 0.7,
      elevation: 1,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    middle: {
      flex: 1,
      marginRight: 12,
    },
    reminderText: {
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
    },
    reminderSecondaryText: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      marginTop: 2,
    },
    deletedAgo: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      fontStyle: 'italic',
      fontFamily: FONTS.regular,
    },
    right: {
      alignItems: 'center',
      gap: 6,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 6,
    },
  }), [colors]);

  const deletedPrimary = reminder.private
    ? (reminder.nickname || 'Private')
    : reminder.nickname
      ? `${reminder.icon} ${reminder.nickname}`
      : reminder.text ? `${reminder.icon} ${reminder.text}` : reminder.icon;
  const deletedSecondary = !reminder.private && reminder.nickname && reminder.text
    ? reminder.text
    : null;

  return (
    <View style={styles.deletedCard}>
      <View style={styles.middle}>
        <Text style={[styles.reminderText, { color: colors.textTertiary }]} numberOfLines={2}>
          {deletedPrimary}
        </Text>
        {deletedSecondary && (
          <Text style={[styles.reminderSecondaryText, { color: colors.textTertiary }]} numberOfLines={2}>
            {deletedSecondary}
          </Text>
        )}
        <Text style={styles.deletedAgo}>
          {formatDeletedAgo(reminder.deletedAt!)}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={styles.btnRow}>
          <TouchableOpacity onPress={() => onRestore(reminder.id)} style={btn.ghostSmall} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Restore reminder">
            <Text style={btn.ghostSmallText}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPermanentDelete(reminder.id)} style={btn.destructiveSmall} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Permanently delete reminder">
            <Text style={btn.destructiveSmallText}>Forever</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default React.memo(DeletedReminderCard);

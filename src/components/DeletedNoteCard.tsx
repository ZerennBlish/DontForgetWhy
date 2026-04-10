import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { formatDeletedAgo } from '../utils/time';
import type { Note } from '../types/note';

interface DeletedNoteCardProps {
  note: Note;
  // Callbacks take the note id so the parent can pass stable references
  // via useCallback. Inline arrows would defeat React.memo.
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

function DeletedNoteCard({ note, onRestore, onPermanentDelete }: DeletedNoteCardProps) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.sectionNotepad + '15',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.sectionNotepad,
      borderLeftWidth: 3,
      borderLeftColor: colors.sectionNotepad,
      marginBottom: 8,
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
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: 0.6,
    },
    iconCircleText: {
      fontSize: 16,
    },
    cardCenter: {
      flex: 1,
      marginHorizontal: 12,
    },
    cardTitle: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
      opacity: 0.7,
    },
    deletedAgo: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
  }), [colors]);

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: note.color }]}>
        <Text style={styles.iconCircleText}>{note.icon || '\u{1F4DD}'}</Text>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {note.text}
        </Text>
        <Text style={styles.deletedAgo}>
          {formatDeletedAgo(note.deletedAt!)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => onRestore(note.id)} style={styles.capsuleBtn} activeOpacity={0.7} accessibilityLabel="Restore note" accessibilityRole="button">
          <Text style={styles.capsuleBtnText}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onPermanentDelete(note.id)} style={styles.capsuleBtn} activeOpacity={0.7} accessibilityLabel="Permanently delete note" accessibilityRole="button">
          <Text style={styles.capsuleBtnDestructiveText}>Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(DeletedNoteCard);

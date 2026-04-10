import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ToastAndroid } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight, hapticMedium } from '../utils/haptics';
import APP_ICONS from '../data/appIconAssets';
import { getRelativeTime } from '../utils/time';
import SwipeableRow from './SwipeableRow';
import type { Note } from '../types/note';

interface NoteCardProps {
  note: Note;
  isPinned: boolean;
  // Callbacks take the note (or its id) so the parent can pass stable
  // references via useCallback. Wrapping in inline arrows at the call
  // site would defeat React.memo on this component.
  onPress: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function NoteCard({ note, isPinned, onPress, onDelete, onTogglePin }: NoteCardProps) {
  const { colors } = useTheme();

  const firstLine = note.text.split('\n')[0];
  const truncated = firstLine.length > 50 ? firstLine.slice(0, 50) + '\u2026' : firstLine;

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
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
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
    },
    cardSubtitle: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pinBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    pinBtnActive: {
      borderColor: colors.accent,
    },
    pinBtnText: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    pinnedDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
      marginLeft: 6,
    },
  }), [colors]);

  // These thin wrappers stay stable across renders inside the memoized
  // card body — they only get re-created when the card itself re-renders,
  // which (thanks to React.memo) only happens when its props actually
  // change. They bridge the parent's id-based handlers to the local DOM.
  const handleCardPress = () => { hapticLight(); onPress(note); };
  const handlePinPress = () => onTogglePin(note.id);
  const handleSwipeDelete = () => onDelete(note.id);

  return (
    <SwipeableRow onDelete={handleSwipeDelete}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: note.color }]}>
          <Text style={styles.iconCircleText}>{note.icon || '\u{1F4DD}'}</Text>
        </View>
        <TouchableOpacity
          style={styles.cardCenter}
          onPress={handleCardPress}
          accessibilityRole="button"
          accessibilityLabel={`Note: ${truncated || 'Empty note'}`}
          accessibilityHint="Long press to copy"
          onLongPress={async () => {
            hapticMedium();
            try {
              await Clipboard.setStringAsync(note.text);
              ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
            } catch {
              ToastAndroid.show("Couldn't copy", ToastAndroid.SHORT);
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle} numberOfLines={1}>{truncated}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {getRelativeTime(note.updatedAt)}
            </Text>
            {(note.images?.length ?? 0) > 0 && (
              <>
                <Text style={styles.cardSubtitle}> · </Text>
                <Image source={APP_ICONS.camera} style={{ width: 12, height: 12 }} resizeMode="contain" />
                <Text style={styles.cardSubtitle}> {note.images!.length}</Text>
              </>
            )}
            {isPinned && <View style={styles.pinnedDot} />}
          </View>
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={handlePinPress}
            style={[styles.pinBtn, isPinned && styles.pinBtnActive]}
            activeOpacity={0.6}
            accessibilityLabel={isPinned ? 'Unpin note' : 'Pin note'}
            accessibilityRole="button"
          >
            <Text style={[styles.pinBtnText, isPinned && { color: colors.accent }]}>
              {isPinned ? 'Pinned' : 'Pin'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SwipeableRow>
  );
}

export default React.memo(NoteCard);

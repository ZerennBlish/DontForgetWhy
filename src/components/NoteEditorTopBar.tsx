import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import BackButton from './BackButton';
import { useAppIcon } from '../hooks/useAppIcon';

interface NoteEditorTopBarProps {
  isViewMode: boolean;
  hasChanges: boolean;
  hasNote: boolean;
  onBack: () => void;
  onHome: () => void;
  onEdit: () => void;
  onSave: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export default function NoteEditorTopBar({
  isViewMode,
  hasChanges,
  hasNote,
  onBack,
  onHome,
  onEdit,
  onSave,
  onShare,
  onDelete,
}: NoteEditorTopBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const houseIcon = useAppIcon('home');
  const editIcon = useAppIcon('edit');
  const shareIcon = useAppIcon('share');
  const trashIcon = useAppIcon('trash');
  const saveIcon = useAppIcon('save');

  const styles = useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    left: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    center: {
      flex: 1,
      alignItems: 'center',
    },
    right: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
    },
    circleBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    circleBtnLight: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    saveBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    smallBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    trashBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.red,
    },
    homeBtn: {
      marginLeft: 4,
    },
  }), [colors, insets.top]);

  return (
    <View style={styles.container}>
      {isViewMode ? (
        <>
          <View style={styles.left}>
            <BackButton onPress={onBack} />
            <TouchableOpacity
              style={[styles.circleBtn, styles.homeBtn]}
              onPress={onHome}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go to home screen"
            >
              <Image source={houseIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </TouchableOpacity>
          </View>
          <View style={styles.center} />
          <View style={styles.right}>
            <TouchableOpacity
              style={styles.circleBtnLight}
              onPress={() => { hapticLight(); onEdit(); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Edit note"
            >
              <Image source={editIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={() => { hapticLight(); onShare(); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Share note"
            >
              <Image source={shareIcon} style={{ width: 22, height: 22 }} resizeMode="contain" />
            </TouchableOpacity>
            {hasNote && (
              <TouchableOpacity
                style={styles.trashBtn}
                onPress={onDelete}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
              >
                <Image source={trashIcon} style={{ width: 20, height: 20 }} resizeMode="contain" />
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <>
          <View style={styles.left}>
            <BackButton onPress={onBack} />
            <TouchableOpacity
              style={[styles.circleBtn, styles.homeBtn]}
              onPress={onHome}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go to home screen"
            >
              <Image source={houseIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </TouchableOpacity>
          </View>
          <View style={styles.center} />
          <View style={styles.right}>
            {hasChanges && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={onSave}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Save note"
              >
                <Image source={saveIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
              </TouchableOpacity>
            )}
            {hasNote && (
              <TouchableOpacity
                style={styles.trashBtn}
                onPress={onDelete}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
              >
                <Image source={trashIcon} style={{ width: 20, height: 20 }} resizeMode="contain" />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

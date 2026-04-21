import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import { useAppIcon } from '../hooks/useAppIcon';

interface NoteEditorToolbarProps {
  onToggleAttachments: () => void;
  attachmentsActive: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onDraw: () => void;
  onToggleColors: () => void;
  colorsActive: boolean;
  attachmentCount: number;
}

export default function NoteEditorToolbar({
  onToggleAttachments,
  attachmentsActive,
  onCamera,
  onGallery,
  onDraw,
  onToggleColors,
  colorsActive,
  attachmentCount,
}: NoteEditorToolbarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const paperclipIcon = useAppIcon('paperclip');
  const cameraIcon = useAppIcon('camera');
  const imageIcon = useAppIcon('image');
  const paintbrushIcon = useAppIcon('paintbrush');
  const paletteIcon = useAppIcon('palette');

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 10,
      paddingBottom: 10 + insets.bottom,
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    circle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    circleActive: {
      borderColor: colors.accent,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.85)' : 'rgba(0, 0, 0, 0.10)',
    },
    label: {
      fontSize: 10,
      fontFamily: FONTS.regular,
      color: colors.textSecondary,
      marginTop: 4,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      fontSize: 9,
      fontFamily: FONTS.bold,
      color: '#FFFFFF',
    },
  }), [colors, insets.bottom]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => { hapticLight(); onToggleAttachments(); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Toggle attachments"
      >
        <View style={[styles.circle, attachmentsActive && styles.circleActive]}>
          <Image source={paperclipIcon} style={{ width: 34, height: 34 }} resizeMode="contain" />
          {attachmentCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{attachmentCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.label}>Attached</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => { hapticLight(); onCamera(); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Take photo"
      >
        <View style={styles.circle}>
          <Image source={cameraIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </View>
        <Text style={styles.label}>Camera</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => { hapticLight(); onGallery(); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Add photo from gallery"
      >
        <View style={styles.circle}>
          <Image source={imageIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </View>
        <Text style={styles.label}>Gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => { hapticLight(); onDraw(); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Add drawing"
      >
        <View style={styles.circle}>
          <Image source={paintbrushIcon} style={{ width: 28, height: 28 }} resizeMode="contain" />
        </View>
        <Text style={styles.label}>Draw</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => { hapticLight(); onToggleColors(); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Note colors"
      >
        <View style={[styles.circle, colorsActive && styles.circleActive]}>
          <Image source={paletteIcon} style={{ width: 38, height: 38 }} resizeMode="contain" />
        </View>
        <Text style={styles.label}>Colors</Text>
      </TouchableOpacity>
    </View>
  );
}

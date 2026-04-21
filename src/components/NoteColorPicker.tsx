import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import { getTextColor } from '../utils/noteColors';
import { NOTE_COLORS, NOTE_FONT_COLORS } from '../types/note';
import { useAppIcon } from '../hooks/useAppIcon';

interface NoteColorPickerProps {
  editorColor: string;
  onSelectBgColor: (color: string) => void;
  editorFontColor: string | null;
  onSelectFontColor: (fontColor: string | null) => void;
  customBgColor: string | null;
  customFontColor: string | null;
  onOpenBgPicker: () => void;
  onOpenFontPicker: () => void;
  onApplyCustomBg: () => void;
  onApplyCustomFont: () => void;
  noteTextColor: string;
  resolvedFontColor: string;
}

export default function NoteColorPicker({
  editorColor,
  onSelectBgColor,
  editorFontColor,
  onSelectFontColor,
  customBgColor,
  customFontColor,
  onOpenBgPicker,
  onOpenFontPicker,
  onApplyCustomBg,
  onApplyCustomFont,
  noteTextColor,
  resolvedFontColor,
}: NoteColorPickerProps) {
  const { colors } = useTheme();
  const plusIcon = useAppIcon('plus');

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: editorColor,
      borderTopWidth: 1,
      borderTopColor: noteTextColor + '20',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      maxHeight: 280,
    },
    rowLabel: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      marginBottom: 6,
    },
    colorRow: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    },
    colorDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorDotSelected: {
      borderWidth: 3,
      borderColor: colors.textPrimary,
    },
    colorCheck: {
      fontSize: 16,
      color: '#FFFFFF',
      fontFamily: FONTS.bold,
    },
    fontColorRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
      marginTop: 12,
    },
    fontColorDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fontColorDotSelected: {
      borderWidth: 2.5,
      borderColor: colors.textPrimary,
    },
    fontColorCheck: {
      fontSize: 12,
      fontFamily: FONTS.bold,
    },
    addBtn: {
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
    },
    dashedSlot: {
      borderWidth: 2,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      borderStyle: 'dashed' as const,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.5)' : 'rgba(0, 0, 0, 0.04)',
    },
    dashedSlotSmall: {
      borderWidth: 1.5,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      borderStyle: 'dashed' as const,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.5)' : 'rgba(0, 0, 0, 0.04)',
    },
  }), [colors, editorColor, noteTextColor]);

  const isCustomBgSelected = !!customBgColor && editorColor === customBgColor && !NOTE_COLORS.slice(0, -1).includes(editorColor);
  const isCustomFcSelected = !!customFontColor && editorFontColor === customFontColor && !NOTE_FONT_COLORS.slice(0, -1).filter(x => x !== 'auto').includes(editorFontColor!);

  return (
    <View style={styles.container}>
      <Text style={[styles.rowLabel, { color: noteTextColor + '99' }]}>Background</Text>
      <View style={styles.colorRow}>
        {NOTE_COLORS.filter((c) => c !== 'custom').map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              editorColor === c && styles.colorDotSelected,
            ]}
            onPress={() => { hapticLight(); onSelectBgColor(c); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Background color ${c}`}
            accessibilityState={{ selected: editorColor === c }}
          >
            {editorColor === c && <Text style={[styles.colorCheck, { color: getTextColor(c) }]}>{'\u2713'}</Text>}
          </TouchableOpacity>
        ))}
        {/* Custom color slot */}
        <TouchableOpacity
          style={[
            styles.colorDot,
            customBgColor
              ? { backgroundColor: customBgColor }
              : styles.dashedSlot,
            isCustomBgSelected && styles.colorDotSelected,
          ]}
          onPress={() => {
            hapticLight();
            if (customBgColor) {
              onApplyCustomBg();
            } else {
              onOpenBgPicker();
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Custom background color"
          accessibilityState={{ selected: isCustomBgSelected }}
        >
          {isCustomBgSelected && <Text style={[styles.colorCheck, { color: getTextColor(customBgColor!) }]}>{'\u2713'}</Text>}
        </TouchableOpacity>
        {/* Picker button */}
        <TouchableOpacity
          style={[styles.colorDot, styles.addBtn]}
          onPress={() => { hapticLight(); onOpenBgPicker(); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add custom background color"
        >
          <Image source={plusIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.rowLabel, { color: resolvedFontColor, marginTop: 14 }]}>A  Text Color</Text>
      <View style={styles.fontColorRow}>
        {NOTE_FONT_COLORS.filter((fc) => fc !== 'custom').map((fc) => {
          const isAuto = fc === 'auto';
          const isSelected = isAuto ? !editorFontColor : editorFontColor === fc;
          const dotBg = isAuto ? undefined : fc;
          return (
            <TouchableOpacity
              key={fc}
              style={[
                styles.fontColorDot,
                isAuto ? { borderWidth: 1.5, borderColor: noteTextColor + '50', overflow: 'hidden' as const } : { backgroundColor: dotBg },
                isSelected && styles.fontColorDotSelected,
              ]}
              onPress={() => { hapticLight(); onSelectFontColor(isAuto ? null : fc); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isAuto ? 'Automatic text color' : `Text color ${fc}`}
              accessibilityState={{ selected: isSelected }}
            >
              {isAuto ? (
                <View style={{ flexDirection: 'row', flex: 1, width: '100%', height: '100%' }}>
                  <View style={{ flex: 1, backgroundColor: '#1A1A2E' }} />
                  <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
                </View>
              ) : isSelected ? (
                <Text style={[styles.fontColorCheck, { color: getTextColor(fc) }]}>{'\u2713'}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
        {/* Custom font color slot */}
        <TouchableOpacity
          style={[
            styles.fontColorDot,
            customFontColor
              ? { backgroundColor: customFontColor }
              : styles.dashedSlotSmall,
            isCustomFcSelected && styles.fontColorDotSelected,
          ]}
          onPress={() => {
            hapticLight();
            if (customFontColor) {
              onApplyCustomFont();
            } else {
              onOpenFontPicker();
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Custom text color"
          accessibilityState={{ selected: isCustomFcSelected }}
        >
          {isCustomFcSelected && <Text style={[styles.fontColorCheck, { color: getTextColor(customFontColor!) }]}>{'\u2713'}</Text>}
        </TouchableOpacity>
        {/* Font picker button */}
        <TouchableOpacity
          style={[styles.fontColorDot, styles.addBtn]}
          onPress={() => { hapticLight(); onOpenFontPicker(); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add custom text color"
        >
          <Image source={plusIcon} style={{ width: 20, height: 20 }} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

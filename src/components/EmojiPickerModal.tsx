import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';
import { emojiCategories } from '../data/emojiData';

interface EmojiPickerModalProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const ALL_EMOJI = emojiCategories.flatMap((cat) => cat.emojis);

export default function EmojiPickerModal({ visible, onSelect, onClose }: EmojiPickerModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSelect = useCallback((emoji: string) => {
    hapticLight();
    onSelect(emoji);
    onClose();
  }, [onSelect, onClose]);

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: insets.bottom + 16,
      height: '55%',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeBtnText: {
      fontSize: 16,
      color: colors.textTertiary,
      fontWeight: '600',
    },
    grid: {
      paddingHorizontal: 8,
    },
    emojiBtn: {
      width: '12.5%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    emojiText: {
      fontSize: 24,
    },
  }), [colors, insets.bottom]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Pick an Icon</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            style={{ flex: 1 }}
            data={ALL_EMOJI}
            keyExtractor={(item, idx) => `${item}-${idx}`}
            numColumns={8}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.emojiBtn}
                onPress={() => handleSelect(item)}
                activeOpacity={0.6}
              >
                <Text style={styles.emojiText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

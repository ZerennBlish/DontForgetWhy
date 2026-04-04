import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';
import { emojiCategories, EmojiItem } from '../data/emojiData';

interface EmojiPickerModalProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPickerModal({ visible, onSelect, onClose }: EmojiPickerModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState(0);

  const handleSelect = useCallback((emoji: string) => {
    hapticLight();
    onSelect(emoji);
    onClose();
  }, [onSelect, onClose]);

  const handleCategoryPress = useCallback((index: number) => {
    hapticLight();
    setActiveCategory(index);
  }, []);

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
    tabBar: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    tabActive: {
      backgroundColor: colors.accent + '20',
      borderColor: colors.accent,
    },
    tabIcon: {
      fontSize: 16,
      marginRight: 6,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    tabLabelActive: {
      color: colors.accent,
    },
    grid: {
      paddingHorizontal: 8,
      paddingTop: 4,
    },
    emojiBtn: {
      width: '25%',
      aspectRatio: 0.85,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    emojiText: {
      fontSize: 24,
    },
    emojiLabel: {
      fontSize: 10,
      color: colors.textTertiary,
      marginTop: 2,
    },
  }), [colors, insets.bottom]);

  const renderEmojiItem = useCallback(({ item }: { item: EmojiItem }) => (
    <TouchableOpacity
      style={styles.emojiBtn}
      onPress={() => handleSelect(item.emoji)}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <Text style={styles.emojiText}>{item.emoji}</Text>
      <Text style={styles.emojiLabel} numberOfLines={1}>{item.label}</Text>
    </TouchableOpacity>
  ), [styles, handleSelect]);

  const items = emojiCategories[activeCategory].items;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Pick an Icon</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close picker"
            >
              <Text style={styles.closeBtnText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBar}
          >
            {emojiCategories.map((category, index) => {
              const isActive = index === activeCategory;
              return (
                <TouchableOpacity
                  key={category.label}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => handleCategoryPress(index)}
                  activeOpacity={0.7}
                  accessibilityRole="tab"
                  accessibilityLabel={category.label}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={styles.tabIcon}>{category.icon}</Text>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <FlatList
            style={{ flex: 1 }}
            data={items}
            keyExtractor={(item) => `${item.emoji}-${item.label}`}
            numColumns={4}
            contentContainerStyle={styles.grid}
            renderItem={renderEmojiItem}
            removeClippedSubviews={true}
          />
        </View>
      </View>
    </Modal>
  );
}

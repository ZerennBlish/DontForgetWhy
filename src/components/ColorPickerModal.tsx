import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { getButtonStyles } from '../theme/buttonStyles';
import { hapticLight, hapticMedium } from '../utils/haptics';

interface ColorPickerModalProps {
  visible: boolean;
  title: string;
  initialColor: string;
  onApply: (hex: string) => void;
  onCancel: () => void;
}

export default function ColorPickerModal({ visible, title, initialColor, onApply, onCancel }: ColorPickerModalProps) {
  const { colors } = useTheme();
  const btn = getButtonStyles(colors);
  const pickedRef = useRef(initialColor);

  React.useEffect(() => {
    if (visible) {
      pickedRef.current = initialColor;
    }
  }, [visible, initialColor]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <ColorPicker
            key={visible ? initialColor : 'closed'}
            value={pickedRef.current}
            onCompleteJS={(result: ColorFormatsObject) => { pickedRef.current = result.hex; }}
          >
            <View style={styles.wrapper}>
              <Preview hideInitialColor />
              <Panel1 />
              <HueSlider />
            </View>
          </ColorPicker>
          <View style={styles.btns}>
            <TouchableOpacity
              onPress={() => { hapticLight(); onCancel(); }}
              style={[btn.secondary, { flex: 1 }]}
              activeOpacity={0.7}
            >
              <Text style={btn.secondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { hapticMedium(); onApply(pickedRef.current); }}
              style={[btn.primary, { flex: 1 }]}
              activeOpacity={0.7}
            >
              <Text style={btn.primaryText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginBottom: 20,
  },
  wrapper: {
    gap: 16,
  },
  btns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});

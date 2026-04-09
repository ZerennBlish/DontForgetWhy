import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { getButtonStyles } from '../theme/buttonStyles';

interface DrawingPickerModalProps {
  visible: boolean;
  title: string;
  initialColor: string;
  onApply: (hex: string) => void;
  onCancel: () => void;
}

export default function DrawingPickerModal({
  visible,
  title,
  initialColor,
  onApply,
  onCancel,
}: DrawingPickerModalProps) {
  const { colors } = useTheme();
  const btn = getButtonStyles(colors);
  const pickedRef = useRef(initialColor);

  useEffect(() => {
    if (visible) {
      pickedRef.current = initialColor;
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.95)' : 'rgba(245, 245, 250, 0.98)', borderRadius: 16, padding: 20, marginHorizontal: 32, width: '85%' }}>
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontFamily: FONTS.bold, marginBottom: 16, textAlign: 'center' }}>{title}</Text>
          <ColorPicker
            value={pickedRef.current}
            onCompleteJS={(result: ColorFormatsObject) => { pickedRef.current = result.hex; }}
          >
            <View style={{ gap: 16 }}>
              <Preview hideInitialColor />
              <Panel1 />
              <HueSlider />
            </View>
          </ColorPicker>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => { hapticLight(); onCancel(); }}
              style={[btn.secondarySmall, { flex: 1 }]}
              activeOpacity={0.7}
            >
              <Text style={btn.secondarySmallText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                hapticMedium();
                onApply(pickedRef.current);
                onCancel();
              }}
              style={[btn.primarySmall, { flex: 1 }]}
              activeOpacity={0.7}
            >
              <Text style={btn.primarySmallText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

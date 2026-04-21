import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppIcon } from '../hooks/useAppIcon';

interface ImageLightboxProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

export default function ImageLightbox({ visible, imageUri, onClose }: ImageLightboxProps) {
  const insets = useSafeAreaInsets();
  const closeXIcon = useAppIcon('closeX');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close image viewer" accessibilityViewIsModal={true}>
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        )}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 16 }]}
          onPress={onClose}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close image viewer"
        >
          <Image source={closeXIcon} style={{ width: 18, height: 18 }} resizeMode="contain" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

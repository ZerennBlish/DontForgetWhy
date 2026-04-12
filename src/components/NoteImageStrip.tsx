import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { hapticLight } from '../utils/haptics';
import { loadDrawingData } from '../services/noteImageStorage';
import APP_ICONS from '../data/appIconAssets';
import type { StrokeData } from './DrawingCanvas';

interface NoteImageStripProps {
  images: string[];
  isViewMode: boolean;
  onRemoveImage: (index: number) => void;
  onViewImage: (uri: string) => void;
  onEditDrawing: (uri: string, drawingData: { strokes: StrokeData[]; bgColor: string; sourceImageUri?: string | null }) => void;
  onDrawOnPhoto: (uri: string) => void;
}

export default function NoteImageStrip({
  images,
  isViewMode,
  onRemoveImage,
  onViewImage,
  onEditDrawing,
  onDrawOnPhoto,
}: NoteImageStripProps) {
  return (
    <View style={styles.thumbnailRow}>
      {images.map((uri, idx) => (
        <TouchableOpacity
          key={`${uri}-${idx}`}
          onPress={async () => {
            const drawingData = await loadDrawingData(uri);
            if (drawingData) {
              Alert.alert('Drawing', '', [
                { text: 'View', onPress: () => onViewImage(uri) },
                { text: 'Edit', onPress: () => onEditDrawing(uri, drawingData) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            } else {
              if (isViewMode) {
                onViewImage(uri);
              } else {
                Alert.alert('Photo', '', [
                  { text: 'View', onPress: () => onViewImage(uri) },
                  { text: 'Draw On', onPress: () => onDrawOnPhoto(uri) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }
            }
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="View image"
        >
          <Image source={{ uri }} style={styles.thumbnail} resizeMethod="resize" />
          {!isViewMode && (
            <TouchableOpacity
              style={styles.thumbnailRemove}
              onPress={() => {
                hapticLight();
                onRemoveImage(idx);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Remove image"
            >
              <Image source={APP_ICONS.closeX} style={{ width: 10, height: 10 }} resizeMode="contain" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnailRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  thumbnailRemove: {
    position: 'absolute',
    top: 2,
    right: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

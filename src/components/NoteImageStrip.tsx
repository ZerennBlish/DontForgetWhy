import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Image, Alert, ScrollView, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
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
  const { colors } = useTheme();
  return (
    <View>
    <Text style={{
      fontSize: 11,
      fontFamily: FONTS.bold,
      color: colors.textTertiary,
      letterSpacing: 1.5,
      marginBottom: 8,
      textAlign: 'center',
    }}>PHOTOS</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}
    >
      {images.map((uri, idx) => (
        <View key={`${uri}-${idx}`} style={{ position: 'relative' }}>
          <TouchableOpacity
            onPress={async () => {
              const drawingData = await loadDrawingData(uri);
              if (drawingData) {
                if (isViewMode) {
                  onViewImage(uri);
                } else {
                  Alert.alert('Drawing', '', [
                    { text: 'View', onPress: () => onViewImage(uri) },
                    { text: 'Edit', onPress: () => onEditDrawing(uri, drawingData) },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }
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
          </TouchableOpacity>
          {!isViewMode && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: colors.red,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.6)',
              }}
              hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
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
        </View>
      ))}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
});

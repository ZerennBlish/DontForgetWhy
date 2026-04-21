import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { FONTS } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';
import MEDIA_ICONS, { GlowIcon } from '../assets/mediaIcons';
import { useAppIcon } from '../hooks/useAppIcon';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const voiceMemoStyles = StyleSheet.create({
  memoRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  memoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 30, 0.85)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  memoPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoProgress: {
    flex: 1,
    gap: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  memoTime: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  memoDeleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export { voiceMemoStyles };

interface MemoCardProps {
  isActive: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  accentColor: string;
  isViewMode: boolean;
  onPlay: () => void;
  onSeek: (e: GestureResponderEvent, duration: number) => void;
  onDelete: () => void;
  onProgressLayout: (width: number) => void;
}

export function MemoCard({ isActive, isPlaying, currentTime, duration, accentColor, isViewMode, onPlay, onSeek, onDelete, onProgressLayout }: MemoCardProps) {
  const { colors } = useTheme();
  const closeXIcon = useAppIcon('closeX');
  const progress = duration > 0 ? currentTime / duration : 0;
  return (
    <View style={voiceMemoStyles.memoCard}>
      <TouchableOpacity
        style={voiceMemoStyles.memoPlayBtn}
        onPress={onPlay}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause voice memo" : "Play voice memo"}
      >
        {isPlaying ? (
          <GlowIcon source={MEDIA_ICONS.pause} size={20} glowColor={colors.success} />
        ) : (
          <GlowIcon source={MEDIA_ICONS.play} size={20} glowColor={accentColor} />
        )}
      </TouchableOpacity>
      <View style={voiceMemoStyles.memoProgress}>
        <View
          style={voiceMemoStyles.progressTrack}
          onLayout={(e) => { onProgressLayout(e.nativeEvent.layout.width); }}
          onStartShouldSetResponder={() => isActive && duration > 0}
          onResponderGrant={(e) => onSeek(e, duration)}
          onResponderMove={(e) => onSeek(e, duration)}
        >
          <View style={[voiceMemoStyles.progressFill, { width: `${progress * 100}%`, backgroundColor: accentColor }]} />
        </View>
        <Text style={voiceMemoStyles.memoTime}>
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </Text>
      </View>
      {!isViewMode && (
        <TouchableOpacity
          style={voiceMemoStyles.memoDeleteBtn}
          onPress={onDelete}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Remove voice memo from note"
        >
          <Image source={closeXIcon} style={{ width: 12, height: 12 }} resizeMode="contain" />
        </TouchableOpacity>
      )}
    </View>
  );
}

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { FONTS } from '../theme/fonts';
import MEDIA_ICONS, { GlowIcon } from '../assets/mediaIcons';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const voiceMemoStyles = StyleSheet.create({
  recordingControls: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  recordingBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pauseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: '#FF4444',
  },
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
  memoDeleteText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: FONTS.bold,
  },
});

export { voiceMemoStyles };

interface RecordingControlsProps {
  isPaused: boolean;
  durationMillis: number;
  onPauseToggle: () => void;
  onStop: () => void;
}

export function RecordingControls({ isPaused, durationMillis, onPauseToggle, onStop }: RecordingControlsProps) {
  return (
    <View style={voiceMemoStyles.recordingControls}>
      <View style={voiceMemoStyles.recordingInfo}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isPaused ? '#FFA500' : '#FF4444' }} />
        <Text style={voiceMemoStyles.recordingText}>
          {isPaused ? 'Paused' : 'Recording'} {formatDuration(durationMillis / 1000)}
        </Text>
      </View>
      <View style={voiceMemoStyles.recordingBtnRow}>
        <TouchableOpacity onPress={onPauseToggle} style={voiceMemoStyles.pauseBtn} activeOpacity={0.7}>
          {isPaused ? (
            <GlowIcon source={MEDIA_ICONS.play} size={26} glowColor="#4CAF50" />
          ) : (
            <GlowIcon source={MEDIA_ICONS.pause} size={26} glowColor="#4CAF50" />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onStop} style={voiceMemoStyles.stopBtn} activeOpacity={0.7}>
          <GlowIcon source={MEDIA_ICONS.stop} size={26} glowColor="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface MemoCardProps {
  isActive: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  accentColor: string;
  isViewMode: boolean;
  onPlay: () => void;
  onSeek: (e: any, duration: number) => void;
  onDelete: () => void;
  onProgressLayout: (width: number) => void;
}

export function MemoCard({ isActive, isPlaying, currentTime, duration, accentColor, isViewMode, onPlay, onSeek, onDelete, onProgressLayout }: MemoCardProps) {
  const progress = duration > 0 ? currentTime / duration : 0;
  return (
    <View style={voiceMemoStyles.memoCard}>
      <TouchableOpacity
        style={voiceMemoStyles.memoPlayBtn}
        onPress={onPlay}
        activeOpacity={0.7}
      >
        {isPlaying ? (
          <GlowIcon source={MEDIA_ICONS.pause} size={20} glowColor="#4CAF50" />
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
        >
          <Text style={voiceMemoStyles.memoDeleteText}>{'\u2715'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import MEDIA_ICONS from '../assets/mediaIcons';
import { FONTS } from '../theme/fonts';
import type { VoiceMemo } from '../types/voiceMemo';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const date = new Date(isoDate);
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

interface VoiceMemoCardProps {
  memo: VoiceMemo;
  // Callbacks take the memo (or its id) so the parent can pass stable
  // useCallback references and React.memo can skip re-renders.
  onPress: (memo: VoiceMemo) => void;
  onPlayToggle: (memo: VoiceMemo) => void;
  isPlaying: boolean;
  // Progress is read from a parent-owned ref, NOT prop state. The parent
  // updates the ref every 500ms without re-rendering itself; only the
  // currently-playing card subscribes to those updates via a local
  // interval, so non-playing cards never re-render during playback.
  progressRef?: React.MutableRefObject<number>;
  onPin?: (id: string) => void;
  isPinned?: boolean;
}

function VoiceMemoCard({
  memo,
  onPress,
  onPlayToggle,
  isPlaying,
  progressRef,
  onPin,
  isPinned,
}: VoiceMemoCardProps) {
  const { colors } = useTheme();

  // Local progress state — only updated when this card is the playing
  // card. The interval polls the parent's ref so the parent never has
  // to re-render to push progress through props.
  const [localProgress, setLocalProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isPlaying || !progressRef) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setLocalProgress(0);
      return;
    }
    setLocalProgress(progressRef.current);
    intervalRef.current = setInterval(() => {
      if (progressRef.current !== undefined) {
        setLocalProgress(progressRef.current);
      }
    }, 250);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, progressRef]);

  const clipCount = memo.clipCount ?? 0;
  const totalDuration = memo.totalDuration ?? memo.duration ?? 0;
  const clipInfo = clipCount > 1
    ? `${clipCount} clips \u00B7 ${formatDuration(totalDuration)}`
    : formatDuration(totalDuration);

  const handlePlayPress = () => {
    // Clips-based memo (no legacy single uri) → open detail for playback
    if (!memo.uri) {
      onPress(memo);
      return;
    }
    onPlayToggle(memo);
  };
  const handleCenterPress = () => onPress(memo);
  const handlePinPress = onPin ? () => onPin(memo.id) : undefined;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.sectionVoice + '15',
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.sectionVoice,
          borderLeftWidth: 3,
          borderLeftColor: colors.sectionVoice,
          marginBottom: 8,
          elevation: 2,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
        },
        playBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.sectionVoice,
          justifyContent: 'center',
          alignItems: 'center',
        },
        center: {
          flex: 1,
          marginHorizontal: 12,
        },
        title: {
          fontSize: 14,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
        },
        subtitle: {
          fontSize: 12,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          marginTop: 2,
        },
        miniTrack: {
          height: 3,
          borderRadius: 1.5,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          marginTop: 6,
          overflow: 'hidden',
        },
        miniFill: {
          height: '100%',
          borderRadius: 1.5,
          backgroundColor: colors.sectionVoice,
        },
        actions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        pinBtn: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
          borderWidth: 1,
          borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        },
        pinBtnActive: {
          borderColor: colors.accent,
        },
        pinBtnText: {
          fontSize: 11,
          fontFamily: FONTS.semiBold,
          color: colors.textTertiary,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.playBtn}
        onPress={handlePlayPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause memo' : 'Play memo'}
      >
        {isPlaying ? (
          <Image source={MEDIA_ICONS.pause} style={{ width: 18, height: 18 }} resizeMode="contain" />
        ) : (
          <Image source={MEDIA_ICONS.play} style={{ width: 18, height: 18 }} resizeMode="contain" />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.center}
        onPress={handleCenterPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Voice memo: ${memo.title || 'Untitled'}, ${clipInfo}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.title} numberOfLines={1}>
            {memo.title || 'Voice Memo'}
          </Text>
          {isPinned && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginLeft: 6 }} />}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {clipInfo} {'\u00B7'} {formatRelativeTime(memo.createdAt)}
        </Text>
        {localProgress > 0 && (
          <View style={styles.miniTrack}>
            <View
              style={[
                styles.miniFill,
                { width: `${localProgress * 100}%` },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>

      {handlePinPress && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.pinBtn, isPinned && styles.pinBtnActive]}
            onPress={handlePinPress}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={isPinned ? 'Unpin voice memo' : 'Pin voice memo'}
          >
            <Text style={[styles.pinBtnText, isPinned && { color: colors.accent }]}>
              {isPinned ? 'Pinned' : 'Pin'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default React.memo(VoiceMemoCard);

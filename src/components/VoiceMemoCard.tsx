import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
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
  onPress: () => void;
  onPlayToggle: () => void;
  isPlaying: boolean;
  playbackProgress: number;
  onPin?: () => void;
  isPinned?: boolean;
  onDelete?: () => void;
}

function VoiceMemoCard({
  memo,
  onPress,
  onPlayToggle,
  isPlaying,
  playbackProgress,
  onPin,
  isPinned,
  onDelete,
}: VoiceMemoCardProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card + 'CC',
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: 3,
          borderLeftColor: '#A29BFE',
          marginBottom: 8,
        },
        playBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#4CAF50',
          justifyContent: 'center',
          alignItems: 'center',
        },
        playTriangle: {
          width: 0,
          height: 0,
          borderLeftWidth: 10,
          borderLeftColor: '#FFFFFF',
          borderTopWidth: 7,
          borderTopColor: 'transparent',
          borderBottomWidth: 7,
          borderBottomColor: 'transparent',
          marginLeft: 3,
        },
        pauseBars: {
          flexDirection: 'row',
          gap: 3,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pauseBar: {
          width: 3,
          height: 12,
          backgroundColor: '#FFFFFF',
          borderRadius: 1,
        },
        center: {
          flex: 1,
          marginHorizontal: 12,
        },
        title: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.textPrimary,
        },
        subtitle: {
          fontSize: 12,
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
          backgroundColor: '#A29BFE',
        },
        actions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        pinBtn: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: 'rgba(30, 30, 40, 0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        pinBtnActive: {
          backgroundColor: 'rgba(30, 30, 40, 0.85)',
        },
        pinBtnText: {
          fontSize: 12,
        },
        deleteBtn: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: 'rgba(30, 30, 40, 0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        deleteText: {
          fontSize: 11,
          fontWeight: '600',
          color: '#EF4444',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.playBtn}
        onPress={onPlayToggle}
        activeOpacity={0.7}
      >
        {isPlaying ? (
          <View style={styles.pauseBars}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        ) : (
          <View style={styles.playTriangle} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.center}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.title} numberOfLines={1}>
          {memo.title || 'Voice Memo'}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {formatDuration(memo.duration)} {'\u00B7'}{' '}
          {formatRelativeTime(memo.createdAt)}
        </Text>
        {playbackProgress > 0 && (
          <View style={styles.miniTrack}>
            <View
              style={[
                styles.miniFill,
                { width: `${playbackProgress * 100}%` },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>

      {(onPin || onDelete) && (
        <View style={styles.actions}>
          {onPin && (
            <TouchableOpacity
              style={[styles.pinBtn, isPinned && styles.pinBtnActive]}
              onPress={onPin}
              activeOpacity={0.6}
            >
              <Text style={[styles.pinBtnText, { opacity: isPinned ? 1 : 0.3 }]}>
                {'\u{1F4CC}'}
              </Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={onDelete}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default React.memo(VoiceMemoCard);

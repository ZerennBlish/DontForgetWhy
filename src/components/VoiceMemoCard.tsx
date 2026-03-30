import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.playBtn}
        onPress={onPlayToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.playIcon}>
          {isPlaying ? '\u23F8\uFE0F' : '\u25B6\uFE0F'}
        </Text>
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

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 50, 0.8)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#A29BFE',
    marginBottom: 8,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#A29BFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 16,
  },
  center: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
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
});

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ToastAndroid,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import * as VMStore from '../services/voiceMemoStorage';
import { deleteVoiceMemoFile } from '../services/voiceMemoFileStorage';
import {
  getPinnedVoiceMemos,
  togglePinVoiceMemo,
  unpinVoiceMemo,
  pruneVoiceMemoPins,
  isVoiceMemoPinned,
} from '../services/widgetPins';
import { refreshWidgets } from '../widget/updateWidget';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import VoiceMemoCard from '../components/VoiceMemoCard';
import UndoToast from '../components/UndoToast';
import { createAudioPlayer } from 'expo-audio';
import type { VoiceMemo } from '../types/voiceMemo';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceMemoList'>;

const MAX_VOICE_MEMO_PINS = 4;

const EMPTY_MESSAGES = [
  'Nothing to hear here. Suspiciously quiet.',
  'No voice memos yet. Your thoughts are still trapped in your head.',
  'Silence. The sound of someone who keeps forgetting to record things.',
  "Your voice memo list is empty. Your head probably isn't.",
  'No recordings yet. All those brilliant shower thoughts, lost.',
];

const DELETE_TOASTS = [
  "Memo deleted. Tap to undo before it's too late.",
  'Gone. But not forgotten. Yet. Tap undo.',
  'Deleted. Your voice echoes into the void. Undo?',
];

function formatDeletedAgo(deletedAt: string): string {
  const ms = Date.now() - new Date(deletedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return 'Deleted today';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 1) return 'Deleted yesterday';
  if (days < 30) return `Deleted ${days} days ago`;
  return `Deleted ${Math.floor(days / 30)}mo ago`;
}

export default function VoiceMemoListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [emptyMsg] = useState(() => EMPTY_MESSAGES[Math.floor(Math.random() * EMPTY_MESSAGES.length)]);
  const [voiceMemos, setVoiceMemos] = useState<VoiceMemo[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'active' | 'deleted'>('active');
  const [showFilter, setShowFilter] = useState(false);

  // Playback
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({});
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerListenerRef = useRef<{ remove: () => void } | null>(null);

  // Undo
  const [deletedMemo, setDeletedMemo] = useState<VoiceMemo | null>(null);
  const deletedMemoPinnedRef = useRef(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoKey, setUndoKey] = useState(0);

  // Background
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);

  const reloadData = useCallback(async () => {
    const memos = await VMStore.getAllVoiceMemos();
    setVoiceMemos(memos);
    const activeIds = memos.filter((m) => !m.deletedAt).map((m) => m.id);
    const pruned = await pruneVoiceMemoPins(activeIds);
    setPinnedIds(pruned);
  }, []);

  const stopPlayback = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    if (playerListenerRef.current) {
      try { playerListenerRef.current.remove(); } catch { /* */ }
      playerListenerRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.release();
      } catch { /* */ }
      playerRef.current = null;
    }
    setPlayingMemoId(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadData();
      loadBackground().then(setBgUri);
      getOverlayOpacity().then(setBgOpacity);
      return () => {
        stopPlayback();
      };
    }, [reloadData, stopPlayback]),
  );

  const handlePlayToggle = (memo: VoiceMemo) => {
    if (playingMemoId === memo.id) {
      stopPlayback();
      return;
    }
    if (playingMemoId) {
      setPlaybackProgress((prev) => ({ ...prev, [playingMemoId]: 0 }));
    }
    stopPlayback();
    const p = createAudioPlayer({ uri: memo.uri });
    playerRef.current = p;
    setPlayingMemoId(memo.id);
    const sub = p.addListener('playbackStatusUpdate', (status: any) => {
      if (status.didJustFinish) {
        playerListenerRef.current = null;
        sub.remove();
        stopPlayback();
        setPlaybackProgress((prev) => ({ ...prev, [memo.id]: 0 }));
      }
    });
    playerListenerRef.current = sub;
    playbackIntervalRef.current = setInterval(() => {
      const current = playerRef.current;
      if (!current) return;
      try {
        if (current.duration > 0) {
          setPlaybackProgress((prev) => ({
            ...prev,
            [memo.id]: current.currentTime / current.duration,
          }));
        }
      } catch { /* player might be released */ }
    }, 500);
    p.play();
  };

  const handleDelete = async (id: string) => {
    hapticHeavy();
    const memo = voiceMemos.find((m) => m.id === id);
    if (!memo) return;
    if (playingMemoId === id) stopPlayback();
    const wasPinned = isVoiceMemoPinned(id, pinnedIds);
    setDeletedMemo(memo);
    deletedMemoPinnedRef.current = wasPinned;
    if (wasPinned) await unpinVoiceMemo(id);
    await VMStore.deleteVoiceMemo(id);
    await reloadData();
    refreshWidgets();
    setUndoKey((k) => k + 1);
    setShowUndo(true);
  };

  const handleRestore = async (id: string) => {
    hapticLight();
    await VMStore.restoreVoiceMemo(id);
    await reloadData();
    refreshWidgets();
  };

  const handlePermanentDelete = async (id: string) => {
    hapticHeavy();
    const memo = voiceMemos.find((m) => m.id === id);
    if (memo) await deleteVoiceMemoFile(memo.uri);
    await VMStore.permanentlyDeleteVoiceMemo(id);
    await reloadData();
    refreshWidgets();
  };

  const handleUndoDelete = async () => {
    setShowUndo(false);
    if (!deletedMemo) return;
    await VMStore.restoreVoiceMemo(deletedMemo.id);
    if (deletedMemoPinnedRef.current) {
      await togglePinVoiceMemo(deletedMemo.id);
    }
    await reloadData();
    refreshWidgets();
    setDeletedMemo(null);
  };

  const handleUndoDismiss = () => {
    setShowUndo(false);
    setDeletedMemo(null);
  };

  const handleTogglePin = async (id: string) => {
    hapticMedium();
    const currentlyPinned = isVoiceMemoPinned(id, pinnedIds);
    if (!currentlyPinned && pinnedIds.length >= MAX_VOICE_MEMO_PINS) {
      ToastAndroid.show('Voice memo pins full \u2014 unpin one first', ToastAndroid.SHORT);
      return;
    }
    await togglePinVoiceMemo(id);
    const updated = await getPinnedVoiceMemos();
    setPinnedIds(updated);
    refreshWidgets();
    ToastAndroid.show(
      currentlyPinned ? 'Unpinned' : 'Pinned to widget',
      ToastAndroid.SHORT,
    );
  };

  const sortedMemos = useMemo(() => {
    if (filter === 'deleted') {
      return voiceMemos
        .filter((m) => !!m.deletedAt)
        .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
    }
    const active = voiceMemos.filter((m) => !m.deletedAt);
    const pinned = active.filter((m) => isVoiceMemoPinned(m.id, pinnedIds));
    const unpinned = active.filter((m) => !isVoiceMemoPinned(m.id, pinnedIds));
    pinned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    unpinned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return [...pinned, ...unpinned];
  }, [voiceMemos, pinnedIds, filter]);

  const styles = useMemo(() => StyleSheet.create({
    outerContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    watermark: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
      opacity: colors.mode === 'dark' ? 0.15 : 0.06,
    },
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top + 10,
      paddingHorizontal: 20,
      paddingBottom: 2,
    },
    headerBack: {
      position: 'absolute',
      left: 20,
      top: insets.top + 10,
    },
    headerHome: {
      position: 'absolute',
      left: 64,
      top: insets.top + 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    filterToggleRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 0,
    },
    filterToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
    },
    filterToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    filterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 6,
      gap: 6,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    pillTextActive: {
      color: colors.textPrimary,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 100 + insets.bottom,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 80 + insets.bottom,
      paddingHorizontal: 32,
    },
    emptyIcon: {
      fontSize: 40,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 22,
    },
    // Deleted item card (inline, not using VoiceMemoCard)
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card + 'CC',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 3,
      borderLeftColor: colors.sectionVoice,
      marginBottom: 8,
      opacity: 0.7,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.sectionVoice,
      opacity: 0.6,
    },
    iconCircleText: {
      fontSize: 16,
    },
    cardCenter: {
      flex: 1,
      marginHorizontal: 12,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      opacity: 0.7,
    },
    deletedAgo: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    restoreBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    restoreText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#22C55E',
    },
    foreverBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    foreverText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#EF4444',
    },
    fab: {
      position: 'absolute',
      bottom: 36 + insets.bottom,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    fabText: {
      fontSize: 36,
      color: colors.textPrimary,
      fontWeight: '300',
    },
  }), [colors, insets.bottom, insets.top]);

  const renderDeletedItem = (memo: VoiceMemo) => (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconCircleText}>{'\u{1F399}\uFE0F'}</Text>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {memo.title || 'Voice Memo'}
        </Text>
        <Text style={styles.deletedAgo}>
          {formatDeletedAgo(memo.deletedAt!)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => handleRestore(memo.id)} style={styles.restoreBtn} activeOpacity={0.7}>
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePermanentDelete(memo.id)} style={styles.foreverBtn} activeOpacity={0.7}>
          <Text style={styles.foreverText}>Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: VoiceMemo }) => {
    if (item.deletedAt) return renderDeletedItem(item);
    return (
      <VoiceMemoCard
        memo={item}
        onPress={() => { hapticLight(); navigation.navigate('VoiceMemoDetail', { memoId: item.id }); }}
        onPlayToggle={() => handlePlayToggle(item)}
        isPlaying={playingMemoId === item.id}
        playbackProgress={playbackProgress[item.id] || 0}
        onPin={() => handleTogglePin(item.id)}
        isPinned={isVoiceMemoPinned(item.id, pinnedIds)}
        onDelete={() => handleDelete(item.id)}
      />
    );
  };

  const renderEmpty = () => {
    if (filter === 'deleted') {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'\u{1F5D1}\uFE0F'}</Text>
          <Text style={styles.emptyText}>Nothing in the trash. How responsible of you.</Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>{'\u{1F399}\uFE0F'}</Text>
        <Text style={styles.emptyText}>{emptyMsg}</Text>
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bgUri ? (
          <>
            <Image source={{ uri: bgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBgUri(null)} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${bgOpacity})` }]} />
          </>
        ) : (
          <Image
            source={require('../../assets/fullscreenicon.png')}
            style={styles.watermark}
            resizeMode="cover"
          />
        )}
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerBack}>
            <BackButton onPress={() => navigation.goBack()} />
          </View>
          <View style={styles.headerHome}>
            <HomeButton />
          </View>
          <Text style={styles.title}>Voice Memos</Text>
        </View>

        <View style={styles.filterToggleRow}>
          <TouchableOpacity
            style={styles.filterToggleBtn}
            onPress={() => {
              hapticLight();
              setShowFilter((prev) => {
                if (prev) setFilter('active');
                return !prev;
              });
            }}
            activeOpacity={0.7}
          >
            {filter !== 'active' && <View style={styles.filterDot} />}
            <Text style={styles.filterToggleText}>
              Filter {showFilter ? '\u25B4' : '\u25BE'}
            </Text>
          </TouchableOpacity>
        </View>

        {showFilter && (
          <View style={styles.filterRow}>
            {(['active', 'deleted'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, filter === f && styles.pillActive]}
                onPress={() => { hapticLight(); setFilter(f); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                  {f === 'active' ? 'Active' : 'Deleted'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {sortedMemos.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            data={sortedMemos}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => { hapticLight(); navigation.navigate('VoiceRecord'); }}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        <UndoToast
          key={undoKey}
          visible={showUndo}
          message={DELETE_TOASTS[Math.floor(Math.random() * DELETE_TOASTS.length)]}
          onUndo={handleUndoDelete}
          onDismiss={handleUndoDismiss}
        />
      </View>
    </View>
  );
}

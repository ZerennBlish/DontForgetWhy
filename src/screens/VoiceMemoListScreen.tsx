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
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import * as VMStore from '../services/voiceMemoStorage';
import { deleteVoiceMemoFile } from '../services/voiceMemoFileStorage';
import { getClipSummaries } from '../services/voiceClipStorage';
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
import SwipeableRow from '../components/SwipeableRow';
import VoiceMemoCard from '../components/VoiceMemoCard';
import UndoToast from '../components/UndoToast';
import TutorialOverlay from '../components/TutorialOverlay';
import { useTutorial } from '../hooks/useTutorial';
import { createAudioPlayer } from 'expo-audio';
import type { PlayerWithEvents } from '../utils/audioCompat';
import type { VoiceMemo } from '../types/voiceMemo';
import { useAppIcon } from '../hooks/useAppIcon';
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
  const tutorial = useTutorial('voiceMemoList');

  const microphoneIcon = useAppIcon('microphone');
  const trashIcon = useAppIcon('trash');
  const plusIcon = useAppIcon('plus');

  const [emptyMsg] = useState(() => EMPTY_MESSAGES[Math.floor(Math.random() * EMPTY_MESSAGES.length)]);
  const [voiceMemos, setVoiceMemos] = useState<VoiceMemo[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'active' | 'deleted'>('active');
  const [showFilter, setShowFilter] = useState(false);

  // Playback
  // playingMemoId is React state because the list needs to flip the play
  // icon. playbackProgress is a REF (not state) so the 500ms update tick
  // doesn't re-render the entire list — only the currently-playing card
  // subscribes to the ref via its own internal interval.
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const playbackProgressRef = useRef<number>(0);
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
    const ids = memos.map((m) => m.id);
    const summaries = getClipSummaries(ids);
    for (const memo of memos) {
      const summary = summaries.get(memo.id);
      memo.clipCount = summary?.clipCount ?? 0;
      memo.totalDuration = summary?.totalDuration ?? 0;
    }
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
        playerRef.current.remove();
      } catch { /* */ }
      playerRef.current = null;
    }
    playbackProgressRef.current = 0;
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

  const handlePlayToggle = useCallback((memo: VoiceMemo) => {
    // Clips-based memos have no direct uri — navigate to detail for playback
    if (!memo.uri) {
      navigation.navigate('VoiceMemoDetail', { memoId: memo.id });
      return;
    }
    if (playingMemoId === memo.id) {
      stopPlayback();
      return;
    }
    stopPlayback();
    const p = createAudioPlayer({ uri: memo.uri });
    playerRef.current = p;
    playbackProgressRef.current = 0;
    setPlayingMemoId(memo.id);
    const sub = (p as PlayerWithEvents).addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        playerListenerRef.current = null;
        sub.remove();
        stopPlayback();
      }
    });
    playerListenerRef.current = sub;
    playbackIntervalRef.current = setInterval(() => {
      const current = playerRef.current;
      if (!current) return;
      try {
        if (current.duration > 0) {
          // Mutate the ref instead of setState — the playing card polls
          // this ref via its own interval and re-renders only itself.
          playbackProgressRef.current = current.currentTime / current.duration;
        }
      } catch { /* player might be released */ }
    }, 500);
    p.play();
  }, [playingMemoId, stopPlayback, navigation]);

  const handleDelete = useCallback(async (id: string) => {
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
  }, [voiceMemos, playingMemoId, stopPlayback, pinnedIds, reloadData]);

  const handleRestore = useCallback(async (id: string) => {
    hapticLight();
    await VMStore.restoreVoiceMemo(id);
    await reloadData();
    refreshWidgets();
  }, [reloadData]);

  const handlePermanentDelete = useCallback(async (id: string) => {
    hapticHeavy();
    const memo = voiceMemos.find((m) => m.id === id);
    if (memo?.uri) await deleteVoiceMemoFile(memo.uri);
    await VMStore.permanentlyDeleteVoiceMemo(id);
    await reloadData();
    refreshWidgets();
  }, [voiceMemos, reloadData]);

  const handleUndoDelete = useCallback(async () => {
    setShowUndo(false);
    if (!deletedMemo) return;
    await VMStore.restoreVoiceMemo(deletedMemo.id);
    if (deletedMemoPinnedRef.current) {
      await togglePinVoiceMemo(deletedMemo.id);
    }
    await reloadData();
    refreshWidgets();
    setDeletedMemo(null);
  }, [deletedMemo, reloadData]);

  const handleUndoDismiss = useCallback(() => {
    setShowUndo(false);
    setDeletedMemo(null);
  }, []);

  const handleTogglePin = useCallback(async (id: string) => {
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
  }, [pinnedIds]);

  const sortedMemos = useMemo(() => {
    if (filter === 'deleted') {
      return voiceMemos
        .filter((m) => !!m.deletedAt)
        .sort((a, b) => new Date(b.deletedAt ?? '').getTime() - new Date(a.deletedAt ?? '').getTime());
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
      opacity: colors.watermarkOpacity,
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
      fontSize: 26,
      color: colors.textPrimary,
      fontFamily: FONTS.extraBold,
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
      fontFamily: FONTS.semiBold,
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
      fontFamily: FONTS.semiBold,
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
    emptyText: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 22,
      fontFamily: FONTS.regular,
    },
    // Deleted item card (inline, not using VoiceMemoCard)
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
      opacity: 0.7,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    capsuleBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    capsuleBtnText: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.textTertiary,
    },
    capsuleBtnDestructiveText: {
      fontSize: 11,
      fontFamily: FONTS.semiBold,
      color: colors.red,
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
    cardCenter: {
      flex: 1,
      marginHorizontal: 12,
    },
    cardTitle: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
      opacity: 0.7,
    },
    deletedAgo: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      fontStyle: 'italic',
      fontFamily: FONTS.regular,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    fab: {
      position: 'absolute',
      bottom: 36 + insets.bottom,
      right: 24,
      width: 56,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [colors, insets.bottom, insets.top]);

  const renderDeletedItem = useCallback((memo: VoiceMemo) => (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Image source={microphoneIcon} style={{ width: 22, height: 22 }} resizeMode="contain" />
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
        <TouchableOpacity onPress={() => handleRestore(memo.id)} style={styles.capsuleBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Restore voice memo">
          <Text style={styles.capsuleBtnText}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePermanentDelete(memo.id)} style={styles.capsuleBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Permanently delete voice memo">
          <Text style={styles.capsuleBtnDestructiveText}>Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [styles, handleRestore, handlePermanentDelete]);

  const keyExtractor = useCallback((item: VoiceMemo) => item.id, []);

  // Stable navigation handler so VoiceMemoCard's onPress prop is
  // referentially equal across renders that don't change navigation.
  const handleMemoOpen = useCallback((memo: VoiceMemo) => {
    hapticLight();
    navigation.navigate('VoiceMemoDetail', { memoId: memo.id });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: VoiceMemo }) => {
    if (item.deletedAt) return renderDeletedItem(item);
    return (
      <SwipeableRow onDelete={() => handleDelete(item.id)}>
        <VoiceMemoCard
          memo={item}
          onPress={handleMemoOpen}
          onPlayToggle={handlePlayToggle}
          isPlaying={playingMemoId === item.id}
          progressRef={playbackProgressRef}
          onPin={handleTogglePin}
          isPinned={isVoiceMemoPinned(item.id, pinnedIds)}
        />
      </SwipeableRow>
    );
  }, [renderDeletedItem, handleDelete, handleMemoOpen, handlePlayToggle, playingMemoId, handleTogglePin, pinnedIds]);

  const renderEmpty = () => {
    if (filter === 'deleted') {
      return (
        <View style={styles.empty}>
          <Image source={trashIcon} style={{ width: 48, height: 48, marginBottom: 12 }} resizeMode="contain" />
          <Text style={[styles.emptyText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>Nothing in the trash. How responsible of you.</Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Image source={microphoneIcon} style={{ width: 48, height: 48, marginBottom: 12 }} resizeMode="contain" />
        <Text style={[styles.emptyText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>{emptyMsg}</Text>
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
            source={require('../../assets/fullscreenicon.webp')}
            style={styles.watermark}
            resizeMode="cover"
          />
        )}
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerBack}>
            <BackButton onPress={() => navigation.goBack()} forceDark={!!bgUri} />
          </View>
          <View style={styles.headerHome}>
            <HomeButton forceDark={!!bgUri} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Image source={microphoneIcon} style={{ width: 36, height: 36, marginBottom: 2 }} resizeMode="contain" />
            <Text style={[styles.title, bgUri && { color: colors.overlayText }]}>Voice Memos</Text>
          </View>
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
            accessibilityRole="button"
            accessibilityLabel={showFilter ? 'Hide filters' : 'Show filters'}
            accessibilityState={{ expanded: showFilter }}
          >
            {filter !== 'active' && <View style={styles.filterDot} />}
            <Text style={[styles.filterToggleText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
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
                accessibilityRole="button"
                accessibilityLabel={`Filter ${f === 'active' ? 'active' : 'deleted'}`}
                accessibilityState={{ selected: filter === f }}
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
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            windowSize={5}
            maxToRenderPerBatch={8}
            initialNumToRender={8}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => { hapticLight(); navigation.navigate('VoiceRecord'); }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Record new voice memo"
        >
          <Image source={plusIcon} style={{ width: 40, height: 40 }} resizeMode="contain" />
        </TouchableOpacity>

        <UndoToast
          key={undoKey}
          visible={showUndo}
          message={DELETE_TOASTS[Math.floor(Math.random() * DELETE_TOASTS.length)]}
          onUndo={handleUndoDelete}
          onDismiss={handleUndoDismiss}
        />
      </View>

      {tutorial.showTutorial && (
        <TutorialOverlay
          tips={tutorial.tips}
          currentIndex={tutorial.currentIndex}
          onNext={tutorial.nextTip}
          onPrev={tutorial.prevTip}
          onDismiss={tutorial.dismiss}
          sectionColor={colors.sectionVoice}
        />
      )}
    </View>
  );
}

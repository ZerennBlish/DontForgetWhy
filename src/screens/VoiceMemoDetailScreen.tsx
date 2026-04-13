import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ToastAndroid,
  Image,
  Keyboard,
  ScrollView,
  GestureResponderEvent,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import {
  getAllVoiceMemos,
  getVoiceMemoById,
  updateVoiceMemo,
  deleteVoiceMemo,
} from '../services/voiceMemoStorage';
import {
  getClipsForMemo,
  deleteClip,
  updateClipLabel,
} from '../services/voiceClipStorage';
import { saveVoiceMemoImage, deleteVoiceMemoImage } from '../services/voiceMemoImageStorage';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ImageLightbox from '../components/ImageLightbox';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { refreshWidgets } from '../widget/updateWidget';
import { kvGet, kvSet } from '../services/database';
import APP_ICONS from '../data/appIconAssets';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import MEDIA_ICONS, { GlowIcon } from '../assets/mediaIcons';
import type { RootStackParamList } from '../navigation/types';
import type { VoiceMemo } from '../types/voiceMemo';
import type { VoiceClip } from '../types/voiceClip';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceMemoDetail'>;

type PlaybackMode = 'stop' | 'playAll' | 'repeat';
const PLAYBACK_MODE_KEY = 'clipPlaybackMode';

const SAVE_TOASTS = [
  'Saved. Future you will either thank you or cringe.',
  'Recorded and stored. Your voice is safe. Whether it should be is another question.',
  'Got it. Another thought rescued from oblivion.',
  "Saved. Now you'll never forget what you sound like right now.",
  'Noted. Verbally.',
  'Your voice has been archived. No take-backs.',
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatClipTimestamp(isoDate: string): string {
  const d = new Date(isoDate);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const min = String(m).padStart(2, '0');
  return `${month} ${day}, ${hour}:${min} ${ampm}`;
}

export default function VoiceMemoDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const memoId = (route.params as { memoId: string }).memoId;

  const [memo, setMemo] = useState<VoiceMemo | null>(null);
  const [clips, setClips] = useState<VoiceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [isViewMode, setIsViewMode] = useState(true);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editingLabelText, setEditingLabelText] = useState('');
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('stop');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showSharePicker, setShowSharePicker] = useState(false);

  const initialTitleRef = useRef('');
  const initialNoteRef = useRef('');
  const barWidthRef = useRef(0);
  const exitingRef = useRef(false);
  const prevClipRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);

  // Reset first-load flag when navigating to a different memo
  useEffect(() => {
    firstLoadRef.current = true;
  }, [memoId]);

  const activeClip = useMemo(
    () => clips.find((c) => c.id === activeClipId) ?? null,
    [clips, activeClipId],
  );

  const audioUri = activeClip?.uri ?? null;
  const audioSource = useMemo(
    () => (audioUri ? { uri: audioUri } : null),
    [audioUri],
  );
  const player = useAudioPlayer(audioSource);
  const playerStatus = useAudioPlayerStatus(player);

  const showControls = activeClipId !== null;

  // Load memo, clips, and background on mount
  useEffect(() => {
    (async () => {
      await Promise.all([
        loadBackground().then(setBgUri),
        getOverlayOpacity().then(setBgOpacity),
      ]);
      const savedMode = kvGet(PLAYBACK_MODE_KEY);
      if (savedMode === 'stop' || savedMode === 'playAll' || savedMode === 'repeat') {
        setPlaybackMode(savedMode);
      }
      const all = await getAllVoiceMemos();
      const found = all.find((m) => m.id === memoId);
      if (found) {
        setMemo(found);
        setTitle(found.title);
        setNote(found.note);
        initialTitleRef.current = found.title;
        initialNoteRef.current = found.note;
        const loadedClips = getClipsForMemo(memoId);
        setClips(loadedClips);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Playback mode behavior when a clip finishes
  useEffect(() => {
    if (!playerStatus.didJustFinish) return;

    if (playbackMode === 'repeat') {
      try { player.seekTo(0); } catch { /* */ }
      setTimeout(() => { try { player.play(); } catch { /* */ } }, 50);
    } else if (playbackMode === 'playAll') {
      const currentIndex = clips.findIndex((c) => c.id === activeClipId);
      if (currentIndex >= 0 && currentIndex < clips.length - 1) {
        const nextClip = clips[currentIndex + 1];
        setActiveClipId(nextClip.id);
      } else {
        try { player.seekTo(0); } catch { /* */ }
      }
    } else {
      try { player.seekTo(0); } catch { /* */ }
    }
  }, [playerStatus.didJustFinish, playbackMode, clips, activeClipId, player]);

  // Auto-play when active clip changes (player needs time to reinit on source change)
  useEffect(() => {
    if (activeClipId && activeClipId !== prevClipRef.current) {
      const timer = setTimeout(() => {
        try { player.play(); } catch { /* */ }
      }, 100);
      prevClipRef.current = activeClipId;
      return () => clearTimeout(timer);
    }
    if (!activeClipId) {
      prevClipRef.current = null;
    }
  }, [activeClipId, player]);

  useFocusEffect(
    useCallback(() => {
      const freshMemo = getVoiceMemoById(memoId);
      if (freshMemo) {
        setMemo(freshMemo);
        // Only seed title/note from DB on the first load. On subsequent
        // focus events (e.g. returning from VoiceRecordScreen after adding
        // a clip) we must not clobber unsaved text edits.
        if (firstLoadRef.current) {
          setTitle(freshMemo.title);
          setNote(freshMemo.note);
          initialTitleRef.current = freshMemo.title;
          initialNoteRef.current = freshMemo.note;
          firstLoadRef.current = false;
        }
      }
      const freshClips = getClipsForMemo(memoId);
      setClips(freshClips);
      return () => {
        try { player.pause(); } catch { /* */ }
      };
    }, [memoId, player]),
  );

  const handleSetPlaybackMode = (mode: PlaybackMode) => {
    hapticLight();
    setPlaybackMode(mode);
    kvSet(PLAYBACK_MODE_KEY, mode);
  };

  const handleSaveExisting = async (): Promise<boolean> => {
    if (!memo) return false;
    hapticMedium();
    Keyboard.dismiss();
    try {
      await updateVoiceMemo({
        ...memo,
        title,
        note,
        updatedAt: new Date().toISOString(),
      });
      initialTitleRef.current = title;
      initialNoteRef.current = note;
      setIsViewMode(true);
      refreshWidgets();
      ToastAndroid.show(
        SAVE_TOASTS[Math.floor(Math.random() * SAVE_TOASTS.length)],
        ToastAndroid.LONG,
      );
      return true;
    } catch {
      ToastAndroid.show('Save failed \u2014 try again', ToastAndroid.SHORT);
      return false;
    }
  };

  // Intercept all back/pop navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (exitingRef.current) return;

      // Peel the attachments panel before doing anything else, so back
      // dismisses overlays before the unsaved-changes guard kicks in.
      if (showAttachments) {
        e.preventDefault();
        setShowAttachments(false);
        return;
      }

      const hasChanges = memo &&
        (title !== initialTitleRef.current || note !== initialNoteRef.current);
      if (hasChanges) {
        e.preventDefault();
        try { player.pause(); } catch { /* */ }
        Alert.alert(
          'Unsaved changes',
          "You've made changes. Save before leaving?",
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                exitingRef.current = true;
                navigation.dispatch(e.data.action);
              },
            },
            {
              text: 'Save & Exit',
              onPress: async () => {
                const success = await handleSaveExisting();
                if (success) {
                  exitingRef.current = true;
                  navigation.dispatch(e.data.action);
                }
              },
            },
          ],
        );
        return;
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, memo, title, note, showAttachments]);

  const handleBack = () => {
    Keyboard.dismiss();
    if (showAttachments) {
      setShowAttachments(false);
      return;
    }
    try { player.pause(); } catch { /* */ }
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete this memo?',
      "Once it's gone, your brilliant thought goes with it. Well, for 30 days. Then it's really gone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            hapticHeavy();
            try { player.pause(); } catch { /* */ }
            await deleteVoiceMemo(memoId);
            refreshWidgets();
            exitingRef.current = true;
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleClipPlayPress = (clipId: string) => {
    hapticLight();
    Keyboard.dismiss();
    if (activeClipId === clipId) {
      if (playerStatus.playing) {
        try { player.pause(); } catch { /* */ }
      } else {
        try { player.play(); } catch { /* */ }
      }
      return;
    }
    try { player.pause(); } catch { /* */ }
    setActiveClipId(clipId);
  };

  const handleClipLabelPress = (clip: VoiceClip) => {
    if (isViewMode) return;
    hapticLight();
    setShowAttachments(false);
    setEditingLabelText(clip.label ?? formatClipTimestamp(clip.createdAt));
    setEditingClipId(clip.id);
  };

  const commitClipLabel = (clip: VoiceClip) => {
    const trimmed = editingLabelText.trim();
    const formattedDefault = formatClipTimestamp(clip.createdAt);
    const valueToSave = trimmed === '' || trimmed === formattedDefault ? null : trimmed;
    try {
      updateClipLabel(clip.id, valueToSave);
    } catch (e) {
      console.error('[VoiceMemoDetail] updateClipLabel failed:', e);
    }
    setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, label: valueToSave } : c)));
    setEditingClipId(null);
    setEditingLabelText('');
  };

  const handleTakePhoto = async () => {
    if (!memo) return;
    const currentImages = memo.images ?? [];
    if (currentImages.length >= 5) {
      ToastAndroid.show('5 photos max per memo', ToastAndroid.SHORT);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      ToastAndroid.show('Camera permission needed', ToastAndroid.SHORT);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      hapticLight();
      try {
        const savedUri = await saveVoiceMemoImage(memo.id, result.assets[0].uri);
        const updatedImages = [...currentImages, savedUri];
        await updateVoiceMemo({
          ...memo,
          images: updatedImages,
          updatedAt: new Date().toISOString(),
        });
        setMemo({ ...memo, images: updatedImages });
      } catch {
        ToastAndroid.show('Failed to save photo', ToastAndroid.SHORT);
      }
    }
  };

  const handlePickImage = async () => {
    if (!memo) return;
    const currentImages = memo.images ?? [];
    if (currentImages.length >= 5) {
      ToastAndroid.show('5 photos max per memo', ToastAndroid.SHORT);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      hapticLight();
      try {
        const savedUri = await saveVoiceMemoImage(memo.id, result.assets[0].uri);
        const updatedImages = [...currentImages, savedUri];
        await updateVoiceMemo({
          ...memo,
          images: updatedImages,
          updatedAt: new Date().toISOString(),
        });
        setMemo({ ...memo, images: updatedImages });
      } catch {
        ToastAndroid.show('Failed to save photo', ToastAndroid.SHORT);
      }
    }
  };

  const handleDeletePhoto = (imageUri: string) => {
    Alert.alert('Delete photo?', 'This photo will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          hapticHeavy();
          await deleteVoiceMemoImage(imageUri);
          const updatedImages = (memo?.images ?? []).filter((u) => u !== imageUri);
          if (memo) {
            await updateVoiceMemo({
              ...memo,
              images: updatedImages,
              updatedAt: new Date().toISOString(),
            });
            setMemo({ ...memo, images: updatedImages });
          }
        },
      },
    ]);
  };

  const handleDeleteClip = (clipId: string) => {
    Alert.alert(
      'Delete this clip?',
      'This recording will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            hapticHeavy();
            if (activeClipId === clipId) {
              try { player.pause(); } catch { /* */ }
              setActiveClipId(null);
            }
            try {
              await deleteClip(clipId);
            } catch (e) {
              console.error('[VoiceMemoDetail] deleteClip failed:', e);
            }
            setClips((prev) => prev.filter((c) => c.id !== clipId));
          },
        },
      ],
    );
  };

  const handleShare = useCallback(async () => {
    if (clips.length === 0) {
      ToastAndroid.show('No clips to share', ToastAndroid.SHORT);
      return;
    }
    try { player.pause(); } catch { /* */ }

    if (clips.length === 1) {
      try {
        await Sharing.shareAsync(clips[0].uri, {
          mimeType: 'audio/mp4',
          dialogTitle: title || 'Voice Memo',
        });
      } catch (e) {
        console.error('Share failed:', e);
        ToastAndroid.show('Share failed', ToastAndroid.SHORT);
      }
      return;
    }

    // Android Alert.alert only renders 3 buttons, so use a state-driven modal
    // for memos with 3+ clips.
    setShowSharePicker(true);
  }, [clips, player, title]);

  const shareClipFromPicker = useCallback(async (clip: VoiceClip) => {
    setShowSharePicker(false);
    try {
      await Sharing.shareAsync(clip.uri, {
        mimeType: 'audio/mp4',
        dialogTitle: title || 'Voice Memo',
      });
    } catch (e) {
      console.error('Share failed:', e);
      ToastAndroid.show('Share failed', ToastAndroid.SHORT);
    }
  }, [title]);

  const handleToggleAttachments = () => {
    hapticLight();
    if (!showAttachments && (memo?.images ?? []).length === 0) {
      ToastAndroid.show('No photos yet \u2014 use Camera or Gallery to add some.', ToastAndroid.SHORT);
      return;
    }
    setShowAttachments((v) => !v);
  };

  const togglePlay = () => {
    hapticLight();
    Keyboard.dismiss();
    if (playerStatus.playing) {
      try { player.pause(); } catch { /* */ }
    } else {
      try { player.play(); } catch { /* */ }
    }
  };

  const skipBack = () => {
    hapticLight();
    const pos = Math.max(0, playerStatus.currentTime - 5);
    if (!Number.isFinite(pos)) return;
    try { player.seekTo(pos); } catch { /* */ }
  };

  const skipForward = () => {
    hapticLight();
    const dur = playerStatus.duration || activeClip?.duration || 0;
    const pos = Math.min(dur, playerStatus.currentTime + 5);
    if (!Number.isFinite(pos)) return;
    try { player.seekTo(pos); } catch { /* */ }
  };

  const handleSeekEvent = (e: GestureResponderEvent) => {
    if (barWidthRef.current <= 0) return;
    const dur = playerStatus.duration || activeClip?.duration || 0;
    if (!Number.isFinite(dur) || dur <= 0) return;
    const x = e.nativeEvent.locationX;
    const fraction = Math.max(0, Math.min(1, x / barWidthRef.current));
    const seekPos = fraction * dur;
    if (!Number.isFinite(seekPos)) return;
    try { player.seekTo(seekPos); } catch { /* player may be torn down */ }
  };

  const progress =
    playerStatus.duration > 0
      ? playerStatus.currentTime / playerStatus.duration
      : 0;
  const displayDuration =
    playerStatus.duration > 0
      ? playerStatus.duration
      : (activeClip?.duration || 0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 2,
        },
        headerLeft: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        headerCenter: {
          flex: 1,
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        trashBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
          borderWidth: 1,
          borderColor: colors.red,
        },
        content: {
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 40,
        },
        scrollContent: {
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingBottom: insets.bottom + 12,
        },
        titleText: {
          fontSize: 18,
          fontFamily: FONTS.bold,
          color: colors.textPrimary,
          paddingVertical: 8,
          textAlign: 'center',
        },
        noteText: {
          fontSize: 15,
          fontFamily: FONTS.regular,
          color: colors.textSecondary,
          paddingVertical: 8,
          marginTop: 8,
          lineHeight: 22,
        },
        titleInput: {
          fontSize: 18,
          fontFamily: FONTS.bold,
          color: colors.textPrimary,
          paddingVertical: 8,
          paddingHorizontal: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          textAlign: 'center',
        },
        noteInput: {
          fontSize: 16,
          color: colors.textSecondary,
          paddingVertical: 8,
          paddingHorizontal: 0,
          marginTop: 8,
          minHeight: 60,
          textAlignVertical: 'top',
        },
        clipsHeader: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.textTertiary,
          marginTop: 16,
          marginBottom: 8,
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        clipRow: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.mode === 'dark' ? colors.card + 'E6' : colors.sectionVoice + '15',
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          marginBottom: 6,
          borderLeftWidth: 3,
          borderLeftColor: colors.sectionVoice,
        },
        clipRowActive: {
          backgroundColor: colors.sectionVoice + '20',
        },
        clipPlayBtn: {
          width: 32,
          height: 32,
          justifyContent: 'center',
          alignItems: 'center',
        },
        clipLabelWrapper: {
          flex: 1,
          marginHorizontal: 10,
        },
        clipLabel: {
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
        },
        clipLabelInput: {
          flex: 1,
          marginHorizontal: 10,
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          color: colors.textPrimary,
          paddingVertical: 2,
          paddingHorizontal: 4,
          borderBottomWidth: 1,
          borderBottomColor: colors.sectionVoice,
        },
        clipDuration: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
          color: colors.textSecondary,
          fontVariant: ['tabular-nums'],
          marginRight: 8,
        },
        clipDeleteBtn: {
          width: 28,
          height: 28,
          borderRadius: 14,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1,
          borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        },
        emptyClipsText: {
          fontSize: 14,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
          textAlign: 'center',
          marginTop: 24,
        },
        playbackSection: {
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
          paddingTop: 16,
        },
        seekArea: {
          height: 44,
          justifyContent: 'center',
        },
        progressTrack: {
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        },
        progressFill: {
          height: '100%',
          borderRadius: 3,
          backgroundColor: colors.sectionVoice,
        },
        timeRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 8,
        },
        timeText: {
          fontSize: 12,
          color: colors.textTertiary,
          fontFamily: FONTS.semiBold,
          fontVariant: ['tabular-nums'],
        },
        controlsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          marginTop: 24,
        },
        skipBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
          borderWidth: 1,
          borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        playPauseBtn: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        },
        notFound: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        },
        notFoundText: {
          fontSize: 15,
          fontFamily: FONTS.regular,
          color: colors.textTertiary,
          textAlign: 'center',
        },
      }),
    [colors, insets],
  );

  if (loading) return <View style={styles.container} />;

  if (!memo) {
    return (
      <View style={styles.container}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {bgUri ? (
            <>
              <Image
                source={{ uri: bgUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                onError={() => setBgUri(null)}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: `rgba(0,0,0,${bgOpacity})` },
                ]}
              />
            </>
          ) : (
            <Image
              source={require('../../assets/fullscreenicon.webp')}
              style={{ width: '100%', height: '100%', opacity: colors.mode === 'dark' ? 0.15 : 0.06 }}
              resizeMode="cover"
            />
          )}
        </View>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BackButton onPress={() => navigation.goBack()} forceDark={!!bgUri} />
            <View style={{ marginLeft: 4 }}>
              <HomeButton forceDark={!!bgUri} />
            </View>
          </View>
          <View style={styles.headerCenter} />
          <View style={styles.headerRight} />
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>Memo not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bgUri ? (
          <>
            <Image
              source={{ uri: bgUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onError={() => setBgUri(null)}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: `rgba(0,0,0,${bgOpacity})` },
              ]}
            />
          </>
        ) : (
          <Image
            source={require('../../assets/fullscreenicon.webp')}
            style={{ width: '100%', height: '100%', opacity: colors.mode === 'dark' ? 0.15 : 0.06 }}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackButton onPress={handleBack} forceDark={!!bgUri} />
          <View style={{ marginLeft: 4 }}>
            <HomeButton forceDark={!!bgUri} />
          </View>
        </View>
        <View style={styles.headerCenter} />
        <View style={styles.headerRight}>
          {isViewMode ? (
            <>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
                  borderWidth: 1,
                  borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                }}
                onPress={handleShare}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Share voice memo"
              >
                <Image source={APP_ICONS.share} style={{ width: 22, height: 22 }} resizeMode="contain" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
                  borderWidth: 1,
                  borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                }}
                onPress={() => { hapticLight(); setIsViewMode(false); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit voice memo"
              >
                <Image source={APP_ICONS.edit} style={{ width: 24, height: 24 }} resizeMode="contain" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
                borderWidth: 1,
                borderColor: colors.accent,
              }}
              onPress={handleSaveExisting}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Save voice memo"
            >
              <Image source={APP_ICONS.save} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.trashBtn}
            onPress={handleDelete}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Delete voice memo"
          >
            <Image source={APP_ICONS.trash} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View>
        {/* Title & Note */}
        {isViewMode ? (
          <>
            {title ? (
              <Text style={[styles.titleText, bgUri && { color: colors.overlayText }]}>{title}</Text>
            ) : null}
            {note ? (
              <Text style={[styles.noteText, bgUri && { color: 'rgba(255,255,255,0.7)' }]}>{note}</Text>
            ) : null}
          </>
        ) : (
          <>
            <TextInput
              style={[styles.titleInput, bgUri && { color: colors.overlayText }]}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setShowAttachments(false)}
              placeholder="Add a title..."
              placeholderTextColor={bgUri ? 'rgba(255,255,255,0.4)' : colors.textTertiary}
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <TextInput
              style={[styles.noteInput, bgUri && { color: 'rgba(255,255,255,0.7)' }]}
              value={note}
              onChangeText={setNote}
              onFocus={() => setShowAttachments(false)}
              placeholder="Add a note..."
              placeholderTextColor={bgUri ? 'rgba(255,255,255,0.4)' : colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </>
        )}

        {/* Clips */}
        <Text style={[styles.clipsHeader, bgUri && { color: 'rgba(255,255,255,0.6)' }]}>
          Clips
        </Text>
            {clips.length === 0 ? (
              <Text style={[styles.emptyClipsText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
                No clips yet.
              </Text>
            ) : (
              clips.map((clip) => {
                const isActive = activeClipId === clip.id;
                const isPlayingThis = isActive && playerStatus.playing;
                const isEditingLabel = editingClipId === clip.id && !isViewMode;
                const displayLabel = clip.label ?? formatClipTimestamp(clip.createdAt);
                return (
                  <View
                    key={clip.id}
                    style={[styles.clipRow, isActive && styles.clipRowActive]}
                  >
                    <TouchableOpacity
                      style={styles.clipPlayBtn}
                      onPress={() => handleClipPlayPress(clip.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={isPlayingThis ? 'Pause clip' : 'Play clip'}
                    >
                      <GlowIcon
                        source={isPlayingThis ? MEDIA_ICONS.pause : MEDIA_ICONS.play}
                        size={20}
                        glowColor={colors.sectionVoice}
                      />
                    </TouchableOpacity>

                    {isEditingLabel ? (
                      <TextInput
                        style={styles.clipLabelInput}
                        value={editingLabelText}
                        onChangeText={setEditingLabelText}
                        autoFocus
                        maxLength={60}
                        placeholder={formatClipTimestamp(clip.createdAt)}
                        placeholderTextColor={colors.textTertiary}
                        returnKeyType="done"
                        onSubmitEditing={() => commitClipLabel(clip)}
                        onBlur={() => commitClipLabel(clip)}
                      />
                    ) : (
                      <TouchableOpacity
                        style={styles.clipLabelWrapper}
                        onPress={() => handleClipLabelPress(clip)}
                        activeOpacity={isViewMode ? 1 : 0.7}
                        accessibilityRole={isViewMode ? undefined : 'button'}
                        accessibilityLabel={isViewMode ? undefined : 'Rename clip'}
                      >
                        <Text style={styles.clipLabel} numberOfLines={1}>
                          {displayLabel}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <Text style={styles.clipDuration}>{formatTime(clip.duration)}</Text>

                    {isViewMode ? (
                      <TouchableOpacity
                        style={styles.clipDeleteBtn}
                        onPress={async () => {
                          hapticLight();
                          try { player.pause(); } catch { /* */ }
                          try {
                            await Sharing.shareAsync(clip.uri, {
                              mimeType: 'audio/mp4',
                              dialogTitle: title || 'Voice Memo',
                            });
                          } catch (e) {
                            console.error('Share failed:', e);
                            ToastAndroid.show('Share failed', ToastAndroid.SHORT);
                          }
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Share clip ${displayLabel}`}
                      >
                        <Image source={APP_ICONS.share} style={{ width: 18, height: 18 }} resizeMode="contain" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.clipDeleteBtn}
                        onPress={() => handleDeleteClip(clip.id)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Delete clip"
                      >
                        <Image
                          source={APP_ICONS.closeX}
                          style={{ width: 14, height: 14 }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}

            {!isViewMode && memo && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 20,
                  backgroundColor: colors.sectionVoice + '25',
                  borderWidth: 1,
                  borderColor: colors.sectionVoice + '40',
                  marginTop: 12,
                  marginBottom: 16,
                }}
                onPress={() => {
                  hapticLight();
                  try { player.pause(); } catch { /* */ }
                  navigation.navigate('VoiceRecord', { addToMemoId: memo.id });
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Add a new clip to this memo"
              >
                <Image
                  source={APP_ICONS.plus}
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={{
                  fontSize: 14,
                  fontFamily: FONTS.semiBold,
                  color: colors.sectionVoice,
                }}>
                  Add Clip
                </Text>
              </TouchableOpacity>
            )}

        </View>

        <View>
        {/* Photos — view mode pushed to bottom */}
        {isViewMode && (memo?.images ?? []).length > 0 && (
          <View style={{ marginTop: 20, marginBottom: 8 }}>
            <Text style={{
              fontSize: 11,
              fontFamily: FONTS.bold,
              color: bgUri ? 'rgba(255,255,255,0.4)' : colors.textTertiary,
              letterSpacing: 1.5,
              marginBottom: 8,
              textAlign: 'center',
            }}>PHOTOS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 14 }}
            >
              {(memo?.images ?? []).map((uri) => (
                <TouchableOpacity
                  key={uri}
                  onPress={() => setLightboxUri(uri)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="View photo"
                >
                  <Image
                    source={{ uri }}
                    style={{ width: 120, height: 120, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        </View>
      </ScrollView>

      {/* Attachments panel — edit mode */}
      {!isViewMode && showAttachments && (memo?.images ?? []).length > 0 && (
        <View style={{
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingVertical: 16,
          paddingHorizontal: 16,
        }}>
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
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 14, paddingTop: 8, paddingRight: 8 }}
          >
            {(memo?.images ?? []).map((uri) => (
              <View key={uri} style={{ position: 'relative' }}>
                <TouchableOpacity
                  onPress={() => setLightboxUri(uri)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="View photo"
                >
                  <Image
                    source={{ uri }}
                    style={{ width: 120, height: 120, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
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
                    borderColor: colors.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)',
                  }}
                  hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
                  onPress={() => handleDeletePhoto(uri)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Delete photo"
                >
                  <Image source={APP_ICONS.closeX} style={{ width: 10, height: 10 }} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bottom toolbar — edit mode */}
      {!isViewMode && memo && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingVertical: 10,
          paddingBottom: 10 + insets.bottom,
        }}>
          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={handleToggleAttachments}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={showAttachments ? 'Hide attachments' : 'Show attachments'}
            accessibilityState={{ expanded: showAttachments }}
          >
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              justifyContent: 'center', alignItems: 'center',
              backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
              borderWidth: showAttachments ? 1.5 : 1,
              borderColor: showAttachments
                ? colors.sectionVoice
                : (colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'),
            }}>
              <Image source={APP_ICONS.paperclip} style={{ width: 34, height: 34 }} resizeMode="contain" />
              {(memo?.images ?? []).length > 0 && (
                <View style={{
                  position: 'absolute', top: -2, right: -4,
                  minWidth: 16, height: 16, borderRadius: 8,
                  backgroundColor: colors.sectionVoice,
                  justifyContent: 'center', alignItems: 'center',
                  paddingHorizontal: 4,
                }}>
                  <Text style={{ fontSize: 9, fontFamily: FONTS.bold, color: colors.mode === 'dark' ? '#FFFFFF' : '#000000' }}>
                    {(memo?.images ?? []).length}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, fontFamily: FONTS.regular, color: colors.textSecondary, marginTop: 4 }}>Attached</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => { hapticLight(); handleTakePhoto(); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Take a photo"
          >
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              justifyContent: 'center', alignItems: 'center',
              backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
              borderWidth: 1,
              borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
            }}>
              <Image source={APP_ICONS.camera} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </View>
            <Text style={{ fontSize: 10, fontFamily: FONTS.regular, color: colors.textSecondary, marginTop: 4 }}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => { hapticLight(); handlePickImage(); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Choose photo from gallery"
          >
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              justifyContent: 'center', alignItems: 'center',
              backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
              borderWidth: 1,
              borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
            }}>
              <Image source={APP_ICONS.image} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </View>
            <Text style={{ fontSize: 10, fontFamily: FONTS.regular, color: colors.textSecondary, marginTop: 4 }}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Playback controls — fixed at bottom, only visible when there's something to play */}
      {showControls && (
        <View style={styles.playbackSection}>
          <View
            style={styles.seekArea}
            onLayout={(e) => {
              barWidthRef.current = e.nativeEvent.layout.width;
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleSeekEvent}
            onResponderMove={handleSeekEvent}
          >
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.timeRow} accessibilityLiveRegion="polite">
            <Text style={[styles.timeText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
              {formatTime(playerStatus.currentTime)}
            </Text>
            <Text style={[styles.timeText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
              {formatTime(displayDuration)}
            </Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={skipBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Skip back"
            >
              <Image source={MEDIA_ICONS.skipBack} style={{ width: 32, height: 32 }} resizeMode="contain" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playPauseBtn}
              onPress={togglePlay}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={playerStatus.playing ? 'Pause voice memo' : 'Play voice memo'}
            >
              {playerStatus.playing ? (
                <GlowIcon source={MEDIA_ICONS.pause} size={32} glowColor={colors.success} />
              ) : (
                <GlowIcon source={MEDIA_ICONS.play} size={32} glowColor={colors.success} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={skipForward}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Skip forward"
            >
              <Image source={MEDIA_ICONS.skipForward} style={{ width: 32, height: 32 }} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            marginTop: 20,
          }}>
            {([
              { mode: 'stop' as PlaybackMode, icon: MEDIA_ICONS.playStop, label: 'Stop after clip' },
              { mode: 'playAll' as PlaybackMode, icon: MEDIA_ICONS.playAll, label: 'Play all clips' },
              { mode: 'repeat' as PlaybackMode, icon: MEDIA_ICONS.repeat, label: 'Repeat clip' },
            ]).map((item) => (
              <TouchableOpacity
                key={item.mode}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: playbackMode === item.mode
                    ? colors.sectionVoice + '30'
                    : (colors.mode === 'dark' ? 'rgba(30,30,40,0.7)' : 'rgba(0,0,0,0.06)'),
                  borderWidth: playbackMode === item.mode ? 1.5 : 1,
                  borderColor: playbackMode === item.mode
                    ? colors.sectionVoice
                    : (colors.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                }}
                onPress={() => handleSetPlaybackMode(item.mode)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: playbackMode === item.mode }}
              >
                <Image
                  source={item.icon}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Modal
        visible={showSharePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSharePicker(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: colors.modalOverlay,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
          activeOpacity={1}
          onPress={() => setShowSharePicker(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss share picker"
        >
          <View
            accessible={false}
            onStartShouldSetResponder={() => true}
            style={{
              width: '100%',
              maxWidth: 360,
              maxHeight: 400,
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{
              fontSize: 16,
              fontFamily: FONTS.semiBold,
              color: colors.textPrimary,
              marginBottom: 12,
              textAlign: 'center',
            }}>
              Share Clip
            </Text>
            <ScrollView>
              {clips.map((clip) => {
                const label = clip.label ?? formatClipTimestamp(clip.createdAt);
                return (
                  <TouchableOpacity
                    key={clip.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                    onPress={() => shareClipFromPicker(clip)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Share ${label}`}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: FONTS.semiBold,
                        color: colors.textPrimary,
                        marginRight: 12,
                      }}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      fontFamily: FONTS.semiBold,
                      color: colors.textSecondary,
                      fontVariant: ['tabular-nums'],
                    }}>
                      {formatTime(clip.duration)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={{
                marginTop: 12,
                paddingVertical: 12,
                alignItems: 'center',
              }}
              onPress={() => setShowSharePicker(false)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel share picker"
            >
              <Text style={{
                fontSize: 14,
                fontFamily: FONTS.semiBold,
                color: colors.textSecondary,
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ImageLightbox
        visible={!!lightboxUri}
        imageUri={lightboxUri}
        onClose={() => setLightboxUri(null)}
      />
    </View>
  );
}

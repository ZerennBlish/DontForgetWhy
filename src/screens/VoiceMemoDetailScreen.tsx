import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ToastAndroid,
  Image,
  Keyboard,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import {
  getAllVoiceMemos,
  updateVoiceMemo,
  deleteVoiceMemo,
  addVoiceMemo,
} from '../services/voiceMemoStorage';
import { saveVoiceMemoFile, deleteVoiceMemoFile } from '../services/voiceMemoFileStorage';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { refreshWidgets } from '../widget/updateWidget';
import { TrashIcon } from '../components/Icons';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import type { RootStackParamList } from '../navigation/types';
import type { VoiceMemo } from '../types/voiceMemo';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceMemoDetail'>;

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

export default function VoiceMemoDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = route.params;
  const isNewRecording = 'tempUri' in params;

  const [memo, setMemo] = useState<VoiceMemo | null>(null);
  const [loading, setLoading] = useState(!isNewRecording);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [isViewMode, setIsViewMode] = useState(true);

  const initialTitleRef = useRef('');
  const initialNoteRef = useRef('');
  const barWidthRef = useRef(0);
  const savingRef = useRef(false);
  const exitingRef = useRef(false);

  const audioUri = isNewRecording
    ? (params as { tempUri: string }).tempUri
    : memo?.uri;
  const tempDuration = isNewRecording
    ? (params as { tempUri: string; duration: number }).duration
    : 0;
  const audioSource = useMemo(
    () => (audioUri ? { uri: audioUri } : null),
    [audioUri],
  );
  const player = useAudioPlayer(audioSource);
  const playerStatus = useAudioPlayerStatus(player);

  // Load memo and background on mount
  useEffect(() => {
    (async () => {
      await Promise.all([
        loadBackground().then(setBgUri),
        getOverlayOpacity().then(setBgOpacity),
      ]);
      if (!isNewRecording) {
        const memoId = (params as { memoId: string }).memoId;
        const all = await getAllVoiceMemos();
        const found = all.find((m) => m.id === memoId);
        if (found) {
          setMemo(found);
          setTitle(found.title);
          setNote(found.note);
          initialTitleRef.current = found.title;
          initialNoteRef.current = found.note;
        }
        setLoading(false);
      }
      // New recordings go straight to edit mode
      if (isNewRecording) {
        setIsViewMode(false);
      }
    })();
  }, []);

  // Reset position when playback finishes
  useEffect(() => {
    if (playerStatus.didJustFinish) {
      player.seekTo(0);
    }
  }, [playerStatus.didJustFinish, player]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        try { player.pause(); } catch { /* */ }
      };
    }, [player]),
  );

  const hasUnsavedChanges = !isNewRecording && memo &&
    (title !== initialTitleRef.current || note !== initialNoteRef.current);

  const handleSaveExisting = async (): Promise<boolean> => {
    if (!memo || isNewRecording) return false;
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
      if (savingRef.current) { e.preventDefault(); return; }

      if (isNewRecording) {
        e.preventDefault();
        try { player.pause(); } catch { /* */ }
        Alert.alert(
          'Discard recording?',
          "You haven't saved this recording yet.",
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                deleteVoiceMemoFile((params as { tempUri: string }).tempUri).catch(() => {});
                exitingRef.current = true;
                navigation.dispatch(e.data.action);
              },
            },
          ],
        );
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
  }, [navigation, isNewRecording, memo, title, note]);

  const handleBack = () => {
    Keyboard.dismiss();
    try { player.pause(); } catch { /* */ }
    navigation.goBack();
  };

  const handleDelete = () => {
    if (isNewRecording) return;
    const memoId = (params as { memoId: string }).memoId;
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

  const handleSaveNew = async () => {
    if (savingRef.current || !isNewRecording) return;
    savingRef.current = true;
    setSaving(true);
    hapticMedium();
    Keyboard.dismiss();
    try { player.pause(); } catch { /* */ }
    try {
      const tempUri = (params as { tempUri: string; duration: number }).tempUri;
      const dur = (params as { tempUri: string; duration: number }).duration;
      const newMemoId = uuidv4();
      const permanentUri = await saveVoiceMemoFile(newMemoId, tempUri);
      try {
        const now = new Date().toISOString();
        await addVoiceMemo({
          id: newMemoId,
          uri: permanentUri,
          title: title.trim(),
          note: note.trim(),
          duration: dur,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          noteId: null,
        });
      } catch (metaError) {
        deleteVoiceMemoFile(permanentUri).catch(() => {});
        throw metaError;
      }
      deleteVoiceMemoFile(tempUri).catch(() => {});
      refreshWidgets();
      ToastAndroid.show(SAVE_TOASTS[Math.floor(Math.random() * SAVE_TOASTS.length)], ToastAndroid.LONG);
      exitingRef.current = true;
      savingRef.current = false;
      setSaving(false);
      navigation.goBack();
    } catch (e) {
      console.error('Save failed:', e);
      ToastAndroid.show('Failed to save recording', ToastAndroid.SHORT);
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDiscardNew = () => {
    if (savingRef.current) return;
    hapticLight();
    try { player.pause(); } catch { /* */ }
    deleteVoiceMemoFile((params as { tempUri: string }).tempUri).catch(() => {});
    exitingRef.current = true;
    navigation.goBack();
  };

  const togglePlay = () => {
    hapticLight();
    Keyboard.dismiss();
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.play();
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
    const dur = playerStatus.duration || memo?.duration || 0;
    const pos = Math.min(dur, playerStatus.currentTime + 5);
    if (!Number.isFinite(pos)) return;
    try { player.seekTo(pos); } catch { /* */ }
  };

  const handleSeekEvent = (e: any) => {
    if (barWidthRef.current <= 0) return;
    const dur = playerStatus.duration || memo?.duration || 0;
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
    playerStatus.duration > 0 ? playerStatus.duration : (memo?.duration || tempDuration);

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
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 44,
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
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.4)',
        },
        trashIconWrap: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        content: {
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 40,
        },
        titleText: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.textPrimary,
          paddingVertical: 8,
        },
        noteText: {
          fontSize: 16,
          color: colors.textSecondary,
          paddingVertical: 8,
          marginTop: 8,
          lineHeight: 22,
        },
        titleInput: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.textPrimary,
          paddingVertical: 8,
          paddingHorizontal: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
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
        playbackSection: {
          flex: 1,
          justifyContent: 'center',
          paddingBottom: insets.bottom + 32,
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
          fontSize: 13,
          color: colors.textTertiary,
          fontWeight: '500',
          fontVariant: ['tabular-nums'],
        },
        controlsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          marginTop: 32,
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
        skipText: {
          fontSize: 14,
          fontWeight: '700',
          color: colors.textSecondary,
        },
        playPauseBtn: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#4CAF50',
          justifyContent: 'center',
          alignItems: 'center',
        },
        playTriangle: {
          width: 0,
          height: 0,
          borderLeftWidth: 16,
          borderLeftColor: '#FFFFFF',
          borderTopWidth: 11,
          borderTopColor: 'transparent',
          borderBottomWidth: 11,
          borderBottomColor: 'transparent',
          marginLeft: 4,
        },
        pauseBars: {
          flexDirection: 'row',
          gap: 4,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pauseBar: {
          width: 4,
          height: 18,
          backgroundColor: '#FFFFFF',
          borderRadius: 1,
        },
        notFound: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        },
        notFoundText: {
          fontSize: 16,
          color: colors.textTertiary,
          textAlign: 'center',
        },
        saveDiscardRow: {
          flexDirection: 'row',
          gap: 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
        },
        saveBtn: {
          flex: 1,
          backgroundColor: colors.accent,
          borderRadius: 20,
          paddingVertical: 14,
          alignItems: 'center',
        },
        saveBtnText: {
          fontSize: 15,
          fontWeight: '700',
          color: colors.background,
        },
        discardBtn: {
          flex: 1,
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
          borderRadius: 20,
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        },
        discardBtnText: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.textPrimary,
        },
      }),
    [colors, insets],
  );

  if (loading) return <View style={styles.container} />;

  if (!memo && !isNewRecording) {
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
              source={require('../../assets/fullscreenicon.png')}
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
            source={require('../../assets/fullscreenicon.png')}
            style={{ width: '100%', height: '100%', opacity: colors.mode === 'dark' ? 0.15 : 0.06 }}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Header */}
      {isNewRecording ? (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BackButton onPress={handleBack} forceDark={!!bgUri} />
            <View style={{ marginLeft: 4 }}>
              <HomeButton forceDark={!!bgUri} />
            </View>
          </View>
          <View style={styles.headerCenter} />
          <View style={styles.headerRight} />
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BackButton onPress={handleBack} forceDark={!!bgUri} />
            <View style={{ marginLeft: 4 }}>
              <HomeButton forceDark={!!bgUri} />
            </View>
          </View>
          <View style={styles.headerCenter}>
            {isViewMode ? (
              <TouchableOpacity
                style={{ backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 }}
                onPress={() => { hapticLight(); setIsViewMode(false); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.overlayText }}>Edit</Text>
              </TouchableOpacity>
            ) : hasUnsavedChanges ? (
              <TouchableOpacity
                style={{ backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 }}
                onPress={handleSaveExisting}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.overlayText }}>Save</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.trashBtn}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <TrashIcon color={colors.red} size={18} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Title & Note */}
        {isViewMode && !isNewRecording ? (
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
              placeholder="Add a note..."
              placeholderTextColor={bgUri ? 'rgba(255,255,255,0.4)' : colors.textTertiary}
              maxLength={200}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </>
        )}

        {/* Playback section */}
        <View style={[styles.playbackSection, isNewRecording && { paddingBottom: 16 }]}>
          {/* Seekable progress bar — 44px touch target, 6px visual bar */}
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

          {/* Time display */}
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>
              {formatTime(playerStatus.currentTime)}
            </Text>
            <Text style={[styles.timeText, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>{formatTime(displayDuration)}</Text>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={skipBack}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipText, bgUri && { color: 'rgba(255,255,255,0.7)' }]}>-5</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playPauseBtn}
              onPress={togglePlay}
              activeOpacity={0.7}
            >
              {playerStatus.playing ? (
                <View style={styles.pauseBars}>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </View>
              ) : (
                <View style={styles.playTriangle} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={skipForward}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipText, bgUri && { color: 'rgba(255,255,255,0.7)' }]}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Save/Discard for new recordings */}
      {isNewRecording && (
        <View style={styles.saveDiscardRow}>
          <TouchableOpacity
            style={styles.discardBtn}
            onPress={handleDiscardNew}
            activeOpacity={0.7}
          >
            <Text style={styles.discardBtnText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            onPress={handleSaveNew}
            activeOpacity={0.7}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

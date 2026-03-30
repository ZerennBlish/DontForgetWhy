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
import { hapticLight, hapticHeavy } from '../utils/haptics';
import {
  getAllVoiceMemos,
  updateVoiceMemo,
  deleteVoiceMemo,
} from '../services/voiceMemoStorage';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { refreshWidgets } from '../widget/updateWidget';
import BackButton from '../components/BackButton';
import type { RootStackParamList } from '../navigation/types';
import type { VoiceMemo } from '../types/voiceMemo';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceMemoDetail'>;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VoiceMemoDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { memoId } = route.params;

  const [memo, setMemo] = useState<VoiceMemo | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);

  const initialTitleRef = useRef('');
  const initialNoteRef = useRef('');
  const barWidthRef = useRef(0);

  const audioSource = useMemo(
    () => (memo ? { uri: memo.uri } : null),
    [memo?.uri],
  );
  const player = useAudioPlayer(audioSource);
  const playerStatus = useAudioPlayerStatus(player);

  // Load memo and background on mount
  useEffect(() => {
    (async () => {
      const [all] = await Promise.all([
        getAllVoiceMemos(),
        loadBackground().then(setBgUri),
        getOverlayOpacity().then(setBgOpacity),
      ]);
      const found = all.find((m) => m.id === memoId);
      if (found) {
        setMemo(found);
        setTitle(found.title);
        setNote(found.note);
        initialTitleRef.current = found.title;
        initialNoteRef.current = found.note;
      }
      setLoading(false);
    })();
  }, [memoId]);

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

  const handleBack = async () => {
    Keyboard.dismiss();
    try {
      player.pause();
    } catch {
      /* best-effort */
    }
    if (
      memo &&
      (title !== initialTitleRef.current || note !== initialNoteRef.current)
    ) {
      try {
        await updateVoiceMemo({
          ...memo,
          title,
          note,
          updatedAt: new Date().toISOString(),
        });
        refreshWidgets();
        ToastAndroid.show('Saved', ToastAndroid.SHORT);
      } catch {
        /* best-effort */
      }
    }
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete this memo?',
      "Once it's gone, it's gone. Well, for 30 days. Then it's really gone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            hapticHeavy();
            try {
              player.pause();
            } catch {
              /* */
            }
            await deleteVoiceMemo(memoId);
            refreshWidgets();
            navigation.goBack();
          },
        },
      ],
    );
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
    playerStatus.duration > 0 ? playerStatus.duration : memo?.duration || 0;

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
        headerRight: {
          position: 'absolute',
          right: 20,
          top: insets.top + 10,
        },
        headerTitle: {
          fontSize: 28,
          fontWeight: '800',
          color: '#FFFFFF',
        },
        trashBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(30, 30, 40, 0.7)',
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.4)',
        },
        trashIcon: {
          fontSize: 18,
        },
        content: {
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 24,
        },
        titleInput: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.textPrimary,
          paddingVertical: 8,
          paddingHorizontal: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
        },
        progressFill: {
          height: '100%',
          borderRadius: 3,
          backgroundColor: '#A29BFE',
        },
        timeRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 8,
        },
        timeText: {
          fontSize: 13,
          color: 'rgba(255, 255, 255, 0.5)',
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
          backgroundColor: 'rgba(30, 30, 40, 0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        skipText: {
          fontSize: 13,
          fontWeight: '700',
          color: 'rgba(255, 255, 255, 0.7)',
        },
        playPauseBtn: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#A29BFE',
          justifyContent: 'center',
          alignItems: 'center',
        },
        playPauseIcon: {
          fontSize: 24,
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
              source={require('../../assets/fullscreenicon.png')}
              style={{ width: '100%', height: '100%', opacity: 0.07 }}
              resizeMode="cover"
            />
          )}
        </View>
        <View style={styles.header}>
          <View style={styles.headerBack}>
            <BackButton onPress={() => navigation.goBack()} />
          </View>
          <Text style={styles.headerTitle}>Voice Memo</Text>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Memo not found</Text>
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
            style={{ width: '100%', height: '100%', opacity: 0.07 }}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBack}>
          <BackButton onPress={handleBack} />
        </View>
        <Text style={styles.headerTitle}>Voice Memo</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.trashBtn}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.trashIcon}>{'\u{1F5D1}\uFE0F'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Add a title..."
          placeholderTextColor={colors.textTertiary}
          maxLength={100}
          returnKeyType="next"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {/* Note */}
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          placeholderTextColor={colors.textTertiary}
          maxLength={200}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Playback section */}
        <View style={styles.playbackSection}>
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
            <Text style={styles.timeText}>
              {formatTime(playerStatus.currentTime)}
            </Text>
            <Text style={styles.timeText}>{formatTime(displayDuration)}</Text>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={skipBack}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>-5</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playPauseBtn}
              onPress={togglePlay}
              activeOpacity={0.7}
            >
              <Text style={styles.playPauseIcon}>
                {playerStatus.playing ? '\u23F8\uFE0F' : '\u25B6\uFE0F'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={skipForward}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

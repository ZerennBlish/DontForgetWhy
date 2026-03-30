import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  Image,
  AppState,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import {
  useAudioRecorder,
  useAudioPlayer,
  useAudioPlayerStatus,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { addVoiceMemo } from '../services/voiceMemoStorage';
import { saveVoiceMemoFile, deleteVoiceMemoFile } from '../services/voiceMemoFileStorage';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { refreshWidgets } from '../widget/updateWidget';
import BackButton from '../components/BackButton';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceRecord'>;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VoiceRecordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [saving, setSaving] = useState(false);

  const isRecordingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionRef = useRef(false);
  const savingRef = useRef(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const player = useAudioPlayer(recordingUri ? { uri: recordingUri } : null);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    loadBackground().then(setBgUri);
    getOverlayOpacity().then(setBgOpacity);
  }, []);

  // Reset position when playback finishes
  useEffect(() => {
    if (playerStatus.didJustFinish) {
      player.seekTo(0);
    }
  }, [playerStatus.didJustFinish, player]);

  // Stop recording on app background — keep the partial recording for preview
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active' && isRecordingRef.current) {
        isRecordingRef.current = false;
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        try {
          await recorder.stop();
          const status = recorder.getStatus();
          const uri = status.url;
          const durationMs = status.durationMillis || 0;
          if (uri && durationMs > 500) {
            setRecordingUri(uri);
            setRecordingDuration(Math.round(durationMs / 1000));
          }
        } catch { /* best-effort */ }
      }
    });
    return () => sub.remove();
  }, [recorder]);

  // Safety cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        try { recorder.stop(); } catch { /* */ }
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recorder]);

  const startRecording = async () => {
    transitionRef.current = true;
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        ToastAndroid.show('Microphone permission required', ToastAndroid.SHORT);
        return;
      }
      setRecordingUri(null);
      setRecordingDuration(0);
      setElapsedSeconds(0);

      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Recording failed:', e);
      ToastAndroid.show('Recording failed', ToastAndroid.SHORT);
    } finally {
      transitionRef.current = false;
    }
  };

  const stopRecording = async () => {
    transitionRef.current = true;
    const elapsed = elapsedSeconds;
    isRecordingRef.current = false;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = status.url;
      const durationMs = status.durationMillis || 0;
      if (uri) {
        const dur = durationMs > 0 ? Math.round(durationMs / 1000) : elapsed;
        setRecordingUri(uri);
        setRecordingDuration(dur);
      }
    } catch (e) {
      console.error('Stop recording failed:', e);
    } finally {
      transitionRef.current = false;
    }
  };

  const handleRecordPress = () => {
    if (transitionRef.current) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSave = async () => {
    if (!recordingUri || saving) return;
    savingRef.current = true;
    setSaving(true);
    hapticMedium();
    try {
      // Pause playback if active
      try { player.pause(); } catch { /* */ }

      const memoId = uuidv4();
      const permanentUri = await saveVoiceMemoFile(memoId, recordingUri);
      const now = new Date().toISOString();
      await addVoiceMemo({
        id: memoId,
        uri: permanentUri,
        title: '',
        note: '',
        duration: recordingDuration,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        noteId: null,
      });
      refreshWidgets();
      navigation.goBack();
    } catch (e) {
      console.error('Save failed:', e);
      ToastAndroid.show('Failed to save recording', ToastAndroid.SHORT);
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (savingRef.current) return;
    hapticLight();
    try { player.pause(); } catch { /* */ }
    if (recordingUri) {
      deleteVoiceMemoFile(recordingUri).catch(() => {});
    }
    navigation.goBack();
  };

  const handleBack = async () => {
    if (savingRef.current) return;
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      try {
        await recorder.stop();
        const status = recorder.getStatus();
        if (status.url) deleteVoiceMemoFile(status.url).catch(() => {});
      } catch { /* best-effort */ }
    } else if (recordingUri) {
      try { player.pause(); } catch { /* */ }
      deleteVoiceMemoFile(recordingUri).catch(() => {});
    }
    navigation.goBack();
  };

  const handlePlayToggle = () => {
    if (!recordingUri) return;
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const progress =
    playerStatus.duration > 0 ? playerStatus.currentTime / playerStatus.duration : 0;

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
        title: {
          fontSize: 28,
          fontWeight: '800',
          color: '#FFFFFF',
        },
        content: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 32,
        },
        micEmoji: {
          fontSize: 64,
          marginBottom: 24,
        },
        timer: {
          fontSize: 48,
          fontWeight: '200',
          color: colors.textPrimary,
          marginBottom: 40,
          fontVariant: ['tabular-nums'],
        },
        recordBtn: {
          width: 70,
          height: 70,
          borderRadius: 35,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 48,
        },
        stopIcon: {
          width: 24,
          height: 24,
          borderRadius: 4,
          backgroundColor: '#FFFFFF',
        },
        recordDot: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
        },
        previewCard: {
          width: '100%',
          backgroundColor: 'rgba(30, 30, 40, 0.7)',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          gap: 16,
          marginBottom: 24,
        },
        previewRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        },
        playBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accent,
          justifyContent: 'center',
          alignItems: 'center',
        },
        playBtnText: {
          fontSize: 20,
        },
        progressWrap: {
          flex: 1,
          gap: 6,
        },
        progressTrack: {
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
        },
        progressFill: {
          height: '100%',
          borderRadius: 2,
          backgroundColor: colors.accent,
        },
        progressTime: {
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.6)',
          fontWeight: '500',
          fontVariant: ['tabular-nums'],
        },
        btnRow: {
          flexDirection: 'row',
          gap: 12,
          width: '100%',
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
          backgroundColor: 'rgba(30, 30, 40, 0.7)',
          borderRadius: 20,
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        discardBtnText: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.textSecondary,
        },
        hint: {
          fontSize: 13,
          color: colors.textTertiary,
          textAlign: 'center',
          marginTop: 12,
        },
      }),
    [colors, insets],
  );

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
        <Text style={styles.title}>{'\u{1F3A4}'} Record</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Mic state icon */}
        <Text style={styles.micEmoji}>
          {isRecording
            ? '\u{1F534}'
            : recordingUri
              ? '\u2705'
              : '\u{1F399}\uFE0F'}
        </Text>

        {/* Timer */}
        <Text style={styles.timer}>
          {recordingUri && !isRecording
            ? formatTime(recordingDuration)
            : formatTime(elapsedSeconds)}
        </Text>

        {/* Record / Stop button — hidden once a recording exists */}
        {!recordingUri && (
          <TouchableOpacity
            style={[
              styles.recordBtn,
              { backgroundColor: isRecording ? '#FF3B30' : '#FF6B6B' },
            ]}
            onPress={handleRecordPress}
            activeOpacity={0.7}
          >
            {isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <View style={styles.recordDot} />
            )}
          </TouchableOpacity>
        )}

        {/* Preview card after recording */}
        {recordingUri && !isRecording && (
          <>
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={handlePlayToggle}
                  activeOpacity={0.7}
                >
                  <Text style={styles.playBtnText}>
                    {playerStatus.playing ? '\u23F8\uFE0F' : '\u25B6\uFE0F'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressTime}>
                    {formatTime(playerStatus.currentTime)} /{' '}
                    {formatTime(recordingDuration)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.discardBtn}
                onPress={handleDiscard}
                activeOpacity={0.7}
              >
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave}
                activeOpacity={0.7}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Idle hint */}
        {!isRecording && !recordingUri && (
          <Text style={styles.hint}>Tap to start recording</Text>
        )}
      </View>
    </View>
  );
}

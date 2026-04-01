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
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import { deleteVoiceMemoFile } from '../services/voiceMemoFileStorage';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceRecord'>;

const IDLE_HINTS = [
  "Go ahead. Talk to yourself. We won't judge.",
  'Your phone is listening. For once, on purpose.',
  'Speak now or forget forever.',
  'Your future self called. They said record this.',
  'One tap. Unlimited rambling.',
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VoiceRecordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [idleHint] = useState(() => IDLE_HINTS[Math.floor(Math.random() * IDLE_HINTS.length)]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);

  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionRef = useRef(false);
  const navigatedRef = useRef(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    loadBackground().then(setBgUri);
    getOverlayOpacity().then(setBgOpacity);
  }, []);

  // Stop recording on app background — navigate to detail with partial recording
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
          if (uri && durationMs > 500 && !navigatedRef.current) {
            navigatedRef.current = true;
            navigation.replace('VoiceMemoDetail', {
              tempUri: uri,
              duration: Math.round(durationMs / 1000),
            });
          }
        } catch { /* best-effort */ }
      }
    });
    return () => sub.remove();
  }, [recorder, navigation]);

  // Intercept all back/pop navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (navigatedRef.current) return;
      if (!isRecordingRef.current) return;
      e.preventDefault();
      isRecordingRef.current = false;
      isPausedRef.current = false;
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      (async () => {
        try {
          await recorder.stop();
          const status = recorder.getStatus();
          if (status.url) deleteVoiceMemoFile(status.url).catch(() => {});
        } catch { /* */ }
        navigation.dispatch(e.data.action);
      })();
    });
    return unsubscribe;
  }, [navigation, recorder]);

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
      setElapsedSeconds(0);
      setIsPaused(false);
      isPausedRef.current = false;

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
    setIsPaused(false);
    isPausedRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = status.url;
      const durationMs = status.durationMillis || 0;
      if (uri && !navigatedRef.current) {
        const dur = durationMs > 0 ? Math.round(durationMs / 1000) : elapsed;
        navigatedRef.current = true;
        navigation.replace('VoiceMemoDetail', { tempUri: uri, duration: dur });
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

  const handlePauseResume = () => {
    hapticLight();
    if (isPausedRef.current) {
      isPausedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      recorder.record();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      isPausedRef.current = true;
      recorder.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleBack = async () => {
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
    }
    navigation.goBack();
  };

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
        headerHome: {
          position: 'absolute',
          left: 64,
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
        timer: {
          fontSize: 48,
          fontWeight: '200',
          color: colors.textPrimary,
          marginBottom: 40,
          fontVariant: ['tabular-nums'],
        },
        btnRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
          marginBottom: 48,
        },
        pauseBtn: {
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: '#4CAF50',
          justifyContent: 'center',
          alignItems: 'center',
        },
        pauseTriangle: {
          width: 0,
          height: 0,
          borderLeftWidth: 12,
          borderLeftColor: '#FFFFFF',
          borderTopWidth: 8,
          borderTopColor: 'transparent',
          borderBottomWidth: 8,
          borderBottomColor: 'transparent',
          marginLeft: 3,
        },
        pauseBtnBars: {
          flexDirection: 'row',
          gap: 3,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pauseBtnBar: {
          width: 3,
          height: 14,
          backgroundColor: '#FFFFFF',
          borderRadius: 1,
        },
        recordBtn: {
          width: 70,
          height: 70,
          borderRadius: 35,
          justifyContent: 'center',
          alignItems: 'center',
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
        recordingLabel: {
          fontSize: 14,
          fontWeight: '600',
          color: '#FF6B6B',
          opacity: 0.8,
          marginTop: -32,
          marginBottom: 32,
        },
        pausedLabel: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.textTertiary,
          marginTop: -32,
          marginBottom: 32,
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
            style={{ width: '100%', height: '100%', opacity: colors.mode === 'dark' ? 0.07 : 0.04 }}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBack}>
          <BackButton onPress={handleBack} />
        </View>
        <View style={styles.headerHome}>
          <HomeButton />
        </View>
        <Text style={styles.title}>{'\u{1F3A4}'} Record</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.timer, isPaused && { color: colors.textTertiary }]}>
          {formatTime(elapsedSeconds)}
        </Text>

        {isRecording ? (
          <>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.pauseBtn}
                onPress={handlePauseResume}
                activeOpacity={0.7}
              >
                {isPaused ? (
                  <View style={styles.pauseTriangle} />
                ) : (
                  <View style={styles.pauseBtnBars}>
                    <View style={styles.pauseBtnBar} />
                    <View style={styles.pauseBtnBar} />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recordBtn, { backgroundColor: '#FF3B30' }]}
                onPress={handleRecordPress}
                activeOpacity={0.7}
              >
                <View style={styles.stopIcon} />
              </TouchableOpacity>
            </View>
            {isPaused ? (
              <Text style={styles.pausedLabel}>Paused</Text>
            ) : (
              <Text style={styles.recordingLabel}>Recording...</Text>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.recordBtn, { backgroundColor: '#FF6B6B', marginBottom: 48 }]}
              onPress={handleRecordPress}
              activeOpacity={0.7}
            >
              <View style={styles.recordDot} />
            </TouchableOpacity>
            <Text style={styles.hint}>{idleHint}</Text>
          </>
        )}
      </View>
    </View>
  );
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  Image,
  AppState,
  Alert,
  ScrollView,
} from 'react-native';
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { hapticLight } from '../utils/haptics';
import { deleteVoiceMemoFile, saveVoiceClipFile } from '../services/voiceMemoFileStorage';
import { addClip, getNextClipPosition } from '../services/voiceClipStorage';
import { addVoiceMemo, updateVoiceMemo, getVoiceMemoById } from '../services/voiceMemoStorage';
import { saveVoiceMemoImage } from '../services/voiceMemoImageStorage';
import APP_ICONS from '../data/appIconAssets';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { refreshWidgets } from '../widget/updateWidget';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import MEDIA_ICONS, { GlowIcon } from '../assets/mediaIcons';
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

export default function VoiceRecordScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const addToMemoId = route.params?.addToMemoId ?? null;
  const isAddClipMode = !!addToMemoId;

  const [idleHint] = useState(() => IDLE_HINTS[Math.floor(Math.random() * IDLE_HINTS.length)]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionRef = useRef(false);
  const navigatedRef = useRef(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const takePhoto = async () => {
    if (isRecordingRef.current) {
      ToastAndroid.show('Stop recording first', ToastAndroid.SHORT);
      return;
    }
    if (capturedPhotos.length >= 5) {
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
      setCapturedPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    hapticLight();
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAndNavigate = async (uri: string, dur: number) => {
    if (isAddClipMode && addToMemoId) {
      try {
        const clipId = uuidv4();
        const permanentUri = await saveVoiceClipFile(clipId, uri);
        const position = getNextClipPosition(addToMemoId);
        addClip({
          id: clipId,
          memoId: addToMemoId,
          uri: permanentUri,
          duration: dur,
          position,
          label: null,
          createdAt: new Date().toISOString(),
        });
        if (capturedPhotos.length > 0) {
          const savedUris: string[] = [];
          for (const photoUri of capturedPhotos) {
            try {
              const saved = await saveVoiceMemoImage(addToMemoId, photoUri);
              savedUris.push(saved);
            } catch { /* best-effort */ }
          }
          if (savedUris.length > 0) {
            const existingMemo = getVoiceMemoById(addToMemoId);
            if (existingMemo) {
              const currentImages = existingMemo.images ?? [];
              await updateVoiceMemo({
                ...existingMemo,
                images: [...currentImages, ...savedUris],
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        ToastAndroid.show('Clip added', ToastAndroid.SHORT);
      } catch (e) {
        console.error('Failed to save clip:', e);
        ToastAndroid.show('Failed to save clip', ToastAndroid.SHORT);
      }
      navigation.goBack();
    } else {
      try {
        const newMemoId = uuidv4();
        const clipId = uuidv4();
        const now = new Date().toISOString();
        const permanentUri = await saveVoiceClipFile(clipId, uri);

        try {
          await addVoiceMemo({
            id: newMemoId,
            uri: '',
            title: '',
            note: '',
            duration: 0,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            noteId: null,
          });
          addClip({
            id: clipId,
            memoId: newMemoId,
            uri: permanentUri,
            duration: dur,
            position: 0,
            label: null,
            createdAt: now,
          });
        } catch (metaError) {
          deleteVoiceMemoFile(permanentUri).catch(() => {});
          throw metaError;
        }
        if (capturedPhotos.length > 0) {
          const savedUris: string[] = [];
          for (const photoUri of capturedPhotos) {
            try {
              const saved = await saveVoiceMemoImage(newMemoId, photoUri);
              savedUris.push(saved);
            } catch { /* best-effort */ }
          }
          if (savedUris.length > 0) {
            const createdMemo = getVoiceMemoById(newMemoId);
            if (createdMemo) {
              await updateVoiceMemo({
                ...createdMemo,
                images: savedUris,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        refreshWidgets();
        navigation.replace('VoiceMemoDetail', { memoId: newMemoId });
      } catch (e) {
        console.error('Failed to create memo:', e);
        ToastAndroid.show('Failed to save recording', ToastAndroid.SHORT);
        navigation.goBack();
      }
    }
  };

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
            const dur = Math.round(durationMs / 1000);
            await saveAndNavigate(uri, dur);
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
      Alert.alert(
        'Discard recording?',
        'Your recording will be lost if you leave now.',
        [
          { text: 'Keep recording', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              navigatedRef.current = true;
              isRecordingRef.current = false;
              isPausedRef.current = false;
              setIsRecording(false);
              setIsPaused(false);
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              try {
                await recorder.stop();
                const status = recorder.getStatus();
                if (status.url) deleteVoiceMemoFile(status.url).catch(() => {});
              } catch { /* */ }
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
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
        await saveAndNavigate(uri, dur);
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
          fontSize: 26,
          fontFamily: FONTS.extraBold,
          color: colors.textPrimary,
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
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        },
        recordBtn: {
          width: 70,
          height: 70,
          borderRadius: 35,
          justifyContent: 'center',
          alignItems: 'center',
        },
        recordingLabel: {
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          color: colors.red,
          opacity: 0.8,
          marginTop: -32,
          marginBottom: 32,
        },
        pausedLabel: {
          fontSize: 13,
          fontFamily: FONTS.semiBold,
          color: colors.textTertiary,
          marginTop: -32,
          marginBottom: 32,
        },
        hint: {
          fontSize: 12,
          fontFamily: FONTS.regular,
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
            source={require('../../assets/fullscreenicon.webp')}
            style={{ width: '100%', height: '100%', opacity: colors.mode === 'dark' ? 0.15 : 0.06 }}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBack}>
          <BackButton onPress={handleBack} forceDark={!!bgUri} />
        </View>
        <View style={styles.headerHome}>
          <HomeButton forceDark={!!bgUri} />
        </View>
        <Text style={[styles.title, bgUri && { color: colors.overlayText }]}>
          {isAddClipMode ? 'Add Clip' : 'Record'}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.timer, isPaused ? { color: bgUri ? 'rgba(255,255,255,0.4)' : colors.textTertiary } : bgUri ? { color: colors.overlayText } : undefined]} accessibilityLiveRegion="polite">
          {formatTime(elapsedSeconds)}
        </Text>

        {isRecording ? (
          <>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.pauseBtn}
                onPress={handlePauseResume}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={isPaused ? "Resume recording" : "Pause recording"}
              >
                {isPaused ? (
                  <GlowIcon source={MEDIA_ICONS.play} size={56} glowColor={colors.success} />
                ) : (
                  <GlowIcon source={MEDIA_ICONS.pause} size={56} glowColor={colors.success} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recordBtn}
                onPress={handleRecordPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Stop recording"
              >
                <GlowIcon source={MEDIA_ICONS.stop} size={56} glowColor={colors.red} />
              </TouchableOpacity>
            </View>
            <View accessibilityLiveRegion="polite">
              {isPaused ? (
                <Text style={styles.pausedLabel}>Paused</Text>
              ) : (
                <Text style={styles.recordingLabel}>Recording...</Text>
              )}
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleRecordPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Start recording"
              style={{ marginBottom: 48 }}
            >
              <GlowIcon source={APP_ICONS.microphone} size={56} glowColor={colors.red} />
            </TouchableOpacity>

            <Text style={styles.hint}>{idleHint}</Text>
          </>
        )}

        {capturedPhotos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 16, maxHeight: 72 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
          >
            {capturedPhotos.map((uri, index) => (
              <View key={uri + index} style={{ position: 'relative' }}>
                <Image
                  source={{ uri }}
                  style={{ width: 64, height: 64, borderRadius: 8 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: colors.red,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => removePhoto(index)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Image source={APP_ICONS.closeX} style={{ width: 10, height: 10 }} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Camera — bottom right corner, always visible */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: insets.bottom + 32,
          right: 32,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
          borderWidth: 1,
          borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={takePhoto}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Take a photo"
      >
        <Image source={APP_ICONS.camera} style={{ width: 26, height: 26 }} resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
}

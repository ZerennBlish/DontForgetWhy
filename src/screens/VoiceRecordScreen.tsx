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
import { addVoiceMemo, updateVoiceMemo, getVoiceMemoById, permanentlyDeleteVoiceMemo } from '../services/voiceMemoStorage';
import { saveVoiceMemoImage } from '../services/voiceMemoImageStorage';
import { useAppIcon } from '../hooks/useAppIcon';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { refreshWidgets } from '../widget/updateWidget';
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

export default function VoiceRecordScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const addToMemoId = route.params?.addToMemoId ?? null;
  const isAddClipMode = !!addToMemoId;

  const cameraIcon = useAppIcon('camera');
  const playIcon = useAppIcon('media.play');
  const pauseIcon = useAppIcon('media.pause');
  const stopIcon = useAppIcon('media.stop');
  const recordIcon = useAppIcon('media.record');
  const closeXIcon = useAppIcon('closeX');

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
  const capturedPhotosRef = useRef<string[]>([]);

  useEffect(() => {
    capturedPhotosRef.current = capturedPhotos;
  }, [capturedPhotos]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const takePhoto = async () => {
    if (isRecordingRef.current) {
      ToastAndroid.show('Stop recording first', ToastAndroid.SHORT);
      return;
    }
    let existingCount = 0;
    if (isAddClipMode && addToMemoId) {
      const existing = getVoiceMemoById(addToMemoId);
      existingCount = existing?.images?.length ?? 0;
    }
    if (capturedPhotos.length + existingCount >= 5) {
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
    const photosToSave = capturedPhotosRef.current;
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
        if (photosToSave.length > 0) {
          const savedUris: string[] = [];
          for (const photoUri of photosToSave) {
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
        navigation.goBack();
      } catch (e) {
        console.error('Failed to save clip:', e);
        ToastAndroid.show('Failed to save clip', ToastAndroid.SHORT);
        navigation.goBack();
      }
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
          try {
            addClip({
              id: clipId,
              memoId: newMemoId,
              uri: permanentUri,
              duration: dur,
              position: 0,
              label: null,
              createdAt: now,
            });
          } catch (clipError) {
            await permanentlyDeleteVoiceMemo(newMemoId);
            deleteVoiceMemoFile(permanentUri).catch(() => {});
            throw clipError;
          }
        } catch (metaError) {
          deleteVoiceMemoFile(permanentUri).catch(() => {});
          throw metaError;
        }
        if (photosToSave.length > 0) {
          const savedUris: string[] = [];
          for (const photoUri of photosToSave) {
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
      const hasRecording = isRecordingRef.current;
      const hasPhotos = capturedPhotosRef.current.length > 0;
      if (!hasRecording && !hasPhotos) return;
      e.preventDefault();
      const title = hasRecording ? 'Discard recording?' : 'Discard photos?';
      const message = hasRecording
        ? `Your recording${hasPhotos ? ' and photos' : ''} will be lost if you leave now.`
        : 'You have unsaved photos. Discard them?';
      const cancelText = hasRecording ? 'Keep recording' : 'Keep photos';
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: 'cancel' },
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
              if (hasRecording) {
                try {
                  await recorder.stop();
                  const status = recorder.getStatus();
                  if (status.url) deleteVoiceMemoFile(status.url).catch(() => {});
                } catch { /* */ }
              }
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

  const handleBack = () => {
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
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        },
        recordBtn: {
          width: 70,
          height: 70,
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
                  <Image source={playIcon} style={{ width: 56, height: 56 }} resizeMode="contain" />
                ) : (
                  <Image source={pauseIcon} style={{ width: 56, height: 56 }} resizeMode="contain" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recordBtn}
                onPress={handleRecordPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Stop recording"
              >
                <Image source={stopIcon} style={{ width: 56, height: 56 }} resizeMode="contain" />
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
              <Image source={recordIcon} style={{ width: 80, height: 80 }} resizeMode="contain" />
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
                    width: 28,
                    height: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => removePhoto(index)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Image source={closeXIcon} style={{ width: 22, height: 22 }} resizeMode="contain" />
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
          width: 56,
          height: 56,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={takePhoto}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Take a photo"
      >
        <Image source={cameraIcon} style={{ width: 48, height: 48 }} resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
}

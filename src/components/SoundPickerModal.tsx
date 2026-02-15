import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../theme/ThemeContext';

// react-native-notification-sounds doesn't ship types
export interface SystemSound {
  title: string;
  url: string;
  soundID: number;
}

let NotificationSounds: {
  getNotifications: (type: string) => Promise<SystemSound[]>;
} | null = null;

try {
  NotificationSounds = require('react-native-notification-sounds').default;
} catch {}

interface Props {
  visible: boolean;
  onSelect: (sound: SystemSound | null) => void;
  onClose: () => void;
  currentSoundID: number | null;
}

export default function SoundPickerModal({
  visible,
  onSelect,
  onClose,
  currentSoundID,
}: Props) {
  const { colors } = useTheme();
  const [sounds, setSounds] = useState<SystemSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const audioModeReady = useRef(false);
  const isActiveRef = useRef(false);

  const stopPreview = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setPlayingId(null);
  }, []);

  // Load system sounds when modal opens (no fire-and-forget audio mode here —
  // ensureAudioMode() in handlePlay is the sole path for configuring audio)
  useEffect(() => {
    if (!visible) return;

    isActiveRef.current = true;

    if (Platform.OS !== 'android' || !NotificationSounds) {
      setLoading(false);
      setError('System sounds only available on Android');
      return;
    }

    setLoading(true);
    setError(null);
    setFilter('');
    NotificationSounds.getNotifications('alarm')
      .then((list) => {
        setSounds(list);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [visible]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!visible) {
      isActiveRef.current = false;
      stopPreview();
      audioModeReady.current = false;
    }
  }, [visible, stopPreview]);

  // Cleanup on unmount — unload any active sound regardless of modal state
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        try { soundRef.current.unloadAsync(); } catch {}
        soundRef.current = null;
      }
    };
  }, []);

  // Sole path for configuring audio mode — always awaited before playback
  const ensureAudioMode = async (): Promise<boolean> => {
    if (audioModeReady.current) return true;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      audioModeReady.current = true;
      console.log('[SoundPicker] Audio mode configured');
      return true;
    } catch (err) {
      console.error('[SoundPicker] ensureAudioMode failed:', err);
      return false;
    }
  };

  const handlePlay = async (item: SystemSound) => {
    console.log('[SoundPicker] Playing sound:', item.title, item.url);

    // Step 1: Bail out immediately if modal is no longer active
    if (!isActiveRef.current) return;

    if (playingId === item.soundID) {
      await stopPreview();
      return;
    }

    await stopPreview();

    // Step 2: Await audio mode configuration
    const ready = await ensureAudioMode();
    if (!ready) {
      console.error('[SoundPicker] Cannot play — audio mode not acquired');
      return;
    }

    // Re-check after async gap
    if (!isActiveRef.current) return;

    try {
      // Step 3: Await sound creation
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: item.url },
      );
      console.log('[SoundPicker] createAsync status:', JSON.stringify(status));

      // Step 4: Check isActiveRef again — modal may have closed during createAsync
      if (!isActiveRef.current) {
        try { await sound.unloadAsync(); } catch {}
        return;
      }

      // Step 5: Store and play
      soundRef.current = sound;
      setPlayingId(item.soundID);

      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) {
          stopPreview();
        }
      });

      await sound.playAsync();
      console.log('[SoundPicker] playAsync resolved');
    } catch (err) {
      console.error('[SoundPicker] handlePlay error:', err);
      // Clean up sound object if createAsync succeeded but playAsync failed
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch {}
        soundRef.current = null;
      }
      setPlayingId(null);
    }
  };

  const handleSelect = async (item: SystemSound | null) => {
    await stopPreview();
    onSelect(item);
  };

  const handleClose = async () => {
    await stopPreview();
    onClose();
  };

  const filtered = filter
    ? sounds.filter((s) =>
        s.title.toLowerCase().includes(filter.toLowerCase()),
      )
    : sounds;

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '70%',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeBtnText: {
      fontSize: 16,
      color: colors.textTertiary,
      fontWeight: '600',
    },
    searchBox: {
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowInfo: {
      flex: 1,
      marginRight: 10,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    rowTitleSelected: {
      fontWeight: '700',
      color: colors.accent,
    },
    check: {
      fontSize: 16,
      color: colors.accent,
      fontWeight: '700',
      marginRight: 10,
    },
    playBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    playBtnIdle: {
      backgroundColor: colors.card,
    },
    playBtnActive: {
      backgroundColor: colors.accent,
    },
    playIcon: {
      fontSize: 14,
    },
    playIconIdle: {
      color: colors.textSecondary,
    },
    playIconActive: {
      color: colors.overlayText,
    },
    centered: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    errorText: {
      fontSize: 14,
      color: colors.red,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
    },
    defaultIcon: {
      fontSize: 20,
      marginRight: 12,
    },
  });

  const renderItem = ({ item }: { item: SystemSound }) => {
    const isSelected = currentSoundID === item.soundID;
    const isPlaying = playingId === item.soundID;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowInfo}>
          <Text
            style={[styles.rowTitle, isSelected && styles.rowTitleSelected]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
        {isSelected && <Text style={styles.check}>{'\u2713'}</Text>}
        <TouchableOpacity
          style={[
            styles.playBtn,
            isPlaying ? styles.playBtnActive : styles.playBtnIdle,
          ]}
          onPress={() => handlePlay(item)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.playIcon,
              isPlaying ? styles.playIconActive : styles.playIconIdle,
            ]}
          >
            {isPlaying ? '\u25A0' : '\u25B6'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.title}>Select Sound</Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeBtnText}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchBox}
                placeholder="Filter sounds..."
                placeholderTextColor={colors.textTertiary}
                value={filter}
                onChangeText={setFilter}
                autoCorrect={false}
              />

              {/* Default option — always visible */}
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelect(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.defaultIcon}>{'\u{1F514}'}</Text>
                <View style={styles.rowInfo}>
                  <Text
                    style={[
                      styles.rowTitle,
                      currentSoundID === null && styles.rowTitleSelected,
                    ]}
                  >
                    Default Alarm Sound
                  </Text>
                </View>
                {currentSoundID === null && (
                  <Text style={styles.check}>{'\u2713'}</Text>
                )}
              </TouchableOpacity>

              {loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              ) : error ? (
                <View style={styles.centered}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : filtered.length === 0 ? (
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>No sounds match filter</Text>
                </View>
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => String(item.soundID)}
                  renderItem={renderItem}
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

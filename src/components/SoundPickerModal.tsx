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
import { previewSystemSound, cancelSoundPreview } from '../services/notifications';
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
  const isActiveRef = useRef(false);

  const stopPreview = useCallback(async () => {
    await cancelSoundPreview();
    setPlayingId(null);
  }, []);

  // Load system sounds when modal opens
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
    }
  }, [visible, stopPreview]);

  // Cleanup on unmount — cancel any active preview notification
  useEffect(() => {
    return () => {
      cancelSoundPreview();
    };
  }, []);

  const handlePlay = async (item: SystemSound) => {
    if (!isActiveRef.current) return;

    if (playingId === item.soundID) {
      await stopPreview();
      return;
    }

    await stopPreview();

    // Re-check after async gap
    if (!isActiveRef.current) return;

    try {
      setPlayingId(item.soundID);
      await previewSystemSound(item.url, item.title);

      // Auto-clear playingId after 3s (matches notification auto-cancel)
      setTimeout(() => {
        setPlayingId((current) => (current === item.soundID ? null : current));
      }, 3000);
    } catch (err) {
      console.warn('[SoundPicker] Preview failed:', err);
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

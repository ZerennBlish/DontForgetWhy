import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  NativeModules,
} from 'react-native';
import MEDIA_ICONS, { GlowIcon } from '../assets/mediaIcons';
import APP_ICONS from '../data/appIconAssets';
import { previewSystemSound, cancelSoundPreview } from '../services/notifications';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FONTS } from '../theme/fonts';

export interface SystemSound {
  title: string;
  url: string;
  soundID: number;
}

const { AlarmChannelModule } = NativeModules;

interface Props {
  visible: boolean;
  onSelect: (sound: SystemSound | null) => void;
  onClose: () => void;
  currentSoundID: number | null;
}

// Memoized row component. Pulled out of the parent so a search keystroke
// or play-state flip doesn't recreate every list row's element tree —
// React.memo skips rows whose own props didn't change.
interface SoundRowProps {
  sound: SystemSound;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: (sound: SystemSound) => void;
  onPlay: (sound: SystemSound) => void;
  colors: ThemeColors;
  rowStyle: object;
  rowInfoStyle: object;
  rowTitleStyle: object;
  rowTitleSelectedStyle: object;
  playBtnStyle: object;
  playBtnIdleStyle: object;
  playBtnActiveStyle: object;
}

const SoundRow = React.memo(function SoundRow({
  sound,
  isSelected,
  isPlaying,
  onSelect,
  onPlay,
  colors,
  rowStyle,
  rowInfoStyle,
  rowTitleStyle,
  rowTitleSelectedStyle,
  playBtnStyle,
  playBtnIdleStyle,
  playBtnActiveStyle,
}: SoundRowProps) {
  const handleSelect = useCallback(() => onSelect(sound), [onSelect, sound]);
  const handlePlay = useCallback(() => onPlay(sound), [onPlay, sound]);
  return (
    <TouchableOpacity
      style={rowStyle}
      onPress={handleSelect}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Select ${sound.title} alarm sound`}
    >
      <View style={rowInfoStyle}>
        <Text
          style={[rowTitleStyle, isSelected && rowTitleSelectedStyle]}
          numberOfLines={1}
        >
          {sound.title}
        </Text>
      </View>
      {isSelected && <Image source={APP_ICONS.checkmark} style={{ width: 16, height: 16 }} resizeMode="contain" />}
      <TouchableOpacity
        style={[playBtnStyle, isPlaying ? playBtnActiveStyle : playBtnIdleStyle]}
        onPress={handlePlay}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Stop preview' : 'Preview sound'}
      >
        <GlowIcon
          source={isPlaying ? MEDIA_ICONS.stop : MEDIA_ICONS.play}
          size={20}
          glowColor={isPlaying ? colors.red : colors.accent}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

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

    if (Platform.OS !== 'android' || !AlarmChannelModule) {
      setLoading(false);
      setError('System sounds only available on Android');
      return;
    }

    setLoading(true);
    setError(null);
    setFilter('');
    AlarmChannelModule.getSystemAlarmSounds()
      .then((list: SystemSound[]) => {
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

  const handlePlay = useCallback(async (item: SystemSound) => {
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
  }, [playingId, stopPreview]);

  const handleSelect = useCallback(async (item: SystemSound | null) => {
    await stopPreview();
    onSelect(item);
  }, [stopPreview, onSelect]);

  const handleClose = useCallback(async () => {
    await stopPreview();
    onClose();
  }, [stopPreview, onClose]);

  const filtered = filter
    ? sounds.filter((s) =>
        s.title.toLowerCase().includes(filter.toLowerCase()),
      )
    : sounds;

  const styles = useMemo(() => StyleSheet.create({
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
      fontSize: 17,
      fontFamily: FONTS.bold,
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
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
    },
    rowTitleSelected: {
      fontFamily: FONTS.bold,
      color: colors.accent,
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
    centered: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    errorText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.red,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
    },
  }), [colors]);

  const renderItem = useCallback(
    ({ item }: { item: SystemSound }) => (
      <SoundRow
        sound={item}
        isSelected={currentSoundID === item.soundID}
        isPlaying={playingId === item.soundID}
        onSelect={handleSelect}
        onPlay={handlePlay}
        colors={colors}
        rowStyle={styles.row}
        rowInfoStyle={styles.rowInfo}
        rowTitleStyle={styles.rowTitle}
        rowTitleSelectedStyle={styles.rowTitleSelected}
        playBtnStyle={styles.playBtn}
        playBtnIdleStyle={styles.playBtnIdle}
        playBtnActiveStyle={styles.playBtnActive}
      />
    ),
    [currentSoundID, playingId, handleSelect, handlePlay, colors, styles],
  );

  return (
    <Modal transparent visible={visible} animationType="slide">
      <TouchableWithoutFeedback
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close sound picker"
      >
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet} accessibilityViewIsModal={true}>
              <View style={styles.header}>
                <Text style={styles.title}>Select Sound</Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleClose}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Close sound picker"
                >
                  <Image source={APP_ICONS.closeX} style={{ width: 16, height: 16 }} resizeMode="contain" />
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
                accessibilityRole="button"
                accessibilityLabel="Select default alarm sound"
              >
                <Image source={APP_ICONS.bell} style={{ width: 20, height: 20 }} resizeMode="contain" />
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
                  <Image source={APP_ICONS.checkmark} style={{ width: 16, height: 16 }} resizeMode="contain" />
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
                  removeClippedSubviews={true}
                  windowSize={5}
                  maxToRenderPerBatch={8}
                  initialNumToRender={8}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

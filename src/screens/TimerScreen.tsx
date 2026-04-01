import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  useWindowDimensions,
  ToastAndroid,
  TextInput,
  Alert,
  AppState,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TimerPreset, ActiveTimer, UserTimer } from '../types/timer';
import {
  loadPresets,
  saveCustomDuration,
  recordPresetUsage,
  loadRecentPresetIds,
  loadActiveTimers,
  saveActiveTimers,
  loadUserTimers,
  saveUserTimer,
  deleteUserTimer,
  updateUserTimer,
} from '../services/timerStorage';
import { scheduleTimerNotification, cancelTimerNotification, showTimerCountdownNotification, cancelTimerCountdownNotification } from '../services/notifications';
import { getPinnedPresets, togglePinPreset, isPinned, unpinPreset } from '../services/widgetPins';
import { refreshWidgets } from '../widget/updateWidget';
import { loadSettings, getDefaultTimerSound, saveDefaultTimerSound } from '../services/settings';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { playChirp } from '../utils/soundFeedback';
import BackButton from '../components/BackButton';
import HomeButton from '../components/HomeButton';
import TimePicker from '../components/TimePicker';
import SoundPickerModal from '../components/SoundPickerModal';
import type { SystemSound } from '../components/SoundPickerModal';
import type { RootStackParamList } from '../navigation/types';


function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Custom';
  if (seconds < 60) return `${seconds}s`;
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.floor(seconds / 60)} min`;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Timers'>;

function recalculateTimers(timers: ActiveTimer[]): ActiveTimer[] {
  const now = Date.now();
  return timers.map((t) => {
    if (!t.isRunning) return t;
    const elapsed = Math.floor((now - new Date(t.startedAt).getTime()) / 1000);
    const remaining = Math.max(0, t.totalSeconds - elapsed);
    return { ...t, remainingSeconds: remaining, isRunning: remaining > 0 };
  });
}

export default function TimerScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const presetCardWidth = (screenWidth - 32 - 16) / 3;
  const [presets, setPresets] = useState<TimerPreset[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [customModal, setCustomModal] = useState<TimerPreset | null>(null);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [customSeconds, setCustomSeconds] = useState(0);
  const [soundMode, setSoundMode] = useState<'sound' | 'vibrate' | 'silent'>('sound');
  const [userTimers, setUserTimers] = useState<UserTimer[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTimerName, setNewTimerName] = useState('');
  const [newTimerIcon, setNewTimerIcon] = useState('\u{1F60A}');
  const [editingUserTimer, setEditingUserTimer] = useState<UserTimer | null>(null);
  const [timeInputMode, setTimeInputMode] = useState<'scroll' | 'type'>('scroll');
  const [timerSoundName, setTimerSoundName] = useState<string | null>(null);
  const [timerSoundID, setTimerSoundID] = useState<number | null>(null);
  const [timerSoundPickerVisible, setTimerSoundPickerVisible] = useState(false);
  const iconInputRef = useRef<TextInput>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 60 + insets.bottom,
    },
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    subsectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
      marginBottom: 8,
    },
    activeCard: {
      backgroundColor: colors.card + 'BF',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    activeIcon: {
      fontSize: 24,
    },
    activeLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    activeRight: {
      alignItems: 'flex-end',
      gap: 8,
    },
    activeCountdown: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    activeDone: {
      fontSize: 20,
      color: colors.red,
      fontWeight: '700',
    },
    activeActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      padding: 6,
      backgroundColor: colors.activeBackground,
      borderRadius: 8,
    },
    actionBtnText: {
      fontSize: 16,
    },
    cancelBtn: {
      padding: 6,
      backgroundColor: colors.card,
      borderRadius: 8,
    },
    cancelBtnText: {
      fontSize: 14,
      color: colors.red,
      fontWeight: '700',
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetCard: {
      width: presetCardWidth,
      backgroundColor: colors.card + 'BF',
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
    },
    presetIcon: {
      fontSize: 20,
      marginBottom: 2,
    },
    presetLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    presetDuration: {
      fontSize: 10,
      color: colors.textTertiary,
      marginTop: 2,
    },
    pinIndicator: {
      position: 'absolute',
      top: 3,
      right: 5,
      fontSize: 10,
      color: colors.accent,
    },
    cardEditBtn: {
      position: 'absolute',
      top: 4,
      left: 4,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.background + '99',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    cardEditBtnText: {
      fontSize: 10,
    },
    cardPinBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.background + '99',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    cardPinBtnText: {
      fontSize: 10,
    },
    hint: {
      fontSize: 11,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    modalPinBtn: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 17,
      backgroundColor: colors.background,
    },
    modalPinText: {
      fontSize: 16,
    },
    soundModeIconBtn: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 17,
      backgroundColor: colors.card,
    },
    soundModeIconText: {
      fontSize: 18,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      marginBottom: 20,
    },
    modalInputRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    modalInputGroup: {
      flex: 1,
      alignItems: 'center',
    },
    modalInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      width: '100%',
    },
    modalInputLabel: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 6,
    },
    modalBtns: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelBtn: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    modalSaveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalSaveText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    newTimerHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    emojiCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiCircleText: {
      fontSize: 24,
    },
    headerNameInput: {
      flex: 1,
      marginHorizontal: 12,
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      backgroundColor: 'transparent',
      paddingVertical: 4,
    },
    headerSoundBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    emojiHintSmall: {
      fontSize: 11,
      color: colors.textTertiary,
      textAlign: 'center',
      marginBottom: 8,
    },
    hiddenInput: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1,
    },
  }), [colors, insets.bottom, presetCardWidth]);

  useEffect(() => {
    loadPresets().then(setPresets);
    loadRecentPresetIds().then(setRecentIds);
    getPinnedPresets().then(setPinnedIds);
    loadUserTimers().then(setUserTimers);
    loadSettings().then((s) => setTimeInputMode(s.timeInputMode));
    getDefaultTimerSound().then((s) => { setTimerSoundName(s.name || null); setTimerSoundID(s.soundID || null); }).catch(() => {});
  }, []);

  // Load and recalculate timers on focus
  useFocusEffect(
    useCallback(() => {
      loadActiveTimers().then((loaded) => {
        const recalculated = recalculateTimers(loaded);
        setActiveTimers(recalculated);
        const needsSave = recalculated.some(
          (t, i) => t.remainingSeconds !== loaded[i].remainingSeconds,
        );
        if (needsSave) saveActiveTimers(recalculated);
      });
      loadBackground().then(setBgUri);
      getOverlayOpacity().then(setBgOpacity);
    }, []),
  );

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers((prev) => {
        const hasRunning = prev.some(
          (t) => t.isRunning && t.remainingSeconds > 0,
        );
        if (!hasRunning) return prev;

        let completed = false;
        const updated = prev.map((t) => {
          if (!t.isRunning || t.remainingSeconds <= 0) return t;
          const remaining = t.remainingSeconds - 1;
          if (remaining <= 0) {
            completed = true;
            return { ...t, remainingSeconds: 0, isRunning: false };
          }
          return { ...t, remainingSeconds: remaining };
        });

        if (completed) saveActiveTimers(updated);
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reload active timers when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadActiveTimers().then((loaded) => {
          const recalculated = recalculateTimers(loaded);
          setActiveTimers(recalculated);
          const needsSave = recalculated.some(
            (t, i) => t.remainingSeconds !== loaded[i].remainingSeconds,
          );
          if (needsSave) saveActiveTimers(recalculated);
        });
      }
    });
    return () => subscription.remove();
  }, []);

  const handleAddTimer = async (timer: ActiveTimer) => {
    const completionTimestamp = Date.now() + timer.remainingSeconds * 1000;
    let soundUri: string | undefined;
    let soundName: string | undefined;
    try {
      const defaultSound = await getDefaultTimerSound();
      if (defaultSound.uri) {
        soundUri = defaultSound.uri;
        soundName = defaultSound.name || 'Custom';
      }
    } catch (err) {
      console.error('[handleAddTimer] getDefaultTimerSound failed:', err);
    }
    let notificationId: string | undefined;
    try {
      notificationId = await scheduleTimerNotification(
        timer.label, timer.icon, completionTimestamp, timer.id, soundUri, soundName, timer.soundId,
      );
    } catch (error) {
      console.error('[handleAddTimer] scheduleTimerNotification failed:', error);
      Alert.alert('Timer Started', 'Timer is running but the notification could not be scheduled.');
    }
    showTimerCountdownNotification(timer.label, timer.icon, completionTimestamp, timer.id).catch(
      (e) => console.error('[handleAddTimer] showTimerCountdownNotification failed:', e),
    );
    const timerWithNotif = { ...timer, notificationId };
    setActiveTimers((prev) => {
      const updated = [...prev, timerWithNotif];
      saveActiveTimers(updated);
      return updated;
    });
  };

  const handleRemoveTimer = async (id: string) => {
    const timer = activeTimers.find((t) => t.id === id);
    if (timer?.notificationId) {
      await cancelTimerNotification(timer.notificationId);
    }
    cancelTimerCountdownNotification(id).catch(
      (e) => console.error('[handleRemoveTimer] cancelTimerCountdownNotification failed:', e),
    );
    setActiveTimers((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveActiveTimers(updated);
      return updated;
    });
  };

  const handleTogglePause = async (id: string) => {
    const timer = activeTimers.find((t) => t.id === id);
    if (!timer) return;
    if (timer.isRunning) {
      if (timer.notificationId) {
        await cancelTimerNotification(timer.notificationId);
      }
      await cancelTimerCountdownNotification(timer.id).catch(
        (e) => console.error('[handleTogglePause] cancelTimerCountdownNotification failed:', e),
      );
      setActiveTimers((prev) => {
        const updated = prev.map((t) =>
          t.id === id ? { ...t, isRunning: false, notificationId: undefined } : t,
        );
        saveActiveTimers(updated);
        return updated;
      });
    } else {
      const elapsed = timer.totalSeconds - timer.remainingSeconds;
      const newStartedAt = new Date(Date.now() - elapsed * 1000).toISOString();
      if (timer.remainingSeconds > 0) {
        const ts = Date.now() + timer.remainingSeconds * 1000;
        let rSoundUri: string | undefined;
        let rSoundName: string | undefined;
        try {
          const defaultSound = await getDefaultTimerSound();
          if (defaultSound.uri) {
            rSoundUri = defaultSound.uri;
            rSoundName = defaultSound.name || 'Custom';
          }
        } catch (err) {
          console.error('[handleTogglePause] getDefaultTimerSound failed:', err);
        }
        try {
          const notifId = await scheduleTimerNotification(
            timer.label, timer.icon, ts, timer.id, rSoundUri, rSoundName, timer.soundId,
          );
          setActiveTimers((prev) => {
            const updated = prev.map((t) =>
              t.id === id
                ? { ...t, isRunning: true, startedAt: newStartedAt, notificationId: notifId }
                : t,
            );
            saveActiveTimers(updated);
            return updated;
          });
          showTimerCountdownNotification(timer.label, timer.icon, ts, timer.id).catch(
            (e) => console.error('[handleTogglePause] showTimerCountdownNotification failed:', e),
          );
        } catch (error) {
          console.error('[handleTogglePause] scheduleTimerNotification failed:', error);
          Alert.alert('Resume Failed', 'Could not schedule the timer notification. The timer remains paused.');
        }
      } else {
        setActiveTimers((prev) => {
          const updated = prev.map((t) =>
            t.id === id ? { ...t, isRunning: true, startedAt: newStartedAt } : t,
          );
          saveActiveTimers(updated);
          return updated;
        });
      }
    }
  };

  // Split presets into recent, rest, and custom
  const { recentPresets, restPresets, customPreset, pinnedPresets } = useMemo(() => {
    const custom = presets.find((p) => p.id === 'custom') || null;
    const nonCustom = presets.filter((p) => p.id !== 'custom');
    const recentSet = new Set(recentIds);
    const pinnedSet = new Set(pinnedIds);

    const pinned = nonCustom.filter((p) => pinnedSet.has(p.id));

    const recent: TimerPreset[] = [];
    for (const id of recentIds) {
      const preset = nonCustom.find((p) => p.id === id);
      if (preset && recent.length < 3) recent.push(preset);
    }

    const rest = nonCustom;

    return { recentPresets: recent, restPresets: rest, customPreset: custom, pinnedPresets: pinned };
  }, [presets, recentIds, pinnedIds]);

  const handleStartTimer = async (preset: TimerPreset, timerSoundId?: string) => {
    hapticLight();
    const duration = preset.customSeconds || preset.seconds;
    if (duration <= 0) {
      if (preset.id === 'custom') {
        setIsCreatingNew(true);
        setCustomHours(0);
        setCustomMinutes(0);
        setCustomSeconds(0);
        setSoundMode('sound');
        setNewTimerName('');
        setNewTimerIcon('\u{1F60A}');
        setCustomModal(preset);
        return;
      }
      handleLongPress(preset);
      return;
    }
    await recordPresetUsage(preset.id);
    refreshWidgets();
    setRecentIds((prev) => {
      const filtered = prev.filter((id) => id !== preset.id);
      return [preset.id, ...filtered].slice(0, 20);
    });
    const timer: ActiveTimer = {
      id: uuidv4(),
      presetId: preset.id,
      label: preset.label,
      icon: preset.icon,
      totalSeconds: duration,
      remainingSeconds: duration,
      startedAt: new Date().toISOString(),
      isRunning: true,
      soundId: timerSoundId,
    };
    try {
      await handleAddTimer(timer);
    } catch (error) {
      console.error('[handleStartTimer] handleAddTimer failed:', error);
    }
  };

  const handleLongPress = (preset: TimerPreset) => {
    if (preset.id === 'custom') {
      setIsCreatingNew(true);
      setNewTimerName('');
      setNewTimerIcon('\u{1F60A}');
      setCustomHours(0);
      setCustomMinutes(0);
      setCustomSeconds(0);
      setSoundMode('sound');
      setCustomModal(preset);
      return;
    }
    const total = preset.customSeconds || preset.seconds;
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    setCustomHours(hours);
    setCustomMinutes(mins);
    setCustomSeconds(secs);
    setSoundMode('sound');
    setCustomModal(preset);
  };

  const handlePinToggle = async (preset: TimerPreset) => {
    const currentlyPinned = isPinned(preset.id, pinnedIds);
    if (!currentlyPinned && pinnedIds.length >= 3) {
      ToastAndroid.show('Widget full \u2014 unpin one first', ToastAndroid.SHORT);
      return;
    }
    const updated = await togglePinPreset(preset.id);
    setPinnedIds(updated);
    refreshWidgets();
    ToastAndroid.show(
      isPinned(preset.id, updated) ? 'Pinned to widget' : 'Unpinned from widget',
      ToastAndroid.SHORT,
    );
  };

  const handleSaveCustom = async () => {
    if (!customModal) return;
    const hours = Math.min(customHours, 23);
    const mins = Math.min(customMinutes, 59);
    const secs = Math.min(customSeconds, 59);
    const totalSeconds = hours * 3600 + mins * 60 + secs;
    if (totalSeconds <= 0) {
      setCustomModal(null);
      return;
    }
    await saveCustomDuration(customModal.id, totalSeconds);
    const updatedPreset = { ...customModal, customSeconds: totalSeconds };
    setPresets((prev) =>
      prev.map((p) =>
        p.id === customModal.id ? { ...p, customSeconds: totalSeconds } : p
      )
    );
    const timerSoundId = soundMode === 'vibrate' ? 'silent' : soundMode === 'silent' ? 'true_silent' : undefined;
    setCustomModal(null);
    await handleStartTimer(updatedPreset, timerSoundId);
  };

  const closeModal = () => {
    setCustomModal(null);
    setIsCreatingNew(false);
    setEditingUserTimer(null);
    setNewTimerName('');
    setNewTimerIcon('\u{1F60A}');
  };

  const handleTimerSoundSelect = async (sound: SystemSound | null) => {
    hapticLight();
    if (sound) {
      setTimerSoundName(sound.title);
      setTimerSoundID(sound.soundID);
      await saveDefaultTimerSound({ name: sound.title, soundID: sound.soundID, uri: sound.url });
    } else {
      setTimerSoundName(null);
      setTimerSoundID(null);
      await saveDefaultTimerSound({ name: null, soundID: null, uri: null });
    }
    setTimerSoundPickerVisible(false);
  };

  const handleSaveNewTimer = async () => {
    const hours = Math.min(customHours, 23);
    const mins = Math.min(customMinutes, 59);
    const secs = Math.min(customSeconds, 59);
    const totalSeconds = hours * 3600 + mins * 60 + secs;

    if (!newTimerName.trim()) {
      ToastAndroid.show('Give your timer a name', ToastAndroid.SHORT);
      return;
    }
    if (totalSeconds <= 0) {
      closeModal();
      return;
    }

    const timerSoundId = soundMode === 'vibrate' ? 'silent' : soundMode === 'silent' ? 'true_silent' : undefined;

    const ut: UserTimer = {
      id: uuidv4(),
      icon: newTimerIcon || '\u{23F1}\u{FE0F}',
      label: newTimerName.trim(),
      seconds: totalSeconds,
      createdAt: new Date().toISOString(),
      soundId: timerSoundId,
    };

    await saveUserTimer(ut);
    setUserTimers((prev) => [ut, ...prev]);

    const activeTimer: ActiveTimer = {
      id: uuidv4(),
      presetId: ut.id,
      label: ut.label,
      icon: ut.icon,
      totalSeconds,
      remainingSeconds: totalSeconds,
      startedAt: new Date().toISOString(),
      isRunning: true,
      soundId: timerSoundId,
    };

    closeModal();
    try {
      await handleAddTimer(activeTimer);
    } catch (error) {
      console.error('[handleSaveNewTimer] handleAddTimer failed:', error);
    }
  };

  const handleSaveEditTimer = async () => {
    if (!editingUserTimer) return;
    const hours = Math.min(customHours, 23);
    const mins = Math.min(customMinutes, 59);
    const secs = Math.min(customSeconds, 59);
    const totalSeconds = hours * 3600 + mins * 60 + secs;

    if (!newTimerName.trim()) {
      ToastAndroid.show('Give your timer a name', ToastAndroid.SHORT);
      return;
    }
    if (totalSeconds <= 0) {
      closeModal();
      return;
    }

    const timerSoundId = soundMode === 'vibrate' ? 'silent' : soundMode === 'silent' ? 'true_silent' : undefined;
    const updatedLabel = newTimerName.trim();
    const updatedIcon = newTimerIcon || '\u{23F1}\u{FE0F}';

    await updateUserTimer(editingUserTimer.id, { seconds: totalSeconds, soundId: timerSoundId, label: updatedLabel, icon: updatedIcon });
    setUserTimers((prev) =>
      prev.map((t) =>
        t.id === editingUserTimer.id ? { ...t, seconds: totalSeconds, soundId: timerSoundId, label: updatedLabel, icon: updatedIcon } : t
      )
    );

    const activeTimer: ActiveTimer = {
      id: uuidv4(),
      presetId: editingUserTimer.id,
      label: updatedLabel,
      icon: updatedIcon,
      totalSeconds,
      remainingSeconds: totalSeconds,
      startedAt: new Date().toISOString(),
      isRunning: true,
      soundId: timerSoundId,
    };

    closeModal();
    try {
      await handleAddTimer(activeTimer);
    } catch (error) {
      console.error('[handleSaveEditTimer] handleAddTimer failed:', error);
    }
  };

  const handleStartUserTimer = async (ut: UserTimer) => {
    hapticLight();
    const activeTimer: ActiveTimer = {
      id: uuidv4(),
      presetId: ut.id,
      label: ut.label,
      icon: ut.icon,
      totalSeconds: ut.seconds,
      remainingSeconds: ut.seconds,
      startedAt: new Date().toISOString(),
      isRunning: true,
      soundId: ut.soundId,
    };
    try {
      await handleAddTimer(activeTimer);
    } catch (error) {
      console.error('[handleStartUserTimer] handleAddTimer failed:', error);
    }
  };

  const handleUserTimerLongPress = (ut: UserTimer) => {
    hapticLight();
    Alert.alert(ut.icon + ' ' + ut.label, undefined, [
      {
        text: 'Edit',
        onPress: () => {
          const hours = Math.floor(ut.seconds / 3600);
          const mins = Math.floor((ut.seconds % 3600) / 60);
          const secs = ut.seconds % 60;
          setCustomHours(hours);
          setCustomMinutes(mins);
          setCustomSeconds(secs);
          setNewTimerName(ut.label);
          setNewTimerIcon(ut.icon);
          setSoundMode(
            ut.soundId === 'silent' ? 'vibrate' : ut.soundId === 'true_silent' ? 'silent' : 'sound'
          );
          setEditingUserTimer(ut);
          setCustomModal({ id: ut.id, icon: ut.icon, label: ut.label, seconds: ut.seconds });
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete ' + ut.label + '?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                hapticHeavy();
                await deleteUserTimer(ut.id);
                await unpinPreset(ut.id);
                setUserTimers((prev) => prev.filter((t) => t.id !== ut.id));
                setPinnedIds((prev) => prev.filter((id) => id !== ut.id));
                refreshWidgets().catch(() => {});
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleModalSave = () => {
    if (isCreatingNew) return handleSaveNewTimer();
    if (editingUserTimer) return handleSaveEditTimer();
    return handleSaveCustom();
  };

  const renderPresetCard = (preset: TimerPreset, openModal?: boolean) => (
    <TouchableOpacity
      key={preset.id}
      style={styles.presetCard}
      onPress={() => openModal ? handleLongPress(preset) : handleStartTimer(preset)}
      activeOpacity={0.7}
    >
      <Text style={styles.presetIcon}>{preset.icon}</Text>
      <Text style={styles.presetLabel}>{preset.label}</Text>
      <Text style={styles.presetDuration}>
        {preset.id === 'custom' ? 'Custom' : openModal ? 'Set' : formatDuration(preset.customSeconds || preset.seconds)}
      </Text>
    </TouchableOpacity>
  );

  const modalPresetPinned = customModal ? isPinned(customModal.id, pinnedIds) : false;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bgUri ? (
          <>
            <Image source={{ uri: bgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBgUri(null)} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${bgOpacity})` }]} />
          </>
        ) : (
          <Image
            source={require('../../assets/fullscreenicon.png')}
            style={{ width: '100%', height: '100%', opacity: 0.07 }}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <HomeButton />
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* Active Timers */}
      {activeTimers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Active Timers</Text>
          {activeTimers.map((timer) => (
            <View key={timer.id} style={styles.activeCard}>
              <View style={styles.activeLeft}>
                <Text style={styles.activeIcon}>{timer.icon}</Text>
                <Text style={styles.activeLabel}>{timer.label}</Text>
              </View>
              <View style={styles.activeRight}>
                <Text
                  style={[
                    styles.activeCountdown,
                    timer.remainingSeconds <= 0 && styles.activeDone,
                  ]}
                >
                  {timer.remainingSeconds <= 0
                    ? '\u23F0 Done!'
                    : formatCountdown(timer.remainingSeconds)}
                </Text>
                <View style={styles.activeActions}>
                  {timer.remainingSeconds > 0 && (
                    <TouchableOpacity
                      onPress={() => { hapticLight(); handleTogglePause(timer.id); }}
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionBtnText}>
                        {timer.isRunning ? '\u23F8\uFE0F' : '\u25B6\uFE0F'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => { hapticHeavy(); handleRemoveTimer(timer.id); }}
                    style={styles.cancelBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>{'\u2715'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* My Timers */}
      {(userTimers.length > 0 || pinnedPresets.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.subsectionLabel}>My Timers</Text>
          <View style={styles.presetGrid}>
            {userTimers.map((ut) => (
              <TouchableOpacity
                key={ut.id}
                style={styles.presetCard}
                onPress={() => handleStartUserTimer(ut)}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  onPress={() => { hapticLight(); handleUserTimerLongPress(ut); }}
                  style={styles.cardEditBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.cardEditBtnText}>{'\u270F\uFE0F'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { hapticLight(); handlePinToggle({ id: ut.id, icon: ut.icon, label: ut.label, seconds: ut.seconds }); }}
                  style={styles.cardPinBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.cardPinBtnText, !isPinned(ut.id, pinnedIds) && { opacity: 0.3 }]}>{'\u{1F4CC}'}</Text>
                </TouchableOpacity>
                <Text style={styles.presetIcon}>{ut.icon}</Text>
                <Text style={styles.presetLabel}>{ut.label}</Text>
                <Text style={styles.presetDuration}>
                  {formatDuration(ut.seconds)}
                </Text>
              </TouchableOpacity>
            ))}
            {pinnedPresets.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.presetCard}
                onPress={() => handleStartTimer(p)}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  onPress={() => { hapticLight(); handleLongPress(p); }}
                  style={styles.cardEditBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.cardEditBtnText}>{'\u270F\uFE0F'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { hapticLight(); handlePinToggle(p); }}
                  style={styles.cardPinBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.cardPinBtnText}>{'\u{1F4CC}'}</Text>
                </TouchableOpacity>
                <Text style={styles.presetIcon}>{p.icon}</Text>
                <Text style={styles.presetLabel}>{p.label}</Text>
                <Text style={styles.presetDuration}>
                  {formatDuration(p.customSeconds || p.seconds)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Recent Presets */}
      {recentPresets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subsectionLabel}>Recent</Text>
          <View style={styles.presetGrid}>
            {recentPresets.map((p) => renderPresetCard(p))}
          </View>
        </View>
      )}

      {/* All Timers */}
      <View style={styles.section}>
        <Text style={styles.subsectionLabel}>
          {recentPresets.length > 0 ? 'All Timers' : 'Quick Start'}
        </Text>
        <View style={styles.presetGrid}>
          {customPreset && renderPresetCard(customPreset, true)}
          {restPresets.map((p) => renderPresetCard(p, true))}
        </View>
      </View>

      {/* Default Timer Sound */}
      <View style={{ paddingHorizontal: 0, marginTop: 16, marginBottom: 24 }}>
        <TouchableOpacity
          onPress={() => { hapticLight(); setTimerSoundPickerVisible(true); }}
          activeOpacity={0.7}
          style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.accent, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ fontSize: 14, color: colors.accent }}>Timer Sound</Text>
          <Text style={{ fontSize: 13, color: colors.textTertiary }}>{timerSoundName || 'Default'} <Text style={{ color: colors.accent }}>{'\u203A'}</Text></Text>
        </TouchableOpacity>
      </View>

      {/* Custom Duration / New Timer / Edit Timer Modal */}
      <Modal transparent visible={!!customModal} animationType="fade" onRequestClose={() => { hapticLight(); setCustomModal(null); setIsCreatingNew(false); setEditingUserTimer(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {isCreatingNew || editingUserTimer ? (
              <>
                <View style={styles.newTimerHeaderRow}>
                  <TouchableOpacity
                    style={styles.emojiCircle}
                    onPress={() => { hapticLight(); iconInputRef.current?.focus(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiCircleText}>{newTimerIcon}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.headerNameInput}
                    placeholder="Name your timer"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={30}
                    value={newTimerName}
                    onChangeText={setNewTimerName}
                    autoFocus={isCreatingNew}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setSoundMode((prev) => {
                        if (prev === 'sound') { hapticMedium(); return 'vibrate'; }
                        if (prev === 'vibrate') return 'silent';
                        hapticLight(); setTimeout(() => hapticLight(), 100); playChirp(); return 'sound';
                      });
                    }}
                    style={[
                      styles.headerSoundBtn,
                      soundMode === 'sound' && { backgroundColor: colors.accent },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.soundModeIconText}>
                      {soundMode === 'sound' ? '\u{1F514}' : soundMode === 'vibrate' ? '\u{1F4F3}' : '\u{1F507}'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.emojiHintSmall}>Tap {'\u{1F60A}'} to set icon</Text>
                <TextInput
                  ref={iconInputRef}
                  style={styles.hiddenInput}
                  autoCorrect={false}
                  onChangeText={(text) => {
                    if (text) {
                      const graphemes = [...text];
                      setNewTimerIcon(graphemes[graphemes.length - 1] || '\u{1F60A}');
                    }
                    if (iconInputRef.current) {
                      iconInputRef.current.setNativeProps({ text: '' });
                      iconInputRef.current.blur();
                    }
                  }}
                />
              </>
            ) : (
              <>
                <View style={styles.modalTitleRow}>
                  {customModal && customModal.id !== 'custom' ? (
                    <TouchableOpacity
                      onPress={() => { hapticLight(); handlePinToggle(customModal); }}
                      style={[
                        styles.modalPinBtn,
                        modalPresetPinned && { backgroundColor: colors.accent },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.modalPinText,
                        { opacity: modalPresetPinned ? 1 : 0.3 },
                      ]}>
                        {'\u{1F4CC}'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 34 }} />
                  )}
                  <Text style={styles.modalTitle}>
                    {(customModal?.icon ?? '') + ' ' + (customModal?.label ?? '')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSoundMode((prev) => {
                        if (prev === 'sound') { hapticMedium(); return 'vibrate'; }
                        if (prev === 'vibrate') return 'silent';
                        hapticLight(); setTimeout(() => hapticLight(), 100); playChirp(); return 'sound';
                      });
                    }}
                    style={[
                      styles.soundModeIconBtn,
                      soundMode === 'sound' && { backgroundColor: colors.accent },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.soundModeIconText}>
                      {soundMode === 'sound' ? '\u{1F514}' : soundMode === 'vibrate' ? '\u{1F4F3}' : '\u{1F507}'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>
                  Set custom duration
                </Text>
              </>
            )}
            {timeInputMode === 'type' ? (
              <View style={styles.modalInputRow}>
                <View style={styles.modalInputGroup}>
                  <TextInput
                    style={styles.modalInput}
                    value={String(customHours)}
                    onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setCustomHours(isNaN(n) ? 0 : Math.min(n, 23)); }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={styles.modalInputLabel}>hr</Text>
                </View>
                <View style={styles.modalInputGroup}>
                  <TextInput
                    style={styles.modalInput}
                    value={String(customMinutes)}
                    onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setCustomMinutes(isNaN(n) ? 0 : Math.min(n, 59)); }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={styles.modalInputLabel}>min</Text>
                </View>
                <View style={styles.modalInputGroup}>
                  <TextInput
                    style={styles.modalInput}
                    value={String(customSeconds)}
                    onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setCustomSeconds(isNaN(n) ? 0 : Math.min(n, 59)); }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={styles.modalInputLabel}>sec</Text>
                </View>
              </View>
            ) : (
              <TimePicker
                hours={customHours}
                minutes={customMinutes}
                seconds={customSeconds}
                onHoursChange={setCustomHours}
                onMinutesChange={setCustomMinutes}
                onSecondsChange={setCustomSeconds}
                showSeconds={true}
                maxHours={24}
                maxMinutes={60}
                maxSeconds={60}
                labels={{ hours: 'hr', minutes: 'min', seconds: 'sec' }}
              />
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => { hapticLight(); closeModal(); }}
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleModalSave}
                style={styles.modalSaveBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSaveText}>Save & Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SoundPickerModal
        visible={timerSoundPickerVisible}
        onSelect={handleTimerSoundSelect}
        onClose={() => setTimerSoundPickerVisible(false)}
        currentSoundID={timerSoundID}
      />
    </ScrollView>
    </View>
  );
}

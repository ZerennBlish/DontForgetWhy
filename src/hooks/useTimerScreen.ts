import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ToastAndroid, TextInput, Alert, AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useFocusEffect } from '@react-navigation/native';
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
import { hapticLight, hapticHeavy } from '../utils/haptics';
import type { SystemSound } from '../components/SoundPickerModal';

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Custom';
  if (seconds < 60) return `${seconds}s`;
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.floor(seconds / 60)} min`;
}

function recalculateTimers(timers: ActiveTimer[]): ActiveTimer[] {
  const now = Date.now();
  return timers.map((t) => {
    if (!t.isRunning) return t;
    const elapsed = Math.floor((now - new Date(t.startedAt).getTime()) / 1000);
    const remaining = Math.max(0, t.totalSeconds - elapsed);
    return { ...t, remainingSeconds: remaining, isRunning: remaining > 0 };
  });
}

interface UseTimerScreenResult {
  // Active timers
  activeTimers: ActiveTimer[];

  // Background
  bgUri: string | null;
  setBgUri: React.Dispatch<React.SetStateAction<string | null>>;
  bgOpacity: number;

  // Presets
  presets: TimerPreset[];
  recentPresets: TimerPreset[];
  restPresets: TimerPreset[];
  customPreset: TimerPreset | null;
  pinnedPresets: TimerPreset[];
  pinnedIds: string[];

  // User timers
  userTimers: UserTimer[];

  // Modal state
  customModal: TimerPreset | null;
  setCustomModal: React.Dispatch<React.SetStateAction<TimerPreset | null>>;
  customHours: number;
  setCustomHours: React.Dispatch<React.SetStateAction<number>>;
  customMinutes: number;
  setCustomMinutes: React.Dispatch<React.SetStateAction<number>>;
  customSeconds: number;
  setCustomSeconds: React.Dispatch<React.SetStateAction<number>>;
  soundMode: 'sound' | 'vibrate' | 'silent';
  setSoundMode: React.Dispatch<React.SetStateAction<'sound' | 'vibrate' | 'silent'>>;
  isCreatingNew: boolean;
  newTimerName: string;
  setNewTimerName: React.Dispatch<React.SetStateAction<string>>;
  newTimerIcon: string;
  setNewTimerIcon: React.Dispatch<React.SetStateAction<string>>;
  editingUserTimer: UserTimer | null;
  timeInputMode: 'scroll' | 'type';
  iconInputRef: React.RefObject<TextInput | null>;

  // Sound picker
  timerSoundName: string | null;
  timerSoundID: number | null;
  timerSoundPickerVisible: boolean;
  setTimerSoundPickerVisible: React.Dispatch<React.SetStateAction<boolean>>;

  // Callbacks
  handleStartTimer: (preset: TimerPreset, timerSoundId?: string) => Promise<void>;
  handleLongPress: (preset: TimerPreset) => void;
  handleRemoveTimer: (id: string) => Promise<void>;
  handleTogglePause: (id: string) => Promise<void>;
  handlePinToggle: (preset: TimerPreset) => Promise<void>;
  handleStartUserTimer: (ut: UserTimer) => Promise<void>;
  handleUserTimerLongPress: (ut: UserTimer) => void;
  handleModalSave: () => Promise<void> | void;
  handleModalSaveOnly: () => Promise<void> | void;
  handleTimerSoundSelect: (sound: SystemSound | null) => Promise<void>;
  closeModal: () => void;
}

export function useTimerScreen(): UseTimerScreenResult {
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
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

  const handleSaveCustomOnly = async () => {
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
    setPresets((prev) =>
      prev.map((p) =>
        p.id === customModal.id ? { ...p, customSeconds: totalSeconds } : p
      )
    );
    setCustomModal(null);
    ToastAndroid.show('Saved', ToastAndroid.SHORT);
  };

  const handleSaveNewTimerOnly = async () => {
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
    closeModal();
    ToastAndroid.show('Timer saved', ToastAndroid.SHORT);
  };

  const handleSaveEditTimerOnly = async () => {
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
    closeModal();
    ToastAndroid.show('Timer updated', ToastAndroid.SHORT);
  };

  const handleModalSaveOnly = () => {
    if (isCreatingNew) return handleSaveNewTimerOnly();
    if (editingUserTimer) return handleSaveEditTimerOnly();
    return handleSaveCustomOnly();
  };

  return {
    // Active timers
    activeTimers,

    // Background
    bgUri,
    setBgUri,
    bgOpacity,

    // Presets
    presets,
    recentPresets,
    restPresets,
    customPreset,
    pinnedPresets,
    pinnedIds,

    // User timers
    userTimers,

    // Modal state
    customModal,
    setCustomModal,
    customHours,
    setCustomHours,
    customMinutes,
    setCustomMinutes,
    customSeconds,
    setCustomSeconds,
    soundMode,
    setSoundMode,
    isCreatingNew,
    newTimerName,
    setNewTimerName,
    newTimerIcon,
    setNewTimerIcon,
    editingUserTimer,
    timeInputMode,
    iconInputRef,

    // Sound picker
    timerSoundName,
    timerSoundID,
    timerSoundPickerVisible,
    setTimerSoundPickerVisible,

    // Callbacks
    handleStartTimer,
    handleLongPress,
    handleRemoveTimer,
    handleTogglePause,
    handlePinToggle,
    handleStartUserTimer,
    handleUserTimerLongPress,
    handleModalSave,
    handleModalSaveOnly,
    handleTimerSoundSelect,
    closeModal,
  };
}

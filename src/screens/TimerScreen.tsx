import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import type { TimerPreset, ActiveTimer } from '../types/timer';
import {
  loadPresets,
  saveCustomDuration,
  recordPresetUsage,
  loadRecentPresetIds,
} from '../services/timerStorage';
import { refreshTimerWidget } from '../widget/updateWidget';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PRESET_CARD_WIDTH = (SCREEN_WIDTH - 32 - 16) / 3;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
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

interface TimerScreenProps {
  activeTimers: ActiveTimer[];
  onAddTimer: (timer: ActiveTimer) => void | Promise<void>;
  onRemoveTimer: (id: string) => void;
  onTogglePause: (id: string) => void;
}

export default function TimerScreen({
  activeTimers,
  onAddTimer,
  onRemoveTimer,
  onTogglePause,
}: TimerScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [presets, setPresets] = useState<TimerPreset[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [customModal, setCustomModal] = useState<TimerPreset | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');

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
      backgroundColor: colors.card,
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
      width: PRESET_CARD_WIDTH,
      backgroundColor: colors.card,
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
    hint: {
      fontSize: 11,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 12,
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
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 4,
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
  }), [colors, insets.bottom]);

  useEffect(() => {
    loadPresets().then(setPresets);
    loadRecentPresetIds().then(setRecentIds);
  }, []);

  // Split presets into recent, rest, and custom
  const { recentPresets, restPresets, customPreset } = useMemo(() => {
    const custom = presets.find((p) => p.id === 'custom') || null;
    const nonCustom = presets.filter((p) => p.id !== 'custom');
    const recentSet = new Set(recentIds);

    const recent: TimerPreset[] = [];
    for (const id of recentIds) {
      const preset = nonCustom.find((p) => p.id === id);
      if (preset) recent.push(preset);
    }

    const rest = nonCustom.filter((p) => !recentSet.has(p.id));

    return { recentPresets: recent, restPresets: rest, customPreset: custom };
  }, [presets, recentIds]);

  const handleStartTimer = async (preset: TimerPreset) => {
    const duration = preset.customSeconds || preset.seconds;
    if (duration <= 0) {
      handleLongPress(preset);
      return;
    }
    await recordPresetUsage(preset.id);
    refreshTimerWidget();
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
    };
    try {
      await onAddTimer(timer);
    } catch (error) {
      console.error('[handleStartTimer] onAddTimer failed:', error);
    }
  };

  const handleLongPress = (preset: TimerPreset) => {
    const total = preset.customSeconds || preset.seconds;
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    setCustomMinutes(mins > 0 ? mins.toString() : '');
    setCustomSeconds(secs > 0 ? secs.toString() : '');
    setCustomModal(preset);
  };

  const handleSaveCustom = async () => {
    if (!customModal) return;
    const mins = parseInt(customMinutes, 10) || 0;
    const secs = Math.min(parseInt(customSeconds, 10) || 0, 59);
    const totalSeconds = mins * 60 + secs;
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
  };

  const handleSecondsChange = (t: string) => {
    const digits = t.replace(/[^0-9]/g, '');
    if (digits === '') {
      setCustomSeconds('');
      return;
    }
    const num = parseInt(digits, 10);
    if (num > 59) {
      setCustomSeconds('59');
    } else {
      setCustomSeconds(digits);
    }
  };

  const renderPresetCard = (preset: TimerPreset) => (
    <TouchableOpacity
      key={preset.id}
      style={styles.presetCard}
      onPress={() => handleStartTimer(preset)}
      onLongPress={() => handleLongPress(preset)}
      activeOpacity={0.7}
    >
      <Text style={styles.presetIcon}>{preset.icon}</Text>
      <Text style={styles.presetLabel}>{preset.label}</Text>
      <Text style={styles.presetDuration}>
        {formatDuration(preset.customSeconds || preset.seconds)}
      </Text>
    </TouchableOpacity>
  );

  return (
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
                      onPress={() => onTogglePause(timer.id)}
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionBtnText}>
                        {timer.isRunning ? '\u23F8\uFE0F' : '\u25B6\uFE0F'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => onRemoveTimer(timer.id)}
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

      {/* Recent Presets */}
      {recentPresets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subsectionLabel}>Recent</Text>
          <View style={styles.presetGrid}>
            {recentPresets.map(renderPresetCard)}
          </View>
        </View>
      )}

      {/* All Timers */}
      <View style={styles.section}>
        <Text style={styles.subsectionLabel}>
          {recentPresets.length > 0 ? 'All Timers' : 'Quick Start'}
        </Text>
        <View style={styles.presetGrid}>
          {restPresets.map(renderPresetCard)}
          {customPreset && renderPresetCard(customPreset)}
        </View>
        <Text style={styles.hint}>Long-press a preset to set a custom duration</Text>
      </View>

      {/* Custom Duration Modal */}
      <Modal transparent visible={!!customModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {customModal?.icon} {customModal?.label}
            </Text>
            <Text style={styles.modalSubtitle}>
              Set custom duration
            </Text>
            <View style={styles.modalInputRow}>
              <View style={styles.modalInputGroup}>
                <TextInput
                  style={styles.modalInput}
                  value={customMinutes}
                  onChangeText={(t) => setCustomMinutes(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  maxLength={4}
                />
                <Text style={styles.modalInputLabel}>min</Text>
              </View>
              <View style={styles.modalInputGroup}>
                <TextInput
                  style={styles.modalInput}
                  value={customSeconds}
                  onChangeText={handleSecondsChange}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={2}
                />
                <Text style={styles.modalInputLabel}>sec</Text>
              </View>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setCustomModal(null)}
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCustom}
                style={styles.modalSaveBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

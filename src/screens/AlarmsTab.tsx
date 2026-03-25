import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
} from 'react-native';
import { Alarm } from '../types/alarm';
import { loadAlarms, deleteAlarm, toggleAlarm, restoreAlarm, permanentlyDeleteAlarm } from '../services/storage';
import { isAlarmPinned, togglePinAlarm, unpinAlarm } from '../services/widgetPins';
import { refreshWidgets } from '../widget/updateWidget';
import AlarmCard from '../components/AlarmCard';
import UndoToast from '../components/UndoToast';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight, hapticHeavy } from '../utils/haptics';
import { formatTime } from '../utils/time';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuessWhyStats } from '../services/guessWhyStats';

function formatDeletedAgo(deletedAt: string): string {
  const ms = Date.now() - new Date(deletedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return 'Deleted today';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 1) return 'Deleted yesterday';
  if (days < 30) return `Deleted ${days} days ago`;
  return `Deleted ${Math.floor(days / 30)}mo ago`;
}

interface AlarmsTabProps {
  alarms: Alarm[];
  setAlarms: React.Dispatch<React.SetStateAction<Alarm[]>>;
  timeFormat: '12h' | '24h';
  navigation: any;
  pinnedAlarmIds: string[];
  setPinnedAlarmIds: React.Dispatch<React.SetStateAction<string[]>>;
  appQuote: string;
  stats: GuessWhyStats | null;
}

export default function AlarmsTab({
  alarms,
  setAlarms,
  timeFormat,
  navigation,
  pinnedAlarmIds,
  setPinnedAlarmIds,
  appQuote,
}: AlarmsTabProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [alarmSort, setAlarmSort] = useState<'time' | 'created' | 'name'>('time');
  const [alarmFilter, setAlarmFilter] = useState<'all' | 'active' | 'one-time' | 'recurring' | 'deleted'>('all');
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [deletedAlarm, setDeletedAlarm] = useState<Alarm | null>(null);
  const [deletedAlarmPinned, setDeletedAlarmPinned] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoKey, setUndoKey] = useState(0);

  const hasNonDefaultSortFilter = alarmSort !== 'time' || alarmFilter !== 'all';

  const filteredAlarms = useMemo(() => {
    let list = alarms;

    if (alarmFilter === 'deleted') {
      list = list.filter((a) => !!a.deletedAt);
      list = [...list].sort((a, b) =>
        new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
      );
      return list;
    }

    // Exclude deleted for all non-deleted filters
    list = list.filter((a) => !a.deletedAt);
    if (alarmFilter === 'active') list = list.filter((a) => a.enabled);
    else if (alarmFilter === 'one-time') list = list.filter((a) => a.mode === 'one-time');
    else if (alarmFilter === 'recurring') list = list.filter((a) => a.mode === 'recurring');

    if (alarmSort === 'time') {
      list = [...list].sort((a, b) => a.time.localeCompare(b.time));
    } else if (alarmSort === 'name') {
      list = [...list].sort((a, b) => {
        const aName = (a.nickname || a.note || '').toLowerCase();
        const bName = (b.nickname || b.note || '').toLowerCase();
        return aName.localeCompare(bName);
      });
    } else {
      list = [...list].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return list;
  }, [alarms, alarmSort, alarmFilter]);

  const nonDeletedAlarmCount = alarms.filter(a => !a.deletedAt).length;

  const handleToggle = async (id: string) => {
    const updated = await toggleAlarm(id);
    setAlarms(updated);
    refreshWidgets();
  };

  const handleDelete = async (id: string) => {
    hapticHeavy();
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;
    const wasPinned = isAlarmPinned(id, pinnedAlarmIds);
    setDeletedAlarm(alarm);
    setDeletedAlarmPinned(wasPinned);
    await unpinAlarm(id);
    const updated = await deleteAlarm(id);
    setAlarms(updated);
    setPinnedAlarmIds((prev) => prev.filter((pid) => pid !== id));
    refreshWidgets();
    setUndoKey((k) => k + 1);
    setShowUndo(true);
  };

  const handleUndoDelete = async () => {
    setShowUndo(false);
    if (!deletedAlarm) return;
    const updated = await restoreAlarm(deletedAlarm.id);
    setAlarms(updated);
    if (deletedAlarmPinned) {
      const pins = await togglePinAlarm(deletedAlarm.id);
      setPinnedAlarmIds(pins);
    }
    refreshWidgets();
    setDeletedAlarm(null);
  };

  const handleUndoDismiss = () => {
    setShowUndo(false);
    setDeletedAlarm(null);
  };

  const handleRestore = async (id: string) => {
    const updated = await restoreAlarm(id);
    setAlarms(updated);
    refreshWidgets();
  };

  const handlePermanentDelete = async (id: string) => {
    const updated = await permanentlyDeleteAlarm(id);
    setAlarms(updated);
  };

  const handleEdit = (alarm: Alarm) => {
    navigation.navigate('CreateAlarm', { alarm });
  };

  const handleTogglePin = async (id: string) => {
    const currentlyPinned = isAlarmPinned(id, pinnedAlarmIds);
    if (!currentlyPinned && pinnedAlarmIds.length >= 3) {
      ToastAndroid.show('Widget full \u2014 unpin one first', ToastAndroid.SHORT);
      return;
    }
    const updated = await togglePinAlarm(id);
    setPinnedAlarmIds(updated);
    refreshWidgets();
    ToastAndroid.show(
      isAlarmPinned(id, updated) ? 'Pinned to widget' : 'Unpinned from widget',
      ToastAndroid.SHORT,
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    quoteText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
      opacity: 0.7,
      textAlign: 'center',
      paddingHorizontal: 20,
      marginBottom: 4,
    },
    sortFilterToggleRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 2,
    },
    sortFilterToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
    },
    sortFilterToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    sortFilterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 100 + insets.bottom,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 80 + insets.bottom,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 6,
    },
    fab: {
      position: 'absolute',
      bottom: 36 + insets.bottom,
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    fabText: {
      fontSize: 32,
      color: colors.textPrimary,
      fontWeight: '300',
      marginTop: -2,
    },
    sortFilterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 6,
      gap: 6,
      flexWrap: 'wrap',
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    pillTextActive: {
      color: colors.textPrimary,
    },
    sortFilterLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 2,
    },
    deletedCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      opacity: 0.7,
    },
    deletedLeft: {
      flex: 1,
      marginRight: 12,
    },
    deletedTime: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textTertiary,
      letterSpacing: -1,
    },
    deletedDetail: {
      fontSize: 14,
      color: colors.textTertiary,
      marginTop: 4,
    },
    deletedAgo: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    deletedRight: {
      gap: 8,
    },
    restoreBtn: {
      backgroundColor: colors.activeBackground,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    restoreText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    foreverBtn: {
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    foreverText: {
      color: colors.red,
      fontSize: 13,
      fontWeight: '600',
    },
  }), [colors, insets.bottom]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.sortFilterToggleRow}>
        <TouchableOpacity
          style={styles.sortFilterToggleBtn}
          onPress={() => {
            hapticLight();
            setShowSortFilter((prev) => {
              if (prev) { setAlarmFilter('all'); }
              return !prev;
            });
          }}
          activeOpacity={0.7}
        >
          {hasNonDefaultSortFilter && <View style={styles.sortFilterDot} />}
          <Text style={styles.sortFilterToggleText}>
            Sort & Filter {showSortFilter ? '\u25B4' : '\u25BE'}
          </Text>
        </TouchableOpacity>
      </View>

      {showSortFilter && (
        <>
          <Text style={styles.sortFilterLabel}>Sort</Text>
          <View style={styles.sortFilterRow}>
            {(['time', 'created', 'name'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pill, alarmSort === s && styles.pillActive]}
                onPress={() => { hapticLight(); setAlarmSort(s); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, alarmSort === s && styles.pillTextActive]}>
                  {s === 'time' ? 'Time' : s === 'created' ? 'Created' : 'Name'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sortFilterLabel}>Filter</Text>
          <View style={styles.sortFilterRow}>
            {(['all', 'active', 'one-time', 'recurring', 'deleted'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, alarmFilter === f && styles.pillActive]}
                onPress={() => { hapticLight(); setAlarmFilter(f); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, alarmFilter === f && styles.pillTextActive]}>
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'one-time' ? 'One-time' : f === 'recurring' ? 'Recurring' : 'Deleted'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {filteredAlarms.length === 0 ? (
        <View style={styles.empty}>
          {nonDeletedAlarmCount === 0 && (
            <Text style={styles.quoteText} numberOfLines={2}>
              {appQuote}
            </Text>
          )}
          <Text style={styles.emptyText}>
            {nonDeletedAlarmCount === 0
              ? 'No alarms yet' : 'No matches'}
          </Text>
          <Text style={styles.emptySubtext}>
            {nonDeletedAlarmCount === 0
              ? 'Tap + to set one and immediately forget why.' : 'Try a different filter.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAlarms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.deletedAt) {
              return (
                <View style={styles.deletedCard}>
                  <View style={styles.deletedLeft}>
                    <Text style={styles.deletedTime}>
                      {formatTime(item.time, timeFormat)}
                    </Text>
                    <Text style={styles.deletedDetail} numberOfLines={1}>
                      {item.private ? 'Alarm' : `${item.icon || '\u23F0'} ${item.nickname || item.note || 'Alarm'}`}
                    </Text>
                    <Text style={styles.deletedAgo}>
                      {formatDeletedAgo(item.deletedAt)}
                    </Text>
                  </View>
                  <View style={styles.deletedRight}>
                    <TouchableOpacity onPress={() => { hapticLight(); handleRestore(item.id); }} style={styles.restoreBtn} activeOpacity={0.7}>
                      <Text style={styles.restoreText}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { hapticHeavy(); handlePermanentDelete(item.id); }} style={styles.foreverBtn} activeOpacity={0.7}>
                      <Text style={styles.foreverText}>Forever</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }
            return (
                <AlarmCard
                  alarm={item}
                  timeFormat={timeFormat}
                  isPinned={isAlarmPinned(item.id, pinnedAlarmIds)}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { hapticLight(); navigation.navigate('CreateAlarm'); }}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <UndoToast
        key={undoKey}
        visible={showUndo}
        message="Alarm deleted"
        onUndo={handleUndoDelete}
        onDismiss={handleUndoDismiss}
      />
    </View>
  );
}

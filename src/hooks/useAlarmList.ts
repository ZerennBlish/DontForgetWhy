import { useState, useCallback, useMemo } from 'react';
import { ToastAndroid } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Alarm } from '../types/alarm';
import { loadAlarms, deleteAlarm, toggleAlarm, restoreAlarm, permanentlyDeleteAlarm } from '../services/storage';
import { loadSettings } from '../services/settings';
import { loadStats, GuessWhyStats } from '../services/guessWhyStats';
import { pruneAlarmPins, isAlarmPinned, togglePinAlarm, unpinAlarm } from '../services/widgetPins';
import { refreshWidgets } from '../widget/updateWidget';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { getRandomAppOpenQuote } from '../data/appOpenQuotes';
import { hapticHeavy } from '../utils/haptics';

interface UseAlarmListReturn {
  alarms: Alarm[];
  timeFormat: '12h' | '24h';
  stats: GuessWhyStats | null;
  pinnedAlarmIds: string[];
  bgUri: string | null;
  bgOpacity: number;
  setBgUri: React.Dispatch<React.SetStateAction<string | null>>;
  appQuote: string;
  alarmSort: 'time' | 'created' | 'name';
  alarmFilter: 'all' | 'active' | 'one-time' | 'recurring' | 'deleted';
  showSortFilter: boolean;
  showUndo: boolean;
  undoKey: number;
  filteredAlarms: Alarm[];
  nonDeletedAlarmCount: number;
  hasPlayed: boolean;
  hasNonDefaultSortFilter: boolean;

  setAlarmSort: (s: 'time' | 'created' | 'name') => void;
  setAlarmFilter: (f: 'all' | 'active' | 'one-time' | 'recurring' | 'deleted') => void;
  setShowSortFilter: React.Dispatch<React.SetStateAction<boolean>>;

  handleToggle: (id: string) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleUndoDelete: () => Promise<void>;
  handleUndoDismiss: () => void;
  handleRestore: (id: string) => Promise<void>;
  handlePermanentDelete: (id: string) => Promise<void>;
  handleTogglePin: (id: string) => Promise<void>;
}

export function useAlarmList(): UseAlarmListReturn {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [stats, setStats] = useState<GuessWhyStats | null>(null);
  const [pinnedAlarmIds, setPinnedAlarmIds] = useState<string[]>([]);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);

  const [appQuote] = useState(getRandomAppOpenQuote);
  const [alarmSort, setAlarmSort] = useState<'time' | 'created' | 'name'>('time');
  const [alarmFilter, setAlarmFilter] = useState<'all' | 'active' | 'one-time' | 'recurring' | 'deleted'>('all');
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [deletedAlarm, setDeletedAlarm] = useState<Alarm | null>(null);
  const [deletedAlarmPinned, setDeletedAlarmPinned] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoKey, setUndoKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadAlarms(true).then((loaded) => {
        setAlarms(loaded);
        pruneAlarmPins(loaded.filter((a) => !a.deletedAt).map((a) => a.id)).then(setPinnedAlarmIds);
      });
      loadSettings().then((s) => setTimeFormat(s.timeFormat));
      loadStats().then(setStats);
      loadBackground().then(setBgUri);
      getOverlayOpacity().then(setBgOpacity);
    }, [])
  );

  const hasPlayed = !!(stats && (stats.wins > 0 || stats.losses > 0 || stats.skips > 0));
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

  const handleToggle = useCallback(async (id: string) => {
    const updated = await toggleAlarm(id);
    setAlarms(updated);
    refreshWidgets();
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    hapticHeavy();
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;
    const wasPinned = isAlarmPinned(id, pinnedAlarmIds);
    setDeletedAlarm(alarm);
    setDeletedAlarmPinned(wasPinned);
    await unpinAlarm(id);
    await deleteAlarm(id);
    setAlarms(await loadAlarms(true));
    setPinnedAlarmIds((prev) => prev.filter((pid) => pid !== id));
    refreshWidgets();
    setUndoKey((k) => k + 1);
    setShowUndo(true);
  }, [alarms, pinnedAlarmIds]);

  const handleUndoDelete = useCallback(async () => {
    setShowUndo(false);
    if (!deletedAlarm) return;
    await restoreAlarm(deletedAlarm.id);
    setAlarms(await loadAlarms(true));
    if (deletedAlarmPinned) {
      const pins = await togglePinAlarm(deletedAlarm.id);
      setPinnedAlarmIds(pins);
    }
    refreshWidgets();
    setDeletedAlarm(null);
  }, [deletedAlarm, deletedAlarmPinned]);

  const handleUndoDismiss = useCallback(() => {
    setShowUndo(false);
    setDeletedAlarm(null);
  }, []);

  const handleRestore = useCallback(async (id: string) => {
    await restoreAlarm(id);
    setAlarms(await loadAlarms(true));
    refreshWidgets();
  }, []);

  const handlePermanentDelete = useCallback(async (id: string) => {
    await permanentlyDeleteAlarm(id);
    setAlarms(await loadAlarms(true));
  }, []);

  const handleTogglePin = useCallback(async (id: string) => {
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
  }, [pinnedAlarmIds]);

  return {
    alarms,
    timeFormat,
    stats,
    pinnedAlarmIds,
    bgUri,
    bgOpacity,
    setBgUri,
    appQuote,
    alarmSort,
    alarmFilter,
    showSortFilter,
    showUndo,
    undoKey,
    filteredAlarms,
    nonDeletedAlarmCount,
    hasPlayed,
    hasNonDefaultSortFilter,

    setAlarmSort,
    setAlarmFilter,
    setShowSortFilter,

    handleToggle,
    handleDelete,
    handleUndoDelete,
    handleUndoDismiss,
    handleRestore,
    handlePermanentDelete,
    handleTogglePin,
  };
}

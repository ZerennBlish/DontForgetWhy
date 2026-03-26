import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import BackButton from '../components/BackButton';
import { loadAlarms } from '../services/storage';
import { getReminders } from '../services/reminderStorage';
import { getNotes } from '../services/noteStorage';
import type { Alarm, AlarmDay } from '../types/alarm';
import type { Reminder } from '../types/reminder';
import type { Note } from '../types/note';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { formatTime } from '../utils/time';
import { loadSettings } from '../services/settings';
import { hapticLight } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Calendar'>;

type ViewMode = 'day' | 'week' | 'month';
type FilterType = 'all' | 'alarms' | 'reminders' | 'notes';

type DayItem =
  | { type: 'alarm'; data: Alarm }
  | { type: 'reminder'; data: Reminder }
  | { type: 'note'; data: Note };

type ListRow =
  | { rowType: 'dateHeader'; dateStr: string; label: string }
  | { rowType: 'event'; item: DayItem };

interface DayDate {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
}

interface DayComponentProps {
  date?: DayDate;
  state?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marking?: any;
  onPress?: (date?: DayDate) => void;
}

const DOT_ALARM = '#FF6B6B';
const DOT_REMINDER = '#4A90D9';
const DOT_NOTE = '#55EFC4';

const WEEKDAY_MAP: Record<number, AlarmDay> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

const VIEW_MODES: ViewMode[] = ['day', 'week', 'month'];
const FILTER_TYPES: FilterType[] = ['all', 'alarms', 'reminders', 'notes'];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatGroupDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatWeekHeader(startStr: string, endStr: string): string {
  const s = new Date(startStr + 'T00:00:00');
  const e = new Date(endStr + 'T00:00:00');
  const start = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `Week of ${start} \u2013 ${end}`;
}

function formatMonthHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getWeekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.getDay(); // 0=Sun
  const start = new Date(d);
  start.setDate(d.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateString(start), end: toDateString(end) };
}

function getItemsForDate(
  dateStr: string,
  alarmList: Alarm[],
  reminderList: Reminder[],
  noteList: Note[],
): DayItem[] {
  const items: DayItem[] = [];
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = WEEKDAY_MAP[d.getDay()];

  for (const alarm of alarmList) {
    if (!alarm.enabled) continue;
    if (alarm.mode === 'one-time' && alarm.date === dateStr) {
      items.push({ type: 'alarm', data: alarm });
    } else if (alarm.mode === 'recurring') {
      if (alarm.days.length === 0 || alarm.days.includes(weekday)) {
        items.push({ type: 'alarm', data: alarm });
      }
    }
  }

  for (const reminder of reminderList) {
    if (reminder.completed) continue;
    if (reminder.recurring) {
      if (!reminder.days || reminder.days.length === 0) {
        // Daily recurring — appears every day
        items.push({ type: 'reminder', data: reminder });
      } else if (reminder.days.includes(weekday)) {
        items.push({ type: 'reminder', data: reminder });
      }
    } else if (reminder.dueDate && reminder.dueDate.slice(0, 10) === dateStr) {
      items.push({ type: 'reminder', data: reminder });
    }
  }

  for (const note of noteList) {
    const nd = new Date(note.createdAt);
    const localDate = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
    if (localDate === dateStr) {
      items.push({ type: 'note', data: note });
    }
  }

  return items;
}

function getItemSortTime(item: DayItem): string {
  if (item.type === 'alarm') return item.data.time;
  if (item.type === 'reminder') return item.data.dueTime || '\xff';
  const d = new Date(item.data.createdAt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function sortItems(items: DayItem[]): DayItem[] {
  return [...items].sort((a, b) => {
    const ta = getItemSortTime(a);
    const tb = getItemSortTime(b);
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

function applyFilter(items: DayItem[], filter: FilterType): DayItem[] {
  if (filter === 'all') return items;
  if (filter === 'alarms') return items.filter((i) => i.type === 'alarm');
  if (filter === 'reminders') return items.filter((i) => i.type === 'reminder');
  return items.filter((i) => i.type === 'note');
}

function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const d = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  while (d <= end) {
    dates.push(toDateString(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

const dayCellStyles = StyleSheet.create({
  cell: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default function CalendarScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const today = toDateString(new Date());
  const initialDate = route.params?.initialDate || today;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentMonth, setCurrentMonth] = useState(initialDate.slice(0, 7) + '-01');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    const incoming = route.params?.initialDate;
    if (incoming) {
      setSelectedDate(incoming);
      setCurrentMonth(incoming.slice(0, 7) + '-01');
    }
  }, [route.params?.initialDate]);

  useEffect(() => {
    setFilterType('all');
  }, [viewMode]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [a, r, n, s] = await Promise.all([
          loadAlarms(),
          getReminders(),
          getNotes(),
          loadSettings(),
        ]);
        setAlarms(a.filter((x) => !x.deletedAt));
        setReminders(r.filter((x) => !x.deletedAt));
        setNotes(n.filter((x) => !x.deletedAt));
        setTimeFormat(s.timeFormat);
      })();
    }, []),
  );

  // ── Marked dates for calendar dots (unchanged logic) ──
  const markedDates = useMemo(() => {
    const year = parseInt(currentMonth.slice(0, 4), 10);
    const month = parseInt(currentMonth.slice(5, 7), 10);
    const daysInMonth = getDaysInMonth(year, month);

    const marks: Record<
      string,
      { dots: { key: string; color: string }[]; selected?: boolean }
    > = {};

    const ensure = (dateStr: string) => {
      if (!marks[dateStr]) marks[dateStr] = { dots: [] };
    };
    const hasDot = (dateStr: string, key: string) =>
      marks[dateStr]?.dots.some((d) => d.key === key) ?? false;

    // One-time alarms
    for (const alarm of alarms) {
      if (alarm.mode === 'one-time' && alarm.date && alarm.enabled) {
        const ds = alarm.date;
        if (ds.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
          ensure(ds);
          if (!hasDot(ds, 'alarm')) {
            marks[ds].dots.push({ key: 'alarm', color: DOT_ALARM });
          }
        }
      }
    }

    // Recurring alarms
    for (const alarm of alarms) {
      if (alarm.mode === 'recurring' && alarm.enabled) {
        for (const day of daysInMonth) {
          const weekday = WEEKDAY_MAP[day.getDay()];
          if (alarm.days.length === 0 || alarm.days.includes(weekday)) {
            const ds = toDateString(day);
            ensure(ds);
            if (!hasDot(ds, 'alarm')) {
              marks[ds].dots.push({ key: 'alarm', color: DOT_ALARM });
            }
          }
        }
      }
    }

    // Reminders
    for (const reminder of reminders) {
      if (reminder.completed) continue;

      if (reminder.recurring) {
        if (!reminder.days || reminder.days.length === 0) {
          // Daily recurring — dot on every day
          for (const day of daysInMonth) {
            const ds = toDateString(day);
            ensure(ds);
            if (!hasDot(ds, 'reminder')) {
              marks[ds].dots.push({ key: 'reminder', color: DOT_REMINDER });
            }
          }
        } else {
          for (const day of daysInMonth) {
            const weekday = WEEKDAY_MAP[day.getDay()];
            if (reminder.days.includes(weekday)) {
              const ds = toDateString(day);
              ensure(ds);
              if (!hasDot(ds, 'reminder')) {
                marks[ds].dots.push({ key: 'reminder', color: DOT_REMINDER });
              }
            }
          }
        }
      } else if (reminder.dueDate) {
        const ds = reminder.dueDate.slice(0, 10);
        if (ds.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
          ensure(ds);
          if (!hasDot(ds, 'reminder')) {
            marks[ds].dots.push({ key: 'reminder', color: DOT_REMINDER });
          }
        }
      }
    }

    // Notes — use local date, not UTC slice
    for (const note of notes) {
      const nd = new Date(note.createdAt);
      const ds = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
      if (ds.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
        ensure(ds);
        if (!hasDot(ds, 'note')) {
          marks[ds].dots.push({ key: 'note', color: DOT_NOTE });
        }
      }
    }

    // Mark selected date
    if (marks[selectedDate]) {
      marks[selectedDate].selected = true;
    } else {
      marks[selectedDate] = { dots: [], selected: true };
    }

    return marks;
  }, [alarms, reminders, notes, currentMonth, selectedDate]);

  // ── Day view items ──
  const dayRows = useMemo<ListRow[]>(() => {
    const items = sortItems(getItemsForDate(selectedDate, alarms, reminders, notes));
    return items.map((item) => ({ rowType: 'event' as const, item }));
  }, [alarms, reminders, notes, selectedDate]);

  // ── Week view items (always current week — the week containing today) ──
  const weekRows = useMemo<ListRow[]>(() => {
    const { start, end } = getWeekRange(today);
    const dates = getDatesInRange(start, end);
    const rows: ListRow[] = [];
    for (const ds of dates) {
      let items = getItemsForDate(ds, alarms, reminders, notes);
      items = applyFilter(items, filterType);
      items = sortItems(items);
      if (items.length > 0) {
        rows.push({ rowType: 'dateHeader', dateStr: ds, label: formatGroupDate(ds) });
        for (const item of items) {
          rows.push({ rowType: 'event', item });
        }
      }
    }
    return rows;
  }, [alarms, reminders, notes, today, filterType]);

  // ── Month view items ──
  const monthRows = useMemo<ListRow[]>(() => {
    const year = parseInt(currentMonth.slice(0, 4), 10);
    const month = parseInt(currentMonth.slice(5, 7), 10);
    const dates = getDaysInMonth(year, month).map(toDateString);
    const rows: ListRow[] = [];
    for (const ds of dates) {
      let items = getItemsForDate(ds, alarms, reminders, notes);
      items = applyFilter(items, filterType);
      items = sortItems(items);
      if (items.length > 0) {
        rows.push({ rowType: 'dateHeader', dateStr: ds, label: formatGroupDate(ds) });
        for (const item of items) {
          rows.push({ rowType: 'event', item });
        }
      }
    }
    return rows;
  }, [alarms, reminders, notes, currentMonth, filterType]);

  const listData = viewMode === 'day' ? dayRows : viewMode === 'week' ? weekRows : monthRows;

  // ── Styles ──
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          position: 'absolute',
          top: insets.top + 12,
          left: 16,
          zIndex: 10,
          backgroundColor: 'rgba(18, 18, 32, 0.85)',
          borderRadius: 20,
          padding: 4,
        },
        title: {
          fontSize: 22,
          fontWeight: '700',
          color: colors.textPrimary,
          textAlign: 'center',
          paddingVertical: 12,
        },
        calendarWrap: {
          paddingHorizontal: 8,
        },
        legendRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 16,
          paddingVertical: 8,
          paddingHorizontal: 16,
        },
        legendItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        legendDot: {
          width: 10,
          height: 10,
          borderRadius: 5,
        },
        legendText: {
          fontSize: 12,
          color: colors.textSecondary,
          fontWeight: '600',
        },
        tabRow: {
          flexDirection: 'row',
          paddingHorizontal: 16,
          gap: 8,
          paddingTop: 4,
          paddingBottom: 8,
        },
        tab: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        tabActive: {
          backgroundColor: colors.accent,
          borderColor: colors.accent,
        },
        tabText: {
          fontSize: 14,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        tabTextActive: {
          color: colors.background,
        },
        filterRow: {
          flexDirection: 'row',
          paddingHorizontal: 16,
          gap: 6,
          paddingBottom: 8,
        },
        filter: {
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 14,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        filterActive: {
          backgroundColor: colors.accent,
          borderColor: colors.accent,
        },
        filterText: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.textPrimary,
        },
        filterTextActive: {
          color: colors.background,
        },
        createRow: {
          flexDirection: 'row',
          paddingHorizontal: 16,
          gap: 12,
          paddingBottom: 8,
        },
        createBtn: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: colors.accent,
        },
        createBtnText: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.background,
        },
        sectionHeader: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.textPrimary,
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 8,
        },
        groupHeader: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.textSecondary,
          paddingTop: 12,
          paddingBottom: 6,
        },
        listContent: {
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 16,
        },
        card: {
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        cardIcon: {
          fontSize: 22,
        },
        cardBody: {
          flex: 1,
        },
        cardTitle: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.textPrimary,
        },
        cardSub: {
          fontSize: 12,
          color: colors.textSecondary,
          marginTop: 2,
        },
        cardLabel: {
          fontSize: 11,
          fontWeight: '700',
          borderRadius: 4,
          overflow: 'hidden',
          paddingHorizontal: 6,
          paddingVertical: 2,
          alignSelf: 'flex-start',
        },
        emptyText: {
          textAlign: 'center',
          color: colors.textSecondary,
          fontSize: 14,
          paddingVertical: 32,
          paddingHorizontal: 24,
        },
      }),
    [colors, insets],
  );

  const calendarTheme = useMemo(
    () => ({
      calendarBackground: colors.background,
      dayTextColor: colors.textPrimary,
      textDisabledColor: colors.textSecondary + '60',
      monthTextColor: colors.textPrimary,
      arrowColor: colors.accent,
      todayTextColor: colors.accent,
      selectedDayBackgroundColor: colors.accent,
      selectedDayTextColor: colors.background,
      textSectionTitleColor: colors.textSecondary,
    }),
    [colors],
  );

  // ── Custom day component ──
  const renderDay = useCallback(
    (props: DayComponentProps) => {
      const { date, state, marking, onPress } = props;
      if (!date) return null;

      const ds = date.dateString;
      const isSelected = marking?.selected === true;
      const isToday = ds === today;
      const isPast = ds < today;
      const isDisabled = state === 'disabled' || state === 'inactive';
      const dots: { key?: string; color: string }[] = marking?.dots ?? [];

      let textColor = colors.textPrimary;
      let opacity = 1;

      if (isDisabled) {
        textColor = colors.textSecondary;
        opacity = 0.2;
      } else if (isSelected) {
        textColor = colors.background;
      } else if (isToday) {
        textColor = colors.accent;
      } else if (isPast) {
        opacity = 0.4;
      }

      return (
        <TouchableOpacity
          onPress={() => onPress?.(date)}
          activeOpacity={0.6}
          style={dayCellStyles.cell}
        >
          <View
            style={[
              dayCellStyles.numWrap,
              isSelected && { backgroundColor: colors.accent },
            ]}
          >
            <Text
              style={[
                dayCellStyles.numText,
                { color: textColor, opacity },
              ]}
            >
              {date.day}
            </Text>
          </View>
          {dots.length > 0 && (
            <View style={dayCellStyles.dotRow}>
              {dots.map((dot, i) => (
                <View
                  key={dot.key ?? i}
                  style={[dayCellStyles.dot, { backgroundColor: dot.color }]}
                />
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [colors, today],
  );

  // ── Render helpers ──
  const renderEventCard = useCallback(
    (item: DayItem) => {
      if (item.type === 'alarm') {
        const a = item.data;
        return (
          <View style={[styles.card, { borderLeftColor: DOT_ALARM }]}>
            <Text style={styles.cardIcon}>{a.icon || '\u23F0'}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {a.nickname || a.category}
              </Text>
              <Text style={styles.cardSub}>
                {formatTime(a.time, timeFormat)}
                {a.mode === 'recurring' ? ` \u00B7 ${a.days.join(', ')}` : ''}
              </Text>
            </View>
            <Text
              style={[
                styles.cardLabel,
                { backgroundColor: DOT_ALARM + '20', color: DOT_ALARM },
              ]}
            >
              Alarm
            </Text>
          </View>
        );
      }

      if (item.type === 'reminder') {
        const r = item.data;
        return (
          <View style={[styles.card, { borderLeftColor: DOT_REMINDER }]}>
            <Text style={styles.cardIcon}>{r.icon}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {r.text}
              </Text>
              {(r.nickname || r.dueTime) && (
                <Text style={styles.cardSub}>
                  {r.nickname ? r.nickname : ''}
                  {r.nickname && r.dueTime ? ' \u00B7 ' : ''}
                  {r.dueTime ? formatTime(r.dueTime, timeFormat) : ''}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.cardLabel,
                { backgroundColor: DOT_REMINDER + '20', color: DOT_REMINDER },
              ]}
            >
              Reminder
            </Text>
          </View>
        );
      }

      const n = item.data;
      const line = n.text.split('\n')[0];
      const firstLine = line.length > 50 ? line.slice(0, 50) + '\u2026' : line;
      return (
        <View style={[styles.card, { borderLeftColor: DOT_NOTE }]}>
          <Text style={styles.cardIcon}>{n.icon}</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {firstLine}
            </Text>
            <Text style={styles.cardSub}>
              {new Date(n.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: timeFormat === '12h',
              })}
            </Text>
          </View>
          <Text
            style={[
              styles.cardLabel,
              { backgroundColor: DOT_NOTE + '20', color: DOT_NOTE },
            ]}
          >
            Note
          </Text>
        </View>
      );
    },
    [styles, timeFormat],
  );

  const renderRow = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.rowType === 'dateHeader') {
        return <Text style={styles.groupHeader}>{item.label}</Text>;
      }
      return renderEventCard(item.item);
    },
    [styles, renderEventCard],
  );

  const rowKeyExtractor = useCallback(
    (item: ListRow, index: number) => {
      if (item.rowType === 'dateHeader') return `header-${item.dateStr}-${index}`;
      return `${item.item.type}-${item.item.data.id}-${index}`;
    },
    [],
  );

  // ── Section header text ──
  const sectionTitle = useMemo(() => {
    if (viewMode === 'day') {
      return `Events for ${formatDisplayDate(selectedDate)}`;
    }
    if (viewMode === 'week') {
      const { start, end } = getWeekRange(today);
      return formatWeekHeader(start, end);
    }
    return formatMonthHeader(currentMonth);
  }, [viewMode, selectedDate, currentMonth, today]);

  // ── List header (calendar + controls) ──
  const listHeader = useMemo(
    () => (
      <>
        <Text style={styles.title}>{'\uD83D\uDCC5'} Calendar</Text>
        <View style={styles.calendarWrap}>
          <Calendar
            key={`${colors.background}-${currentMonth}`}
            current={currentMonth}
            markingType="multi-dot"
            markedDates={markedDates}
            theme={calendarTheme}
            dayComponent={renderDay}
            onDayPress={(day: { dateString: string }) => {
              setSelectedDate(day.dateString);
              if (viewMode === 'week') {
                const { start, end } = getWeekRange(today);
                if (day.dateString < start || day.dateString > end) {
                  setViewMode('day');
                }
              }
            }}
            onMonthChange={(month: { dateString: string }) =>
              setCurrentMonth(month.dateString)
            }
          />
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DOT_ALARM }]} />
            <Text style={styles.legendText}>Alarms</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DOT_REMINDER }]} />
            <Text style={styles.legendText}>Reminders</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DOT_NOTE }]} />
            <Text style={styles.legendText}>Notes</Text>
          </View>
        </View>
        {/* Quick-create buttons (day only, today or future) */}
        {viewMode === 'day' && selectedDate >= today && (
          <View style={styles.createRow}>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                navigation.navigate('CreateAlarm', { initialDate: selectedDate });
              }}
              activeOpacity={0.7}
              style={styles.createBtn}
            >
              <Text style={styles.createBtnText}>{'\uFF0B'} Alarm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                navigation.navigate('CreateReminder', { initialDate: selectedDate });
              }}
              activeOpacity={0.7}
              style={styles.createBtn}
            >
              <Text style={styles.createBtnText}>{'\uFF0B'} Reminder</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* View mode tabs */}
        <View style={styles.tabRow}>
          {VIEW_MODES.map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => {
                hapticLight();
                setViewMode(mode);
              }}
              activeOpacity={0.7}
              style={[styles.tab, viewMode === mode && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  viewMode === mode && styles.tabTextActive,
                ]}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Filter capsules (week & month only) */}
        {viewMode !== 'day' && (
          <View style={styles.filterRow}>
            {FILTER_TYPES.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  hapticLight();
                  setFilterType(f);
                }}
                activeOpacity={0.7}
                style={[styles.filter, filterType === f && styles.filterActive]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filterType === f && styles.filterTextActive,
                  ]}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={styles.sectionHeader}>{sectionTitle}</Text>
      </>
    ),
    [
      styles,
      colors.background,
      markedDates,
      calendarTheme,
      viewMode,
      filterType,
      sectionTitle,
      selectedDate,
      today,
      navigation,
    ],
  );

  const emptyMessage = useMemo(() => {
    if (viewMode === 'day') {
      return `Nothing here. Either you're free or you forgot to write it down. ${'\uD83E\uDD37'}`;
    }
    if (viewMode === 'week') {
      return `Nothing this week. Enjoy the silence. ${'\uD83D\uDE0C'}`;
    }
    return `A whole month of nothing? That's either zen or denial. ${'\uD83E\uDDD8'}`;
  }, [viewMode]);

  const listEmpty = useMemo(
    () => <Text style={styles.emptyText}>{emptyMessage}</Text>,
    [styles, emptyMessage],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      <FlatList
        data={listData}
        renderItem={renderRow}
        keyExtractor={rowKeyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

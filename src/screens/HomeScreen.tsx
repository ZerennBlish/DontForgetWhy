import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loadAlarms } from '../services/storage';
import { getReminders } from '../services/reminderStorage';
import { getNotes } from '../services/noteStorage';
import { getVoiceMemos } from '../services/voiceMemoStorage';
import { loadActiveTimers } from '../services/timerStorage';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { loadSettings } from '../services/settings';
import { formatTime } from '../utils/time';
import { getRandomBannerQuote } from '../data/homeBannerQuotes';
import type { BannerQuote } from '../data/homeBannerQuotes';
import { useTheme } from '../theme/ThemeContext';
import { hapticLight } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import type { Alarm, AlarmDay } from '../types/alarm';
import type { Reminder } from '../types/reminder';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const WEEKDAY_MAP: Record<number, AlarmDay> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

const EMPTY_TODAY_LINES = [
  'Nothing today. Living dangerously.',
  'Completely empty. Must be nice.',
  'Zero events. The universe isn\'t impressed.',
  'A blank slate. Try not to ruin it.',
  'No plans. Your calendar is judging you.',
];

interface TodayEvent {
  type: 'alarm' | 'reminder';
  title: string;
  time: string;
  data: Alarm | Reminder;
}

function getTodayEvents(alarms: Alarm[], reminders: Reminder[]): TodayEvent[] {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekday = WEEKDAY_MAP[now.getDay()];
  const events: TodayEvent[] = [];

  for (const alarm of alarms) {
    if (!alarm.enabled || alarm.deletedAt) continue;
    let matches = false;
    if (alarm.mode === 'one-time' && alarm.date === todayStr) {
      matches = true;
    } else if (alarm.mode === 'recurring') {
      if (alarm.days.length === 0 || alarm.days.includes(weekday)) {
        matches = true;
      }
    }
    if (matches) {
      events.push({
        type: 'alarm',
        title: alarm.nickname || alarm.note || 'Alarm',
        time: alarm.time,
        data: alarm,
      });
    }
  }

  for (const reminder of reminders) {
    if (reminder.completed || reminder.deletedAt) continue;
    let matches = false;
    if (reminder.recurring) {
      if (!reminder.days || reminder.days.length === 0) {
        if (reminder.dueDate) {
          const due = new Date(reminder.dueDate.slice(0, 10) + 'T00:00:00');
          if (now.getMonth() === due.getMonth() && now.getDate() === due.getDate()) {
            matches = true;
          }
        } else {
          matches = true;
        }
      } else if (reminder.days.includes(weekday)) {
        matches = true;
      }
    } else if (reminder.dueDate && reminder.dueDate.slice(0, 10) === todayStr) {
      matches = true;
    }
    if (matches) {
      events.push({
        type: 'reminder',
        title: reminder.nickname || reminder.text || 'Reminder',
        time: reminder.dueTime || '',
        data: reminder,
      });
    }
  }

  events.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return events;
}

// ── View-based icons ────────────────────────────────────────────

function AlarmIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderLeftColor: 'transparent', borderBottomWidth: 6, borderBottomColor: color, position: 'absolute', top: 2 }} />
      </View>
    </View>
  );
}

function TimerIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: color, alignItems: 'center' }}>
        <View style={{ width: 2, height: 5, backgroundColor: color, marginTop: 2 }} />
      </View>
      <View style={{ width: 6, height: 2, backgroundColor: color, position: 'absolute', top: 1, borderRadius: 1 }} />
    </View>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 12, height: 10, backgroundColor: color, borderTopLeftRadius: 6, borderTopRightRadius: 6, marginTop: 2 }} />
      <View style={{ width: 16, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 4, height: 3, backgroundColor: color, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
    </View>
  );
}

function DocIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 13, height: 16, borderRadius: 2, borderWidth: 1.5, borderColor: color, paddingTop: 3, paddingLeft: 2, gap: 2 }}>
        <View style={{ width: 7, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 5, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 7, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
}

function MicIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 8, height: 12, borderRadius: 4, backgroundColor: color }} />
      <View style={{ width: 12, height: 6, borderRadius: 4, borderWidth: 1.5, borderColor: color, borderTopWidth: 0, position: 'absolute', bottom: 3 }} />
      <View style={{ width: 2, height: 3, backgroundColor: color, position: 'absolute', bottom: 0 }} />
    </View>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 16, height: 14, borderRadius: 2, borderWidth: 1.5, borderColor: color, marginTop: 2 }}>
        <View style={{ width: '100%', height: 3, backgroundColor: color }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 2, position: 'absolute', bottom: 3 }}>
        <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
        <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
      </View>
    </View>
  );
}

function GamepadIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 18, height: 11, borderRadius: 5, borderWidth: 1.5, borderColor: color, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 }}>
        <View style={{ width: 5, height: 5, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 5, height: 1.5, backgroundColor: color, position: 'absolute' }} />
          <View style={{ width: 1.5, height: 5, backgroundColor: color, position: 'absolute' }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <View style={{ width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: color }} />
          <View style={{ width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: color }} />
        </View>
      </View>
    </View>
  );
}

function PencilIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 3, height: 14, backgroundColor: color, borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 4,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
        position: 'absolute', bottom: 2, left: 5,
        transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );
}

function GearIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: color }} />
      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: color, borderStyle: 'dashed', position: 'absolute' }} />
    </View>
  );
}

const SECTION_ICONS: Record<string, React.FC<{ color: string }>> = {
  alarms: AlarmIcon,
  timers: TimerIcon,
  reminders: BellIcon,
  notepad: DocIcon,
  voice: MicIcon,
  calendar: CalendarIcon,
  games: GamepadIcon,
  forgetlog: PencilIcon,
  settings: GearIcon,
};

// ── Section definitions ─────────────────────────────────────────

interface Section {
  key: string;
  label: string;
  color: string;
  getSubtitle: (counts: Counts) => string;
}

interface Counts {
  alarms: number;
  timers: number;
  reminders: number;
  notes: number;
  voiceMemos: number;
  todayEvents: number;
}

const SECTIONS: Section[] = [
  { key: 'alarms', label: 'Alarms', color: '#FF6B6B', getSubtitle: (c) => `${c.alarms} set` },
  { key: 'reminders', label: 'Reminders', color: '#4A90D9', getSubtitle: (c) => `${c.reminders} upcoming` },
  { key: 'calendar', label: 'Calendar', color: '#E17055', getSubtitle: (c) => `${c.todayEvents} today` },
  { key: 'notepad', label: 'Notepad', color: '#55EFC4', getSubtitle: (c) => `${c.notes} note${c.notes !== 1 ? 's' : ''}` },
  { key: 'voice', label: 'Voice', color: '#A29BFE', getSubtitle: (c) => `${c.voiceMemos} memo${c.voiceMemos !== 1 ? 's' : ''}` },
  { key: 'games', label: 'Games', color: '#A8E06C', getSubtitle: () => '5 games' },
];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Component ───────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [voiceMemoCount, setVoiceMemoCount] = useState(0);
  const [runningTimerCount, setRunningTimerCount] = useState(0);
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [bannerQuote] = useState<BannerQuote>(getRandomBannerQuote);
  const [emptyLine] = useState(() => EMPTY_TODAY_LINES[Math.floor(Math.random() * EMPTY_TODAY_LINES.length)]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadAlarms(true).then((loaded) => {
        if (cancelled) return;
        const active = loaded.filter((a) => !a.deletedAt);
        setAlarms(active);
        getReminders().then((rems) => {
          if (cancelled) return;
          const activeRems = rems.filter((r) => !r.deletedAt);
          setReminders(activeRems);
          setTodayEvents(getTodayEvents(active, activeRems));
        });
      });
      getNotes().then((loaded) => { if (!cancelled) setNoteCount(loaded.length); });
      getVoiceMemos().then((loaded) => { if (!cancelled) setVoiceMemoCount(loaded.filter((m) => !m.deletedAt).length); });
      loadActiveTimers().then((loaded) => {
        if (cancelled) return;
        const now = Date.now();
        const running = loaded.filter((t) => {
          if (!t.isRunning) return false;
          const elapsed = Math.floor((now - new Date(t.startedAt).getTime()) / 1000);
          return t.totalSeconds - elapsed > 0;
        });
        setRunningTimerCount(running.length);
      });
      loadSettings().then((s) => { if (!cancelled) setTimeFormat(s.timeFormat); });
      loadBackground().then((v) => { if (!cancelled) setBgUri(v); });
      getOverlayOpacity().then((v) => { if (!cancelled) setBgOpacity(v); });
      return () => { cancelled = true; };
    }, []),
  );

  const counts: Counts = useMemo(() => ({
    alarms: alarms.filter((a) => a.enabled).length,
    timers: runningTimerCount,
    reminders: reminders.filter((r) => !r.completed).length,
    notes: noteCount,
    voiceMemos: voiceMemoCount,
    todayEvents: todayEvents.length,
  }), [alarms, runningTimerCount, reminders, noteCount, voiceMemoCount, todayEvents]);

  const handleSectionPress = useCallback((key: string) => {
    hapticLight();
    switch (key) {
      case 'alarms': navigation.navigate('AlarmList', { initialTab: 0 }); break;
      case 'reminders': navigation.navigate('AlarmList', { initialTab: 1 }); break;
      case 'notepad': navigation.navigate('Notepad'); break;
      case 'voice': navigation.navigate('VoiceMemoList'); break;
      case 'calendar': navigation.navigate('Calendar'); break;
      case 'games': navigation.navigate('Games'); break;
    }
  }, [navigation]);

  const handleEventPress = useCallback((event: TodayEvent) => {
    hapticLight();
    if (event.type === 'alarm') {
      navigation.navigate('CreateAlarm', { alarm: event.data as Alarm });
    } else {
      navigation.navigate('CreateReminder', { reminderId: (event.data as Reminder).id });
    }
  }, [navigation]);

  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const dayNum = now.getDate();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: insets.top + 12,
      paddingHorizontal: 16,
      paddingBottom: insets.bottom + 24,
    },
    // Title bar
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      flex: 1,
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    gearSpacer: {
      width: 44,
    },
    gearBtn: {
      padding: 4,
    },
    gearCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Personality banner
    banner: {
      borderLeftWidth: 3,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 18,
    },
    bannerHeader: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 4,
    },
    bannerQuote: {
      fontSize: 13,
      fontStyle: 'italic',
      color: 'rgba(255,255,255,0.85)',
      lineHeight: 18,
    },
    // Quick Capture
    quickCaptureHeader: {
      fontSize: 11,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.4)',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    quickCaptureRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
    },
    quickCaptureBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    quickCaptureLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: '#FFFFFF',
    },
    // Grid
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 24,
    },
    gridCell: {
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 10,
      alignItems: 'center',
      gap: 4,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridLabel: {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
    },
    gridSubtitle: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.45)',
      textAlign: 'center',
    },
    // Today section
    todayHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textTertiary,
      letterSpacing: 1,
      marginBottom: 10,
    },
    todayContainer: {
      height: 200,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      borderRadius: 14,
      padding: 12,
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.04)',
      marginBottom: 6,
      gap: 10,
    },
    eventDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    eventTitle: {
      fontSize: 13,
      color: colors.textPrimary,
      flex: 1,
    },
    eventSub: {
      fontSize: 11,
      color: colors.textTertiary,
    },
    emptyToday: {
      flex: 1,
      fontSize: 13,
      fontStyle: 'italic',
      color: colors.textTertiary,
      textAlign: 'center',
      textAlignVertical: 'center',
    },
  }), [colors, insets]);

  return (
    <View style={styles.container}>
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

      <View style={[styles.scroll, styles.scrollContent]}>
        {/* A. Title bar */}
        <View style={styles.headerRow}>
          <View style={styles.gearSpacer} />
          <Text style={styles.title}>Don't Forget Why</Text>
          <TouchableOpacity
            onPress={() => { hapticLight(); navigation.navigate('Settings'); }}
            activeOpacity={0.7}
            style={styles.gearBtn}
          >
            <View style={styles.gearCircle}>
              <GearIcon color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* B. Personality banner */}
        <View style={[styles.banner, { borderLeftColor: bannerQuote.color, backgroundColor: hexToRgba(bannerQuote.color, 0.12) }]}>
          <Text style={[styles.bannerHeader, { color: bannerQuote.color }]}>ALARM GUY SAYS</Text>
          <Text style={styles.bannerQuote}>{bannerQuote.text}</Text>
        </View>

        {/* C. Quick Capture */}
        <Text style={styles.quickCaptureHeader}>QUICK CAPTURE</Text>
        <View style={styles.quickCaptureRow}>
          <TouchableOpacity
            style={styles.quickCaptureBtn}
            onPress={() => { hapticLight(); navigation.navigate('Notepad', { newNote: true }); }}
            activeOpacity={0.7}
          >
            <View style={{ transform: [{ scale: 0.8 }] }}>
              <DocIcon color="#55EFC4" />
            </View>
            <Text style={styles.quickCaptureLabel}>New Note</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCaptureBtn}
            onPress={() => { hapticLight(); navigation.navigate('VoiceRecord'); }}
            activeOpacity={0.7}
          >
            <View style={{ transform: [{ scale: 0.8 }] }}>
              <MicIcon color="#A29BFE" />
            </View>
            <Text style={styles.quickCaptureLabel}>Record Memo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCaptureBtn}
            onPress={() => { hapticLight(); navigation.navigate('Timers'); }}
            activeOpacity={0.7}
          >
            <View style={{ transform: [{ scale: 0.8 }] }}>
              <TimerIcon color="#FDCB6E" />
            </View>
            <Text style={styles.quickCaptureLabel}>Set Timer</Text>
          </TouchableOpacity>
        </View>

        {/* D. Section grid */}
        <View style={styles.grid}>
          {SECTIONS.map((section) => {
            const IconComp = SECTION_ICONS[section.key];
            const subtitle = section.getSubtitle(counts);
            return (
              <TouchableOpacity
                key={section.key}
                onPress={() => handleSectionPress(section.key)}
                activeOpacity={0.7}
                style={[
                  styles.gridCell,
                  {
                    width: '31%' as unknown as number,
                    flexBasis: '31%' as unknown as number,
                    flexGrow: 1,
                    backgroundColor: `${section.color}33`,
                    borderWidth: 1,
                    borderColor: `${section.color}59`,
                  },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${section.color}4D` }]}>
                  <View style={{ transform: [{ scale: 0.9 }] }}>
                    <IconComp color={section.color} />
                  </View>
                </View>
                <Text style={[styles.gridLabel, { color: section.color }]}>{section.label}</Text>
                {subtitle !== '' && <Text style={styles.gridSubtitle}>{subtitle}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* D. Today section */}
        <Text style={styles.todayHeader}>TODAY {'\u2014'} {monthName} {dayNum}</Text>

        <View style={styles.todayContainer}>
          {todayEvents.length === 0 ? (
            <Text style={styles.emptyToday}>{emptyLine}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {todayEvents.map((event, i) => (
                <TouchableOpacity
                  key={`${event.type}-${i}`}
                  onPress={() => handleEventPress(event)}
                  activeOpacity={0.7}
                  style={styles.eventRow}
                >
                  <View
                    style={[
                      styles.eventDot,
                      { backgroundColor: event.type === 'alarm' ? '#FF6B6B' : '#4A90D9' },
                    ]}
                  />
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.eventSub}>
                    {event.type === 'alarm' ? 'Alarm' : 'Reminder'}
                    {event.time ? ` \u00B7 ${formatTime(event.time, timeFormat)}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

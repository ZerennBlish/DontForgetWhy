import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ToastAndroid,
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
import { shouldAutoBackup, autoExportBackup } from '../services/backupRestore';
import type { Alarm, AlarmDay } from '../types/alarm';
import type { Reminder } from '../types/reminder';
import APP_ICONS from '../data/appIconAssets';

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
        } else if (reminder.createdAt) {
          // Yearly from createdAt
          const created = new Date(reminder.createdAt);
          if (now.getMonth() === created.getMonth() && now.getDate() === created.getDate()) {
            matches = true;
          }
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

const SECTION_ICON_SOURCES: Record<string, ImageSourcePropType> = {
  alarms: APP_ICONS.alarm,
  timers: APP_ICONS.stopwatch,
  reminders: APP_ICONS.bell,
  notepad: APP_ICONS.notepad,
  voice: APP_ICONS.microphone,
  calendar: APP_ICONS.calendar,
  games: APP_ICONS.gamepad,
  forgetlog: APP_ICONS.notepad,  // reuse notepad icon for forget log
  settings: APP_ICONS.gear,
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

// SECTIONS defined inside component as useMemo (needs colors)

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

  useEffect(() => {
    (async () => {
      try {
        if (shouldAutoBackup()) {
          const success = await autoExportBackup();
          if (success) {
            ToastAndroid.show('Memories backed up', ToastAndroid.SHORT);
          }
        }
      } catch (e) {
        console.warn('[autoBackup] Check failed:', e);
      }
    })();
  }, []);

  const sections: Section[] = useMemo(() => [
    { key: 'alarms', label: 'Alarms', color: colors.sectionAlarm, getSubtitle: (c: Counts) => `${c.alarms} set` },
    { key: 'reminders', label: 'Reminders', color: colors.sectionReminder, getSubtitle: (c: Counts) => `${c.reminders} upcoming` },
    { key: 'calendar', label: 'Calendar', color: colors.sectionCalendar, getSubtitle: (c: Counts) => `${c.todayEvents} today` },
    { key: 'notepad', label: 'Notepad', color: colors.sectionNotepad, getSubtitle: (c: Counts) => `${c.notes} note${c.notes !== 1 ? 's' : ''}` },
    { key: 'voice', label: 'Voice', color: colors.sectionVoice, getSubtitle: (c: Counts) => `${c.voiceMemos} memo${c.voiceMemos !== 1 ? 's' : ''}` },
    { key: 'games', label: 'Games', color: colors.sectionGames, getSubtitle: () => '5 games' },
  ], [colors]);

  const bannerColorMap: Record<string, string> = useMemo(() => ({
    alarms: colors.sectionAlarm,
    reminders: colors.sectionReminder,
    calendar: colors.sectionCalendar,
    notepad: colors.sectionNotepad,
    voice: colors.sectionVoice,
    timers: colors.sectionTimer,
    games: colors.sectionGames,
  }), [colors]);

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
      case 'alarms': navigation.navigate('AlarmList'); break;
      case 'reminders': navigation.navigate('Reminders'); break;
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
      color: colors.brandTitle,
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
      backgroundColor: colors.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
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
      elevation: 1,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
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
      color: colors.textSecondary,
      lineHeight: 18,
    },
    // Quick Capture
    quickCaptureHeader: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textTertiary,
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
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
    },
    quickCaptureLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
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
      color: colors.textTertiary,
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
      backgroundColor: colors.mode === 'dark' ? 'rgba(10, 10, 18, 0.55)' : 'rgba(242, 243, 248, 0.65)',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
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
            source={require('../../assets/fullscreenicon.webp')}
            style={{ width: '100%', height: '100%', opacity: colors.mode === 'dark' ? 0.15 : 0.06 }}
            resizeMode="cover"
          />
        )}
      </View>

      <View style={[styles.scroll, styles.scrollContent]}>
        {/* A. Title bar */}
        <View style={styles.headerRow}>
          <View style={styles.gearSpacer} />
          <Text style={[styles.title, bgUri && { color: colors.overlayText }]}>Don't Forget Why</Text>
          <TouchableOpacity
            onPress={() => { hapticLight(); navigation.navigate('Settings'); }}
            activeOpacity={0.7}
            style={styles.gearBtn}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <View style={styles.gearCircle}>
              <Image source={APP_ICONS.gear} style={{ width: 20, height: 20 }} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        </View>

        {/* B. Personality banner */}
        <View style={[styles.banner, { borderLeftColor: bannerColorMap[bannerQuote.section] || colors.accent, backgroundColor: colors.mode === 'dark' ? hexToRgba(bannerColorMap[bannerQuote.section] || colors.accent, bgUri ? 0.35 : 0.12) : hexToRgba(bannerColorMap[bannerQuote.section] || colors.accent, bgUri ? 0.25 : 0.08) }]}>
          <Text style={[styles.bannerHeader, { color: bannerColorMap[bannerQuote.section] || colors.accent }]}>ALARM GUY SAYS</Text>
          <Text style={[styles.bannerQuote, bgUri && { color: 'rgba(255,255,255,0.7)' }]}>{bannerQuote.text}</Text>
        </View>

        {/* C. Quick Capture */}
        <Text style={[styles.quickCaptureHeader, bgUri && { color: 'rgba(255,255,255,0.5)' }]}>QUICK CAPTURE</Text>
        <View style={styles.quickCaptureRow}>
          <TouchableOpacity
            style={[styles.quickCaptureBtn, { backgroundColor: colors.sectionNotepad + (bgUri ? '90' : '45') }]}
            onPress={() => { hapticLight(); navigation.navigate('Notepad', { newNote: true }); }}
            activeOpacity={0.7}
            accessibilityLabel="New Note"
            accessibilityRole="button"
          >
            <Image source={APP_ICONS.notepad} style={{ width: 20, height: 20 }} resizeMode="contain" />
            <Text style={[styles.quickCaptureLabel, bgUri && { color: colors.overlayText }]}>New Note</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCaptureBtn, { backgroundColor: colors.sectionVoice + (bgUri ? '90' : '45') }]}
            onPress={() => { hapticLight(); navigation.navigate('VoiceRecord'); }}
            activeOpacity={0.7}
            accessibilityLabel="Record Memo"
            accessibilityRole="button"
          >
            <Image source={APP_ICONS.microphone} style={{ width: 20, height: 20 }} resizeMode="contain" />
            <Text style={[styles.quickCaptureLabel, bgUri && { color: colors.overlayText }]}>Record Memo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCaptureBtn, { backgroundColor: colors.sectionTimer + (bgUri ? '90' : '45') }]}
            onPress={() => { hapticLight(); navigation.navigate('Timers'); }}
            activeOpacity={0.7}
            accessibilityLabel="Set Timer"
            accessibilityRole="button"
          >
            <Image source={APP_ICONS.stopwatch} style={{ width: 20, height: 20 }} resizeMode="contain" />
            <Text style={[styles.quickCaptureLabel, bgUri && { color: colors.overlayText }]}>Set Timer</Text>
          </TouchableOpacity>
        </View>

        {/* D. Section grid */}
        <View style={styles.grid}>
          {sections.map((section) => {
            const iconSource = SECTION_ICON_SOURCES[section.key];
            const subtitle = section.getSubtitle(counts);
            return (
              <TouchableOpacity
                key={section.key}
                onPress={() => handleSectionPress(section.key)}
                activeOpacity={0.7}
                accessibilityLabel={`${section.label}${subtitle ? `, ${subtitle}` : ''}`}
                accessibilityRole="button"
                style={[
                  styles.gridCell,
                  {
                    width: '31%' as unknown as number,
                    flexBasis: '31%' as unknown as number,
                    flexGrow: 1,
                    backgroundColor: `${section.color}${bgUri ? '90' : '40'}`,
                  },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'transparent' }]}>
                  <Image
                    source={iconSource}
                    style={{ width: 30, height: 30 }}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.gridLabel, { color: (colors.mode === 'dark' || bgUri) ? '#FFFFFF' : '#1F2937' }]}>{section.label}</Text>
                {subtitle !== '' && <Text style={[styles.gridSubtitle, { color: bgUri ? 'rgba(255,255,255,0.55)' : (colors.mode === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)') }]}>{subtitle}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* D. Today section */}
        <Text style={[styles.todayHeader, bgUri && { color: colors.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.6)' }]}>TODAY {'\u2014'} {monthName} {dayNum}</Text>

        <View style={[styles.todayContainer, { backgroundColor: bgUri ? (colors.mode === 'dark' ? 'rgba(10, 10, 18, 0.88)' : 'rgba(242, 243, 248, 0.92)') : undefined }]}>
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
                  accessibilityLabel={`${event.title}, ${event.type === 'alarm' ? 'Alarm' : 'Reminder'}${event.time ? `, ${formatTime(event.time, timeFormat)}` : ''}`}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.eventDot,
                      { backgroundColor: event.type === 'alarm' ? colors.sectionAlarm : colors.sectionReminder },
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

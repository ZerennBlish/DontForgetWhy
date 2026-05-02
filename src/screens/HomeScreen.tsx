import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ToastAndroid,
  Dimensions,
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
import { kvGet, kvSet } from '../services/database';
import { createAudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';
import type { PlayerWithEvents } from '../utils/audioCompat';
import { formatTime } from '../utils/time';
import { getRandomBannerQuote } from '../data/homeBannerQuotes';
import type { BannerQuote } from '../data/homeBannerQuotes';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { hapticLight } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import { shouldAutoBackup, autoExportBackup } from '../services/backupRestore';
import type { Alarm, AlarmDay } from '../types/alarm';
import type { Reminder } from '../types/reminder';
import { useAppIcon } from '../hooks/useAppIcon';
import { fetchCalendarEvents, getEventsForDate, type GoogleCalendarEvent } from '../services/googleCalendar';
import { getCurrentUser, onAuthStateChanged } from '../services/firebaseAuth';

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

const WELCOME_SLIDES = [
  {
    title: 'Welcome to Don\'t Forget Why',
    subtitle: 'Alarms. Notes. Games. Judgment.',
    icon: null, // Uses the character image
  },
  {
    title: 'More Than Just Alarms',
    subtitle: 'Alarms with attitude, timers, reminders, and calendar sync — all in one place.',
    icons: ['alarm', 'stopwatch', 'bell', 'calendar'] as const,
  },
  {
    title: 'Your Stuff, Your Way',
    subtitle: 'Notepad, voice memos, 6 themes, custom icons. No accounts. No tracking. No ads.',
    icons: ['notepad', 'microphone', 'gear'] as const,
  },
  {
    title: 'Games That Judge You',
    subtitle: 'Chess, checkers, trivia, sudoku, memory match, daily riddle. Brain training with personality.',
    icons: ['gamepad'] as const,
  },
];

interface TodayEvent {
  type: 'alarm' | 'reminder' | 'googleCal';
  title: string;
  time: string;
  data: Alarm | Reminder | GoogleCalendarEvent;
}

function getTodayEvents(
  alarms: Alarm[],
  reminders: Reminder[],
  googleEvents: GoogleCalendarEvent[],
): TodayEvent[] {
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

  const todayGoogle = getEventsForDate(todayStr, googleEvents);
  for (const event of todayGoogle) {
    let time = '00:00';
    if (!event.isAllDay) {
      const d = new Date(event.startTime);
      time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    events.push({
      type: 'googleCal',
      title: event.summary,
      time,
      data: event,
    });
  }

  events.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return events;
}

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

  const alarmIcon = useAppIcon('alarm');
  const stopwatchIcon = useAppIcon('stopwatch');
  const bellIcon = useAppIcon('bell');
  const notepadIcon = useAppIcon('notepad');
  const microphoneIcon = useAppIcon('microphone');
  const calendarIcon = useAppIcon('calendar');
  const gamepadIcon = useAppIcon('gamepad');
  const gearIcon = useAppIcon('gear');

  const sectionIconSources: Record<string, ImageSourcePropType> = useMemo(() => ({
    alarms: alarmIcon,
    timers: stopwatchIcon,
    reminders: bellIcon,
    notepad: notepadIcon,
    voice: microphoneIcon,
    calendar: calendarIcon,
    games: gamepadIcon,
    forgetlog: notepadIcon,
    settings: gearIcon,
  }), [alarmIcon, stopwatchIcon, bellIcon, notepadIcon, microphoneIcon, calendarIcon, gamepadIcon, gearIcon]);

  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [authUser, setAuthUser] = useState<ReturnType<typeof getCurrentUser>>(() => getCurrentUser());
  const [noteCount, setNoteCount] = useState(0);
  const [voiceMemoCount, setVoiceMemoCount] = useState(0);
  const [runningTimerCount, setRunningTimerCount] = useState(0);
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [bannerQuote] = useState<BannerQuote>(getRandomBannerQuote);
  const [emptyLine] = useState(() => EMPTY_TODAY_LINES[Math.floor(Math.random() * EMPTY_TODAY_LINES.length)]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeSlide, setWelcomeSlide] = useState(0);

  const openingPlayerRef = useRef<PlayerWithEvents | null>(null);
  const dismissWelcomeRef = useRef<(() => void) | null>(null);
  const welcomeScrollRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    // One-time welcome overlay + opening clip
    const alreadyPlayed = kvGet('opening_clip_played');
    if (alreadyPlayed) return;

    setShowWelcome(true);
    let cancelled = false;
    let slideTimer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const asset = Asset.fromModule(require('../../assets/voice/Opening.mp3'));
        await asset.downloadAsync();
        if (cancelled) return;
        const uri = asset.localUri;
        if (!uri) return;
        const player = createAudioPlayer({ uri }) as PlayerWithEvents;
        openingPlayerRef.current = player;
        player.volume = 1.0;
        if (cancelled) {
          try { player.remove(); } catch { /* */ }
          openingPlayerRef.current = null;
          return;
        }

        // Auto-advance slides every 6.5 seconds (4 slides × 6.5s = 26s clip)
        slideTimer = setInterval(() => {
          setWelcomeSlide((prev) => {
            const next = prev < 3 ? prev + 1 : prev;
            if (next !== prev) {
              welcomeScrollRef.current?.scrollTo({ x: next * screenWidth, animated: true });
            }
            return next;
          });
        }, 6500);

        // Listen for playback completion
        const sub = player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish && !cancelled) {
            dismissWelcome();
          }
        });

        player.play();

        // Store subscription removal for cleanup
        openingPlayerRef.current = Object.assign(player, { _statusSub: sub });
      } catch (e) {
        console.warn('[HomeScreen] opening clip error:', e);
        // If clip fails, still show overlay — user can skip
      }
    })();

    function dismissWelcome() {
      cancelled = true;
      if (slideTimer) clearInterval(slideTimer);
      kvSet('opening_clip_played', 'true');
      setShowWelcome(false);
      setWelcomeSlide(0);
      if (openingPlayerRef.current) {
        try { openingPlayerRef.current.pause(); } catch { /* */ }
        try {
          const sub = (openingPlayerRef.current as any)._statusSub;
          if (sub?.remove) sub.remove();
        } catch { /* */ }
        try { openingPlayerRef.current.remove(); } catch { /* */ }
        openingPlayerRef.current = null;
      }
    }

    // Expose dismissWelcome for the skip button via ref
    dismissWelcomeRef.current = dismissWelcome;

    return () => {
      dismissWelcome();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (openingPlayerRef.current) {
        try { openingPlayerRef.current.pause(); } catch { /* */ }
        try { openingPlayerRef.current.remove(); } catch { /* */ }
        openingPlayerRef.current = null;
      }
    });
    return unsubscribe;
  }, [navigation]);

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
    setTodayEvents(getTodayEvents(alarms, reminders, googleEvents));
  }, [alarms, reminders, googleEvents]);

  useEffect(() => {
    const unsub = onAuthStateChanged((user) => setAuthUser(user));
    return unsub;
  }, []);

  useEffect(() => {
    if (!authUser) {
      setGoogleEvents([]);
      return;
    }
    let cancelled = false;
    const nowD = new Date();
    const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
    fetchCalendarEvents(todayStr, todayStr).then((events) => {
      if (!cancelled) setGoogleEvents(events);
    });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

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
    if (event.type === 'googleCal') return;
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
      fontSize: 32,
      color: colors.brandTitle,
      textAlign: 'center',
      fontFamily: FONTS.title,
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
      fontFamily: FONTS.bold,
      letterSpacing: 1,
      marginBottom: 4,
    },
    bannerQuote: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      fontStyle: 'italic',
      color: colors.textSecondary,
      lineHeight: 18,
    },
    // Quick Capture
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
      fontSize: 12,
      fontFamily: FONTS.semiBold,
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
      textAlign: 'center',
      fontFamily: FONTS.bold,
    },
    gridSubtitle: {
      fontSize: 10,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    // Today section
    todayHeader: {
      fontSize: 11,
      fontFamily: FONTS.bold,
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
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: colors.textPrimary,
      flex: 1,
    },
    eventSub: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
    },
    emptyToday: {
      flex: 1,
      fontSize: 12,
      fontFamily: FONTS.regular,
      fontStyle: 'italic',
      color: colors.textTertiary,
      textAlign: 'center',
      textAlignVertical: 'center',
    },
    // Welcome overlay
    welcomeOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      zIndex: 100,
    },
    welcomeScrollContent: {
      alignItems: 'stretch',
    },
    welcomeSlide: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    welcomeCharacter: {
      width: 160,
      height: 160,
      marginBottom: 24,
    },
    welcomeIconRow: {
      flexDirection: 'row',
      gap: 20,
      marginBottom: 24,
    },
    welcomeIcon: {
      width: 48,
      height: 48,
    },
    welcomeTitle: {
      fontSize: 22,
      fontFamily: FONTS.bold,
      color: '#FFFFFF',
      textAlign: 'center',
      marginBottom: 12,
    },
    welcomeSubtitle: {
      fontSize: 14,
      fontFamily: FONTS.regular,
      color: 'rgba(255, 255, 255, 0.7)',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 32,
    },
    welcomeDots: {
      position: 'absolute',
      bottom: 120,
      alignSelf: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    welcomeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    welcomeDotActive: {
      backgroundColor: '#FFFFFF',
      width: 24,
    },
    welcomeSkip: {
      position: 'absolute',
      bottom: 60,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    welcomeSkipText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: '#FFFFFF',
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
            style={{ width: '100%', height: '100%', opacity: colors.watermarkOpacity }}
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
              <Image source={gearIcon} style={{ width: 26, height: 26 }} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        </View>

        {/* B. Personality banner */}
        <View style={[styles.banner, { borderLeftColor: bannerColorMap[bannerQuote.section] || colors.accent, backgroundColor: colors.mode === 'dark' ? hexToRgba(bannerColorMap[bannerQuote.section] || colors.accent, bgUri ? 0.35 : 0.12) : hexToRgba(bannerColorMap[bannerQuote.section] || colors.accent, bgUri ? 0.25 : 0.08) }]}>
          <Text style={[styles.bannerHeader, { color: bannerColorMap[bannerQuote.section] || colors.accent }]}>ALARM GUY SAYS</Text>
          <Text style={[styles.bannerQuote, bgUri && { color: colors.overlaySecondary }]}>{bannerQuote.text}</Text>
        </View>

        {/* C. Quick Capture */}
        <View style={styles.quickCaptureRow}>
          <TouchableOpacity
            style={[styles.quickCaptureBtn, { backgroundColor: colors.sectionNotepad + (bgUri ? '90' : '45') }]}
            onPress={() => { hapticLight(); navigation.navigate('Notepad', { newNote: true }); }}
            activeOpacity={0.7}
            accessibilityLabel="Quick Note"
            accessibilityRole="button"
          >
            <Text style={[styles.quickCaptureLabel, bgUri && { color: colors.overlayText }]}>Quick Note</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCaptureBtn, { backgroundColor: colors.sectionVoice + (bgUri ? '90' : '45') }]}
            onPress={() => {
              hapticLight();
              navigation.reset({
                index: 2,
                routes: [
                  { name: 'Home' },
                  { name: 'VoiceMemoList' },
                  { name: 'VoiceRecord' },
                ],
              });
            }}
            activeOpacity={0.7}
            accessibilityLabel="Quick Record"
            accessibilityRole="button"
          >
            <Text style={[styles.quickCaptureLabel, bgUri && { color: colors.overlayText }]}>Quick Record</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCaptureBtn, { backgroundColor: colors.sectionTimer + (bgUri ? '90' : '45') }]}
            onPress={() => { hapticLight(); navigation.navigate('Timers'); }}
            activeOpacity={0.7}
            accessibilityLabel="Quick Timer"
            accessibilityRole="button"
          >
            <Text style={[styles.quickCaptureLabel, bgUri && { color: colors.overlayText }]}>Quick Timer</Text>
          </TouchableOpacity>
        </View>

        {/* D. Section grid */}
        <View style={styles.grid}>
          {sections.map((section) => {
            const iconSource = sectionIconSources[section.key];
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
                    width: '31%',
                    flexBasis: '31%',
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
                <Text style={[styles.gridLabel, { color: (colors.mode === 'dark' || bgUri) ? colors.overlayText : colors.textPrimary }]}>{section.label}</Text>
                {subtitle !== '' && <Text style={[styles.gridSubtitle, { color: bgUri ? colors.overlaySecondary : colors.textSecondary }]}>{subtitle}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* D. Today section */}
        <Text style={[styles.todayHeader, bgUri && { color: colors.overlaySecondary }]}>TODAY {'\u2014'} {monthName} {dayNum}</Text>

        <View style={[styles.todayContainer, { backgroundColor: bgUri ? (colors.mode === 'dark' ? 'rgba(10, 10, 18, 0.88)' : 'rgba(242, 243, 248, 0.92)') : undefined }]}>
          {todayEvents.length === 0 ? (
            <Text style={styles.emptyToday}>{emptyLine}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {todayEvents.map((event, i) => {
                const isAllDayGoogle =
                  event.type === 'googleCal' && (event.data as GoogleCalendarEvent).isAllDay;
                const dotColor =
                  event.type === 'alarm'
                    ? colors.sectionAlarm
                    : event.type === 'reminder'
                    ? colors.sectionReminder
                    : colors.sectionCalendar;
                const typeLabel =
                  event.type === 'alarm' ? 'Alarm' : event.type === 'reminder' ? 'Reminder' : 'Google';
                const timeSuffix = isAllDayGoogle
                  ? ' \u00B7 All Day'
                  : event.time
                  ? ` \u00B7 ${formatTime(event.time, timeFormat)}`
                  : '';
                return (
                  <TouchableOpacity
                    key={`${event.type}-${i}`}
                    onPress={() => handleEventPress(event)}
                    activeOpacity={event.type === 'googleCal' ? 1 : 0.7}
                    style={styles.eventRow}
                    accessibilityLabel={`${event.title}, ${typeLabel}${timeSuffix}`}
                    accessibilityRole="button"
                  >
                    <View style={[styles.eventDot, { backgroundColor: dotColor }]} />
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.eventSub}>
                      {typeLabel}
                      {timeSuffix}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {showWelcome && (
        <View style={styles.welcomeOverlay}>
          <ScrollView
            ref={welcomeScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setWelcomeSlide(index);
            }}
            style={StyleSheet.absoluteFill}
            contentContainerStyle={styles.welcomeScrollContent}
          >
            {WELCOME_SLIDES.map((slide, i) => (
              <View key={i} style={[styles.welcomeSlide, { width: screenWidth }]}>
                {/* Character image on slide 0 */}
                {i === 0 && (
                  <Image
                    source={require('../../assets/adaptive-icon.png')}
                    style={styles.welcomeCharacter}
                    resizeMode="contain"
                  />
                )}

                {/* Icon row for slides 1-3 */}
                {i > 0 && (slide as any).icons && (
                  <View style={styles.welcomeIconRow}>
                    {((slide as any).icons as string[]).map((key: string) => {
                      const iconSource: Record<string, any> = {
                        alarm: alarmIcon,
                        stopwatch: stopwatchIcon,
                        bell: bellIcon,
                        calendar: calendarIcon,
                        notepad: notepadIcon,
                        microphone: microphoneIcon,
                        gear: gearIcon,
                        gamepad: gamepadIcon,
                      };
                      return iconSource[key] ? (
                        <Image
                          key={key}
                          source={iconSource[key]}
                          style={styles.welcomeIcon}
                          resizeMode="contain"
                        />
                      ) : null;
                    })}
                  </View>
                )}

                <Text style={styles.welcomeTitle}>{slide.title}</Text>
                <Text style={styles.welcomeSubtitle}>{slide.subtitle}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Dot indicators — positioned absolutely over the scroll */}
          <View style={styles.welcomeDots}>
            {WELCOME_SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.welcomeDot,
                  i === welcomeSlide && styles.welcomeDotActive,
                ]}
              />
            ))}
          </View>

          {/* Skip button — always visible */}
          <TouchableOpacity
            style={styles.welcomeSkip}
            onPress={() => dismissWelcomeRef.current?.()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
          >
            <Text style={styles.welcomeSkipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

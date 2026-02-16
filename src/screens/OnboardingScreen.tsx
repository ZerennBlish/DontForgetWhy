import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  AppState,
  Linking,
  NativeModules,
  Platform,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import notifee from '@notifee/react-native';
import * as Device from 'expo-device';
import { useTheme } from '../theme/ThemeContext';
import { setOnboardingComplete } from '../services/settings';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import { canUseFullScreenIntent, openFullScreenIntentSettings } from '../utils/fullScreenPermission';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideData {
  id: string;
  emoji: string;
  title: string;
  body: string;
  buttonLabel: string;
  isPermission?: boolean;
  permissionCheck?: () => Promise<boolean>;
  permissionRequest?: () => Promise<void>;
  afterReturnCheck?: () => Promise<boolean>;
  note?: string;
  instructions?: string[];
  secondaryText?: string;
  isFinal?: boolean;
}

function useSlides(startSlide: number) {
  const [notifGranted, setNotifGranted] = useState(false);
  const [exactAlarmGranted, setExactAlarmGranted] = useState(false);
  const [batteryOptDisabled, setBatteryOptDisabled] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [fullScreenGranted, setFullScreenGranted] = useState(false);
  const [isSamsung, setIsSamsung] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  useEffect(() => {
    (async () => {
      // Detect Samsung
      try {
        const brand = Device.brand?.toLowerCase() ?? '';
        const manufacturer = Device.manufacturer?.toLowerCase() ?? '';
        setIsSamsung(brand.includes('samsung') || manufacturer.includes('samsung'));
      } catch {
        setIsSamsung(false);
      }

      // Check current permission states
      try {
        const settings = await notifee.getNotificationSettings();
        const authOk = settings.authorizationStatus >= 1; // AUTHORIZED
        setNotifGranted(authOk);
      } catch {
        setNotifGranted(false);
      }

      try {
        const isOptimized = await notifee.isBatteryOptimizationEnabled();
        setBatteryOptDisabled(!isOptimized);
      } catch {
        setBatteryOptDisabled(false);
      }

      if (Platform.OS === 'android' && Platform.Version >= 31) {
        try {
          const settings = await notifee.getNotificationSettings();
          setExactAlarmGranted(settings.android?.alarm === 1);
        } catch {
          setExactAlarmGranted(false);
        }
      } else {
        setExactAlarmGranted(true);
      }

      try {
        const { canDisplayOverOtherApps } = NativeModules.OverlayPermission || {};
        if (canDisplayOverOtherApps) {
          const result = await canDisplayOverOtherApps();
          setOverlayGranted(result);
        }
      } catch {
        setOverlayGranted(false);
      }

      try {
        const fsiGranted = await canUseFullScreenIntent();
        setFullScreenGranted(fsiGranted);
      } catch {
        setFullScreenGranted(false);
      }

      setPermissionsChecked(true);
    })();
  }, []);

  const refreshPermissions = useCallback(async () => {
    try {
      const settings = await notifee.getNotificationSettings();
      setNotifGranted(settings.authorizationStatus >= 1);
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        setExactAlarmGranted(settings.android?.alarm === 1);
      }
    } catch {}

    try {
      const isOptimized = await notifee.isBatteryOptimizationEnabled();
      setBatteryOptDisabled(!isOptimized);
    } catch {}

    try {
      const { canDisplayOverOtherApps } = NativeModules.OverlayPermission || {};
      if (canDisplayOverOtherApps) {
        const result = await canDisplayOverOtherApps();
        setOverlayGranted(result);
      }
    } catch {}

    try {
      const fsiGranted = await canUseFullScreenIntent();
      setFullScreenGranted(fsiGranted);
    } catch {}
  }, []);

  const introSlides: SlideData[] = startSlide === 0 ? [
    {
      id: 'welcome',
      emoji: '\u{1F9E0}',
      title: 'Welcome to Don\'t Forget Why',
      body: 'This isn\'t just another alarm app. Every alarm, timer, and reminder asks you one simple question \u2014 do you actually remember why you set it?',
      buttonLabel: 'Next',
    },
    {
      id: 'whats-inside',
      emoji: '\u23F0\u{1F3AE}\u{1F4DD}',
      title: 'Alarms. Timers. Reminders. Games.',
      body: 'Set alarms with notes you\'ll forget. Start timers for everyday tasks. Create reminders for things you need to do. Then play brain games to prove your memory isn\'t as bad as we think it is.',
      buttonLabel: 'Next',
    },
  ] : [];

  const permissionSlides: SlideData[] = [
    {
      id: 'notifications',
      emoji: '\u{1F514}',
      title: 'Let Us Bug You',
      body: 'Without notification access, we literally can\'t remind you of anything. That\'s the whole app. Please say yes.',
      buttonLabel: notifGranted ? '\u2705 Notifications enabled' : 'Enable Notifications',
      isPermission: true,
      permissionCheck: async () => {
        try {
          const s = await notifee.getNotificationSettings();
          return s.authorizationStatus >= 1;
        } catch { return false; }
      },
      permissionRequest: async () => {
        try {
          await notifee.requestPermission();
        } catch {}
      },
    },
    {
      id: 'exact-alarms',
      emoji: '\u23F1\uFE0F',
      title: 'Precision Matters',
      body: 'Android needs your permission to fire alarms at the exact time you set. Without this, your 7:00 AM alarm might show up at 7:15. Helpful.',
      buttonLabel: exactAlarmGranted ? '\u2705 Exact alarms enabled' : 'Allow Exact Alarms',
      isPermission: true,
      note: 'Toggle the switch for Don\'t Forget Why, then come back here.',
      permissionCheck: async () => {
        if (Platform.OS === 'android' && Platform.Version >= 31) {
          try {
            const s = await notifee.getNotificationSettings();
            return s.android?.alarm === 1;
          } catch { return false; }
        }
        return true;
      },
      permissionRequest: async () => {
        try {
          await notifee.openAlarmPermissionSettings();
        } catch {
          try { await Linking.openSettings(); } catch {}
        }
      },
      afterReturnCheck: async () => {
        if (Platform.OS === 'android' && Platform.Version >= 31) {
          try {
            const s = await notifee.getNotificationSettings();
            return s.android?.alarm === 1;
          } catch { return false; }
        }
        return true;
      },
    },
    {
      id: 'battery',
      emoji: '\u{1F50B}',
      title: 'Don\'t Let Android Kill Us',
      body: 'This is the most important step. Android puts apps to sleep to save battery. If this app gets put to sleep, your alarms WILL NOT fire when the app is closed. This isn\'t optional if you want reliable alarms.',
      buttonLabel: batteryOptDisabled ? '\u2705 Battery optimization disabled' : 'Disable Battery Optimization',
      isPermission: true,
      note: 'Find Don\'t Forget Why and select \'Don\'t optimize\' or \'Unrestricted\'.',
      permissionRequest: async () => {
        try {
          await notifee.openBatteryOptimizationSettings();
        } catch {
          try { await Linking.openSettings(); } catch {}
        }
      },
      afterReturnCheck: async () => {
        try {
          const isOptimized = await notifee.isBatteryOptimizationEnabled();
          return !isOptimized;
        } catch { return false; }
      },
    },
  ];

  // Samsung DND slide — show on Samsung or all devices with a note
  const samsungSlide: SlideData = {
    id: 'samsung-dnd',
    emoji: '\u{1F319}',
    title: isSamsung ? 'One More Samsung Thing' : 'Do Not Disturb Setup',
    body: 'Samsung blocks alarm apps during Do Not Disturb by default. Follow these steps so your alarms still work in silent mode:',
    buttonLabel: 'Open Phone Settings',
    isPermission: true,
    instructions: [
      'Open your phone\'s Settings app (the gear icon)',
      'Tap Notifications',
      'Tap Do Not Disturb',
      'Scroll down and tap App notifications',
      'Find Don\'t Forget Why and turn it ON',
    ],
    secondaryText: 'Can\'t find it? It\'s okay \u2014 your alarms will still work normally. They just won\'t break through Do Not Disturb mode.',
    permissionRequest: async () => {
      try {
        await Linking.sendIntent('android.settings.ZEN_MODE_SETTINGS');
      } catch {
        try { await Linking.openSettings(); } catch {}
      }
    },
  };

  const fullScreenSlide: SlideData = {
    id: 'full-screen',
    emoji: '\u{1F6A8}',
    title: 'Full Screen Alarms',
    body: 'Your alarms need permission to light up your screen and appear over the lock screen. Without this, the screen stays black when an alarm goes off.',
    buttonLabel: fullScreenGranted ? '\u2705 Full screen enabled' : 'Open Settings',
    isPermission: true,
    instructions: [
      'Go to Settings \u203A Apps',
      'Tap Special app access',
      'Tap Full screen notifications',
      'Find Don\'t Forget Why and turn it ON',
    ],
    secondaryText: 'This lets your alarm wake your screen and show over the lock screen.',
    permissionCheck: async () => {
      try {
        return await canUseFullScreenIntent();
      } catch { return false; }
    },
    permissionRequest: async () => {
      try {
        await openFullScreenIntentSettings();
      } catch {
        try { await Linking.openSettings(); } catch {}
      }
    },
    afterReturnCheck: async () => {
      try {
        return await canUseFullScreenIntent();
      } catch { return false; }
    },
  };

  const overlaySlide: SlideData = {
    id: 'overlay',
    emoji: '\u{1F4F1}',
    title: 'Wake Up Call',
    body: 'To show alarms on your lock screen, Android needs permission to display over other apps. Otherwise you\'ll just hear the alarm with no way to dismiss it.',
    buttonLabel: overlayGranted ? '\u2705 Display over apps enabled' : 'Allow Display Over Apps',
    isPermission: true,
    note: 'Toggle on for Don\'t Forget Why.',
    permissionRequest: async () => {
      try {
        const pkg = 'package:' + (await NativeModules.AppInfo?.getPackageName?.() || 'com.dontforgetwhy');
        await Linking.openURL(pkg);
      } catch {
        try {
          await Linking.sendIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION');
        } catch {
          try { await Linking.openSettings(); } catch {}
        }
      }
    },
    afterReturnCheck: async () => {
      try {
        const { canDisplayOverOtherApps } = NativeModules.OverlayPermission || {};
        if (canDisplayOverOtherApps) {
          return await canDisplayOverOtherApps();
        }
      } catch {}
      return false;
    },
  };

  const finalSlide: SlideData = {
    id: 'done',
    emoji: '\u{1F389}',
    title: 'You\'re All Set',
    body: 'Now go set an alarm. We dare you to remember why tomorrow.',
    buttonLabel: 'Let\'s Go',
    isFinal: true,
  };

  const slides: SlideData[] = [
    ...introSlides,
    ...permissionSlides,
    ...(Platform.OS === 'android' ? [fullScreenSlide] : []),
    ...(isSamsung ? [samsungSlide] : []),
    overlaySlide,
    finalSlide,
  ];

  return {
    slides,
    permissionsChecked,
    refreshPermissions,
    notifGranted,
    exactAlarmGranted,
    batteryOptDisabled,
    fullScreenGranted,
    overlayGranted,
  };
}

export default function OnboardingScreen({ navigation, route }: Props) {
  const startSlide = route.params?.startSlide ?? 0;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skippedPermissions, setSkippedPermissions] = useState<string[]>([]);
  const appStateRef = useRef(AppState.currentState);
  const pendingReturnCheckRef = useRef<(() => Promise<void>) | null>(null);

  const {
    slides,
    permissionsChecked,
    refreshPermissions,
    notifGranted,
    exactAlarmGranted,
    batteryOptDisabled,
    fullScreenGranted,
    overlayGranted,
  } = useSlides(startSlide);

  // Listen for app returning from settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        await refreshPermissions();
        if (pendingReturnCheckRef.current) {
          await pendingReturnCheckRef.current();
          pendingReturnCheckRef.current = null;
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [refreshPermissions]);

  const goToNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, slides.length]);

  const handlePermissionButton = useCallback(async (slide: SlideData) => {
    // If already granted, just advance
    if (slide.permissionCheck) {
      try {
        const granted = await slide.permissionCheck();
        if (granted) {
          goToNext();
          return;
        }
      } catch {}
    }

    // For notification permission — uses system dialog, doesn't leave app
    if (slide.id === 'notifications') {
      if (slide.permissionRequest) {
        await slide.permissionRequest();
      }
      await refreshPermissions();
      goToNext();
      return;
    }

    // For permissions that open system settings
    if (slide.permissionRequest) {
      if (slide.afterReturnCheck) {
        const checkFn = slide.afterReturnCheck;
        pendingReturnCheckRef.current = async () => {
          try {
            const granted = await checkFn();
            if (granted) {
              await refreshPermissions();
            }
          } catch {}
        };
      }
      await slide.permissionRequest();
    }
  }, [goToNext, refreshPermissions]);

  const handleButtonPress = useCallback(async (slide: SlideData) => {
    if (slide.isFinal) {
      if (startSlide === 0) {
        await setOnboardingComplete();
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'AlarmList' }],
      });
      return;
    }

    if (slide.isPermission) {
      await handlePermissionButton(slide);
      return;
    }

    goToNext();
  }, [goToNext, handlePermissionButton, navigation, startSlide]);

  const handleSkip = useCallback((slide?: SlideData) => {
    const currentSlide = slide || slides[currentIndex];
    if (!currentSlide?.isPermission) {
      goToNext();
      return;
    }

    // Battery optimization skip gets a confirmation alert
    if (currentSlide.id === 'battery') {
      Alert.alert(
        '\u26A0\uFE0F Are You Sure?',
        'Without this, your alarms may not go off when the app is closed or your phone is idle. This is the #1 reason alarms fail on Android.',
        [
          {
            text: 'Set It Up',
            style: 'cancel',
          },
          {
            text: 'Skip Anyway',
            style: 'destructive',
            onPress: () => {
              setSkippedPermissions((prev) => [...prev, currentSlide.id]);
              goToNext();
            },
          },
        ],
      );
      return;
    }

    setSkippedPermissions((prev) => [...prev, currentSlide.id]);
    goToNext();
  }, [currentIndex, goToNext, slides]);

  // Determine dynamic button label based on live permission state
  const getButtonLabel = useCallback((slide: SlideData) => {
    if (slide.id === 'notifications' && notifGranted) return '\u2705 Notifications enabled';
    if (slide.id === 'exact-alarms' && exactAlarmGranted) return '\u2705 Exact alarms enabled';
    if (slide.id === 'battery' && batteryOptDisabled) return '\u2705 Battery optimization disabled';
    if (slide.id === 'full-screen' && fullScreenGranted) return '\u2705 Full screen enabled';
    if (slide.id === 'overlay' && overlayGranted) return '\u2705 Display over apps enabled';
    return slide.buttonLabel;
  }, [notifGranted, exactAlarmGranted, batteryOptDisabled, fullScreenGranted, overlayGranted]);

  const isGranted = useCallback((slide: SlideData) => {
    if (slide.id === 'notifications') return notifGranted;
    if (slide.id === 'exact-alarms') return exactAlarmGranted;
    if (slide.id === 'battery') return batteryOptDisabled;
    if (slide.id === 'full-screen') return fullScreenGranted;
    if (slide.id === 'overlay') return overlayGranted;
    return false;
  }, [notifGranted, exactAlarmGranted, batteryOptDisabled, fullScreenGranted, overlayGranted]);

  const batteryNotDone = !batteryOptDisabled;
  const otherSkippedCount = skippedPermissions.filter((p) => p !== 'battery').length;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    slide: {
      width: SCREEN_WIDTH,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingBottom: 100,
    },
    emoji: {
      fontSize: 64,
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
    },
    body: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 300,
      marginBottom: 32,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 32,
      width: '100%',
      maxWidth: 300,
      alignItems: 'center',
    },
    buttonGranted: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    note: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 12,
      maxWidth: 280,
      lineHeight: 18,
    },
    instructions: {
      alignSelf: 'center',
      maxWidth: 300,
      marginBottom: 24,
    },
    instructionStep: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 10,
    },
    secondaryText: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: 16,
      maxWidth: 280,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    skipButton: {
      marginTop: 16,
      paddingVertical: 8,
    },
    skipText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    dotContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 20 + insets.bottom,
      paddingTop: 12,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    dotActive: {
      backgroundColor: colors.accent,
      width: 24,
    },
    dotInactive: {
      backgroundColor: colors.border,
    },
    skippedNote: {
      fontSize: 13,
      color: colors.orange,
      textAlign: 'center',
      maxWidth: 280,
      marginBottom: 16,
      lineHeight: 18,
    },
    batteryWarning: {
      fontSize: 14,
      color: colors.red,
      textAlign: 'center',
      maxWidth: 300,
      marginBottom: 16,
      lineHeight: 20,
      fontWeight: '600',
    },
  }), [colors, insets.bottom]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      setCurrentIndex((prev) => {
        if (newIndex !== prev) hapticLight();
        return newIndex;
      });
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = useCallback(({ item: slide }: { item: SlideData }) => {
    const granted = slide.isPermission && isGranted(slide);
    const label = getButtonLabel(slide);

    return (
      <View style={styles.slide}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>

        {slide.instructions && (
          <View style={styles.instructions}>
            {slide.instructions.map((step, i) => (
              <Text key={i} style={styles.instructionStep}>
                {`${i + 1}. ${step}`}
              </Text>
            ))}
          </View>
        )}

        {slide.isFinal && batteryNotDone && (
          <Text style={styles.batteryWarning}>
            {'\u26A0\uFE0F'} Battery optimization was not disabled. Your alarms may not fire reliably. You can fix this anytime in Settings {'>'} Setup Guide.
          </Text>
        )}

        {slide.isFinal && otherSkippedCount > 0 && (
          <Text style={styles.skippedNote}>
            {batteryNotDone ? 'Other permissions were also skipped.' : 'Some permissions were skipped.'} You can set them up later in Settings.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, granted && styles.buttonGranted]}
          onPress={() => handleButtonPress(slide)}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>{label}</Text>
        </TouchableOpacity>

        {slide.note && !granted && (
          <Text style={styles.note}>{slide.note}</Text>
        )}

        {slide.secondaryText && (
          <Text style={styles.secondaryText}>{slide.secondaryText}</Text>
        )}

        {slide.isPermission && !slide.isFinal && (
          <TouchableOpacity onPress={() => handleSkip(slide)} style={styles.skipButton} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [styles, handleButtonPress, handleSkip, getButtonLabel, isGranted, batteryNotDone, otherSkippedCount]);

  if (!permissionsChecked) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
      <View style={styles.dotContainer}>
        {slides.map((slide, index) => (
          <View
            key={slide.id}
            style={[
              styles.dot,
              index === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

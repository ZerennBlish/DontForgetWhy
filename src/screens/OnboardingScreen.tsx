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
  Image,
  ImageSourcePropType,
  ViewToken,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import notifee from '@notifee/react-native';
import * as Device from 'expo-device';
import { requestRecordingPermissionsAsync, getRecordingPermissionsAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { themes, type ThemeName } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { setOnboardingComplete } from '../services/settings';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import { canUseFullScreenIntent, openFullScreenIntentSettings } from '../utils/fullScreenPermission';
import APP_ICONS from '../data/appIconAssets';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 500);

interface SlideData {
  id: string;
  icon?: React.ReactNode;
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
  skipWarning?: { title: string; message: string };
}

function useSlides(startSlide: number) {
  const [notifGranted, setNotifGranted] = useState(false);
  const [exactAlarmGranted, setExactAlarmGranted] = useState(false);
  const [batteryOptDisabled, setBatteryOptDisabled] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [fullScreenGranted, setFullScreenGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [cameraPhotosGranted, setCameraPhotosGranted] = useState(false);
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

      try {
        const { granted } = await getRecordingPermissionsAsync();
        setMicGranted(granted);
      } catch {
        setMicGranted(false);
      }

      try {
        const cam = await ImagePicker.getCameraPermissionsAsync();
        const lib = await ImagePicker.getMediaLibraryPermissionsAsync();
        setCameraPhotosGranted(cam.granted && lib.granted);
      } catch {
        setCameraPhotosGranted(false);
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

    try {
      const { granted } = await getRecordingPermissionsAsync();
      setMicGranted(granted);
    } catch {}

    try {
      const cam = await ImagePicker.getCameraPermissionsAsync();
      const lib = await ImagePicker.getMediaLibraryPermissionsAsync();
      setCameraPhotosGranted(cam.granted && lib.granted);
    } catch {}
  }, []);

  const introSlides: SlideData[] = startSlide === 0 ? [
    {
      id: 'welcome',
      title: 'Welcome to the app that judges you.',
      body: 'You set alarms, timers, reminders, and take notes. We make sure you remember why. Also there are brain games, because honestly you need the practice.',
      buttonLabel: 'Next',
    },
    {
      id: 'whats-inside',
      title: "Here's what you're working with.",
      body: "A home screen that keeps you organized. Voice memos. Drawing. Photo backgrounds. 6 themes. 4 home screen widgets. A sarcastic voice that comes with the alarms. No ads. No accounts. No tracking. Just you and your questionable memory.",
      buttonLabel: 'Next',
    },
  ] : [];

  const permissionSlides: SlideData[] = [
    {
      id: 'notifications',
      title: 'Let us bug you.',
      body: "Without notification access, we literally can't remind you of anything. That's the whole point of this app. Please say yes.",
      buttonLabel: notifGranted ? '\u2705 Notifications enabled' : 'Enable Notifications',
      isPermission: true,
      skipWarning: { title: 'Really?', message: "So you downloaded a reminder app and don't want to be reminded. Bold strategy." },
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
      title: "Your 7 AM alarm shouldn't show up at 7:15.",
      body: "Android needs your permission to fire alarms at the exact time you set. Without this, your alarms are more of a suggestion.",
      buttonLabel: exactAlarmGranted ? '\u2705 Exact alarms enabled' : 'Allow Exact Alarms',
      isPermission: true,
      note: "Toggle the switch for Don't Forget Why, then come back here.",
      skipWarning: { title: 'Approximate alarms it is.', message: "Your 7 AM alarm might show up around 7-ish. Maybe. We'll see how Android feels." },
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
      title: 'Android will kill us if you let it.',
      body: "This is the most important step. Android puts apps to sleep to save battery. If we get put to sleep, your alarms WILL NOT fire when the app is closed. This one actually matters.",
      buttonLabel: batteryOptDisabled ? '\u2705 Battery optimization disabled' : 'Disable Battery Optimization',
      isPermission: true,
      note: "Find Don't Forget Why and select 'Don't optimize' or 'Unrestricted'.",
      skipWarning: { title: 'This one actually matters.', message: "Without this, your alarms won't go off when the app is closed or your phone is idle. This is the #1 reason alarms fail on Android. Are you really, truly sure?" },
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

  const fullScreenSlide: SlideData = {
    id: 'full-screen',
    title: 'Let us wake your screen up too.',
    body: "Your alarms need permission to light up your screen and appear over the lock screen. Without this, the screen stays black when an alarm fires.",
    buttonLabel: fullScreenGranted ? '\u2705 Full screen enabled' : 'Open Settings',
    isPermission: true,
    instructions: [
      'Go to Settings \u203A Apps',
      'Tap Special app access',
      'Tap Full screen notifications',
      "Find Don't Forget Why and turn it ON",
    ],
    secondaryText: 'This lets your alarm wake your screen and show over the lock screen.',
    skipWarning: { title: 'Enjoy the darkness.', message: "Without this, your alarm fires and your screen just stays black. You'll hear it. You just can't dismiss it. Fun." },
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

  // Samsung DND slide — show on Samsung devices
  const samsungSlide: SlideData = {
    id: 'samsung-dnd',
    title: 'Samsung has trust issues.',
    body: 'Samsung blocks alarm apps during Do Not Disturb by default. Follow these steps so your alarms still work in silent mode:',
    buttonLabel: 'Open Phone Settings',
    isPermission: true,
    instructions: [
      "Open your phone's Settings app (the gear icon)",
      'Tap Notifications',
      'Tap Do Not Disturb',
      'Scroll down and tap App notifications',
      "Find Don't Forget Why and turn it ON",
    ],
    secondaryText: "Can't find it? It's okay \u2014 your alarms will still work normally. They just won't break through Do Not Disturb mode.",
    skipWarning: { title: 'Your phone, your rules.', message: "Just don't blame us when Do Not Disturb also means Do Not Alarm." },
    permissionRequest: async () => {
      try {
        await Linking.sendIntent('android.settings.ZEN_MODE_SETTINGS');
      } catch {
        try { await Linking.openSettings(); } catch {}
      }
    },
  };

  const overlaySlide: SlideData = {
    id: 'overlay',
    title: 'One more. We promise.',
    body: "To show alarms on your lock screen, Android needs permission to display over other apps. Otherwise you'll hear ringing with no way to make it stop.",
    buttonLabel: overlayGranted ? '\u2705 Display over apps enabled' : 'Allow Display Over Apps',
    isPermission: true,
    note: "Toggle on for Don't Forget Why.",
    skipWarning: { title: 'Sounds relaxing.', message: "Alarms can't show up over your lock screen. You'll hear ringing with no way to make it stop. Enjoy." },
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

  const microphoneSlide: SlideData = {
    id: 'microphone',
    title: 'We need to hear you.',
    body: "Voice memos let you record thoughts on the fly. The mic widget lets you start recording from your home screen. Without mic access, those features just sit there looking sad.",
    buttonLabel: micGranted ? '\u2705 Microphone enabled' : 'Allow Microphone',
    isPermission: true,
    skipWarning: { title: 'The mic will survive.', message: 'No mic access means no voice memos. The Record button will just sit there doing nothing.' },
    permissionCheck: async () => {
      try {
        const { granted } = await getRecordingPermissionsAsync();
        return granted;
      } catch { return false; }
    },
    permissionRequest: async () => {
      try {
        await requestRecordingPermissionsAsync();
      } catch {}
    },
  };

  const cameraPhotosSlide: SlideData = {
    id: 'camera-photos',
    title: 'And see your stuff.',
    body: "Photo backgrounds, note image attachments, and camera capture all need access to your camera and photo library. Without this, the app works fine \u2014 it just looks the same as everyone else's.",
    buttonLabel: cameraPhotosGranted ? '\u2705 Camera & photos enabled' : 'Allow Camera & Photos',
    isPermission: true,
    skipWarning: { title: 'Plain it is.', message: 'No camera or photo access means no custom backgrounds, no note images, no photo attachments. Functional, but boring.' },
    permissionCheck: async () => {
      try {
        const cam = await ImagePicker.getCameraPermissionsAsync();
        const lib = await ImagePicker.getMediaLibraryPermissionsAsync();
        return cam.granted && lib.granted;
      } catch { return false; }
    },
    permissionRequest: async () => {
      try {
        await ImagePicker.requestCameraPermissionsAsync();
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      } catch {}
    },
  };

  const finalSlide: SlideData = {
    id: 'done',
    title: 'Now go forget something.',
    body: "We'll be here when you do.",
    buttonLabel: "Let's Go",
    isFinal: true,
  };

  const slides: SlideData[] = [
    ...introSlides,
    ...permissionSlides,
    ...(Platform.OS === 'android' ? [fullScreenSlide] : []),
    ...(isSamsung ? [samsungSlide] : []),
    overlaySlide,
    microphoneSlide,
    cameraPhotosSlide,
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
    micGranted,
    cameraPhotosGranted,
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
    micGranted,
    cameraPhotosGranted,
  } = useSlides(startSlide);

  const THEME_ORDER: ThemeName[] = ['dark', 'light', 'highContrast', 'vivid', 'sunset', 'ruby'];
  const [previewTheme, setPreviewTheme] = useState<ThemeName>('dark');
  const shouldCycleThemes = startSlide === 0;
  const displayColors = shouldCycleThemes ? themes[previewTheme] : colors;

  const renderIcon = (slideId: string) => {
    const iconMap: Record<string, ImageSourcePropType> = {
      'welcome': APP_ICONS.gamepad,
      'whats-inside': APP_ICONS.house,
      'notifications': APP_ICONS.bell,
      'exact-alarms': APP_ICONS.alarm,
      'battery': APP_ICONS.warning,
      'full-screen': APP_ICONS.flame,
      'samsung-dnd': APP_ICONS.gear,
      'overlay': APP_ICONS.alarm,
      'microphone': APP_ICONS.microphone,
      'camera-photos': APP_ICONS.camera,
      'done': APP_ICONS.house,
    };
    const source = iconMap[slideId];
    if (!source) return null;
    return (
      <Image
        source={source}
        style={{ width: 48, height: 48 }}
        resizeMode="contain"
      />
    );
  };

  useEffect(() => {
    setSkippedPermissions((prev) => prev.filter((id) => {
      if (id === 'notifications' && notifGranted) return false;
      if (id === 'exact-alarms' && exactAlarmGranted) return false;
      if (id === 'battery' && batteryOptDisabled) return false;
      if (id === 'full-screen' && fullScreenGranted) return false;
      if (id === 'overlay' && overlayGranted) return false;
      if (id === 'microphone' && micGranted) return false;
      if (id === 'camera-photos' && cameraPhotosGranted) return false;
      return true;
    }));
  }, [notifGranted, exactAlarmGranted, batteryOptDisabled, fullScreenGranted, overlayGranted, micGranted, cameraPhotosGranted]);

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

    // For permissions that use system dialog (don't leave app)
    if (slide.id === 'notifications' || slide.id === 'microphone' || slide.id === 'camera-photos') {
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
        routes: [{ name: 'Home' }],
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

    if (currentSlide.skipWarning) {
      Alert.alert(
        currentSlide.skipWarning.title,
        currentSlide.skipWarning.message,
        [
          { text: 'Set It Up', style: 'cancel' },
          {
            text: 'Skip Anyway',
            style: currentSlide.id === 'battery' ? 'destructive' : 'default',
            onPress: () => {
              setSkippedPermissions((prev) =>
                prev.includes(currentSlide.id) ? prev : [...prev, currentSlide.id]
              );
              goToNext();
            },
          },
        ],
      );
      return;
    }

    setSkippedPermissions((prev) =>
      prev.includes(currentSlide.id) ? prev : [...prev, currentSlide.id]
    );
    goToNext();
  }, [currentIndex, goToNext, slides]);

  // Determine dynamic button label based on live permission state
  const getButtonLabel = useCallback((slide: SlideData) => {
    if (slide.id === 'notifications' && notifGranted) return '\u2705 Notifications enabled';
    if (slide.id === 'exact-alarms' && exactAlarmGranted) return '\u2705 Exact alarms enabled';
    if (slide.id === 'battery' && batteryOptDisabled) return '\u2705 Battery optimization disabled';
    if (slide.id === 'full-screen' && fullScreenGranted) return '\u2705 Full screen enabled';
    if (slide.id === 'overlay' && overlayGranted) return '\u2705 Display over apps enabled';
    if (slide.id === 'microphone' && micGranted) return '\u2705 Microphone enabled';
    if (slide.id === 'camera-photos' && cameraPhotosGranted) return '\u2705 Camera & photos enabled';
    return slide.buttonLabel;
  }, [notifGranted, exactAlarmGranted, batteryOptDisabled, fullScreenGranted, overlayGranted, micGranted, cameraPhotosGranted]);

  const isGranted = useCallback((slide: SlideData) => {
    if (slide.id === 'notifications') return notifGranted;
    if (slide.id === 'exact-alarms') return exactAlarmGranted;
    if (slide.id === 'battery') return batteryOptDisabled;
    if (slide.id === 'full-screen') return fullScreenGranted;
    if (slide.id === 'overlay') return overlayGranted;
    if (slide.id === 'microphone') return micGranted;
    if (slide.id === 'camera-photos') return cameraPhotosGranted;
    return false;
  }, [notifGranted, exactAlarmGranted, batteryOptDisabled, fullScreenGranted, overlayGranted, micGranted, cameraPhotosGranted]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: displayColors.background,
    },
    watermark: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
      opacity: displayColors.mode === 'dark' ? 0.15 : 0.06,
    },
    slide: {
      width: SCREEN_WIDTH,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingBottom: 100,
    },
    iconContainer: {
      marginBottom: 24,
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 20,
      fontFamily: FONTS.extraBold,
      color: displayColors.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
    },
    body: {
      fontSize: 15,
      fontFamily: FONTS.regular,
      color: displayColors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: CONTENT_MAX_WIDTH,
      marginBottom: 32,
    },
    button: {
      backgroundColor: displayColors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 32,
      width: '100%',
      maxWidth: CONTENT_MAX_WIDTH,
      alignItems: 'center',
    },
    buttonGranted: {
      backgroundColor: displayColors.card,
      borderWidth: 1,
      borderColor: displayColors.border,
    },
    buttonText: {
      fontSize: 15,
      fontFamily: FONTS.bold,
      color: displayColors.textPrimary,
    },
    note: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: displayColors.textTertiary,
      textAlign: 'center',
      marginTop: 12,
      maxWidth: CONTENT_MAX_WIDTH - 20,
      lineHeight: 18,
    },
    instructions: {
      alignSelf: 'center',
      maxWidth: CONTENT_MAX_WIDTH,
      marginBottom: 24,
    },
    instructionStep: {
      fontSize: 14,
      fontFamily: FONTS.regular,
      color: displayColors.textSecondary,
      lineHeight: 22,
      marginBottom: 10,
    },
    secondaryText: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: displayColors.textTertiary,
      textAlign: 'center',
      marginTop: 16,
      maxWidth: CONTENT_MAX_WIDTH - 20,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    skipButton: {
      marginTop: 16,
      paddingVertical: 8,
    },
    skipText: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: displayColors.textTertiary,
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
      backgroundColor: displayColors.accent,
      width: 24,
    },
    dotInactive: {
      backgroundColor: displayColors.border,
    },
    skippedNote: {
      fontSize: 12,
      fontFamily: FONTS.regular,
      color: displayColors.orange,
      textAlign: 'center',
      maxWidth: CONTENT_MAX_WIDTH - 20,
      marginBottom: 16,
      lineHeight: 18,
    },
    batteryWarning: {
      fontSize: 13,
      fontFamily: FONTS.semiBold,
      color: displayColors.red,
      textAlign: 'center',
      maxWidth: CONTENT_MAX_WIDTH,
      marginBottom: 16,
      lineHeight: 20,
    },
  }), [displayColors, insets.bottom]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      setCurrentIndex((prev) => {
        if (newIndex !== prev) hapticLight();
        return newIndex;
      });
      if (startSlide === 0) {
        setPreviewTheme(THEME_ORDER[newIndex % THEME_ORDER.length]);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = useCallback(({ item: slide }: { item: SlideData }) => {
    const granted = slide.isPermission && isGranted(slide);
    const label = getButtonLabel(slide);
    const icon = renderIcon(slide.id);

    let displayTitle = slide.title;
    let displayBody = slide.body;

    if (slide.isFinal) {
      const skipCount = skippedPermissions.length;
      if (skipCount === 0) {
        displayTitle = 'Now go forget something.';
        displayBody = "We'll be here when you do.";
      } else if (skipCount <= 2) {
        displayTitle = 'Almost ready.';
        displayBody = "We'll work with what we've got. Settings has a Setup Guide if you change your mind.";
      } else {
        displayTitle = 'You skipped half the setup.';
        displayBody = 'Brave. Settings has a Setup Guide for when reality hits.';
      }
    }

    const batteryNotDone = !batteryOptDisabled;
    const otherSkippedCount = skippedPermissions.filter((p) => p !== 'battery').length;

    return (
      <View style={styles.slide}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.body}>{displayBody}</Text>

        {slide.instructions && (
          <View style={styles.instructions}>
            {slide.instructions.map((step, i) => (
              <Text key={i} style={styles.instructionStep}>
                {`${i + 1}. ${step}`}
              </Text>
            ))}
          </View>
        )}

        {slide.isFinal && batteryNotDone && skippedPermissions.includes('battery') && (
          <Text style={styles.batteryWarning}>
            Battery optimization was not disabled. Your alarms may not fire reliably. You can fix this anytime in Settings {'>'} Setup Guide.
          </Text>
        )}

        {slide.isFinal && otherSkippedCount > 0 && (
          <Text style={styles.skippedNote}>
            {skippedPermissions.includes('battery') ? 'Other permissions were also skipped.' : 'Some permissions were skipped.'} You can set them up later in Settings.
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
  }, [styles, handleButtonPress, handleSkip, getButtonLabel, isGranted, batteryOptDisabled, skippedPermissions]);

  if (!permissionsChecked) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/fullscreenicon.webp')}
        style={styles.watermark}
        resizeMode="cover"
      />
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        extraData={previewTheme}
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
        removeClippedSubviews={true}
        windowSize={3}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
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

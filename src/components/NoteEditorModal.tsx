import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ToastAndroid,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  AppState,
  GestureResponderEvent,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, useAudioRecorderState, useAudioPlayer, useAudioPlayerStatus, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import { deleteVoiceMemo } from '../services/noteVoiceMemoStorage';
import { useTheme } from '../theme/ThemeContext';
import { FONTS } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { getTextColor } from '../utils/noteColors';
import { NOTE_COLORS, NOTE_FONT_COLORS } from '../types/note';
import type { Note } from '../types/note';
import BackButton from './BackButton';
import APP_ICONS from '../data/appIconAssets';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import DrawingCanvas from './DrawingCanvas';
import type { StrokeData } from './DrawingCanvas';
import ShareNoteModal from './ShareNoteModal';
import ImageLightbox from './ImageLightbox';
import { loadDrawingData } from '../services/noteImageStorage';
import { EDITOR_PLACEHOLDERS } from '../data/placeholders';
import { renderLinkedText } from '../utils/linkedText';
import { RecordingControls, MemoCard, voiceMemoStyles } from './NoteVoiceMemo';
import ColorPickerModal from './ColorPickerModal';

const MAX_NOTE_LENGTH = 999;

interface NoteEditorModalProps {
  visible: boolean;
  note: Note | null;
  customBgColor: string | null;
  customFontColor: string | null;
  onSave: (note: { text: string; color: string; fontColor: string | null; icon: string; isNew: boolean; noteId?: string; images: string[]; voiceMemos: string[] }) => void;
  onDelete: (noteId: string) => void;
  onClose: () => void;
  onCustomBgColorChange: (color: string) => void;
  onCustomFontColorChange: (color: string) => void;
  /**
   * Optional ref the editor writes to whenever its content diverges from
   * the loaded baseline. Parents use this to decide whether a widget
   * deep-link action can safely preempt the current editing session.
   */
  dirtyRef?: React.MutableRefObject<boolean>;
}

export default function NoteEditorModal({
  visible,
  note,
  customBgColor,
  customFontColor,
  onSave,
  onDelete,
  onClose,
  onCustomBgColorChange,
  onCustomFontColorChange,
  dirtyRef,
}: NoteEditorModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [editorText, setEditorText] = useState('');
  const [editorColor, setEditorColor] = useState(NOTE_COLORS[0]);
  const [editorIcon, setEditorIcon] = useState('');
  const [editorFontColor, setEditorFontColor] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editorPlaceholder, setEditorPlaceholder] = useState(EDITOR_PLACEHOLDERS[0]);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [editorImages, setEditorImages] = useState<string[]>([]);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [showDrawing, setShowDrawing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingDrawingData, setEditingDrawingData] = useState<{ strokes: StrokeData[]; bgColor: string; sourceImageUri?: string | null } | null>(null);
  const [editingImageUri, setEditingImageUri] = useState<string | null>(null);
  const [editorVoiceMemos, setEditorVoiceMemos] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activePlayerUri, setActivePlayerUri] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const pickedBgRef = useRef(customBgColor || '#4A90D9');
  const pickedFontRef = useRef(customFontColor || '#FF6B6B');
  const textInputRef = useRef<TextInput>(null);
  const newVoiceMemosRef = useRef<string[]>([]);
  const isRecordingRef = useRef(false);
  const progressBarWidthRef = useRef(0);
  const pendingPlayRef = useRef(false);

  // Baseline of editor content at load time. The load effect (below)
  // populates this synchronously from the source note/defaults, and a
  // separate watcher effect diffs current state against it to drive
  // dirtyRef. Using the source values — not React state, which hasn't
  // committed yet when the load effect sets it — keeps the baseline
  // accurate from the very first post-load render.
  const loadedSnapshotRef = useRef<string>('');

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);

  const player = useAudioPlayer(activePlayerUri ? { uri: activePlayerUri } : null);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!visible) {
      setShowColorPicker(false);
      setShowBgPicker(false);
      setShowFontPicker(false);
      setShowMenu(false);
      setLightboxUri(null);
      setShowDrawing(false);
      setShowShareModal(false);
      setEditingDrawingData(null);
      setEditingImageUri(null);
      if (isRecordingRef.current) {
        try { recorder.stop(); } catch { /* best-effort */ }
        isRecordingRef.current = false;
        setIsRecording(false);
      }
      try { player.pause(); } catch { /* best-effort */ }
      setActivePlayerUri(null);
      for (const uri of newVoiceMemosRef.current) {
        deleteVoiceMemo(uri);
      }
      newVoiceMemosRef.current = [];
      setEditorVoiceMemos([]);
      loadedSnapshotRef.current = '';
      if (dirtyRef) dirtyRef.current = false;
      return;
    }
    if (note) {
      setEditorText(note.text);
      setEditorColor(note.color);
      setEditorIcon(note.icon);
      setEditorFontColor(note.fontColor ?? null);
      setEditorImages(note.images || []);
      setEditorVoiceMemos(note.voiceMemos || []);
      setIsViewMode(true);
      loadedSnapshotRef.current = JSON.stringify({
        text: note.text,
        color: note.color,
        icon: note.icon,
        fontColor: note.fontColor ?? null,
        images: note.images || [],
        voiceMemos: note.voiceMemos || [],
      });
    } else {
      setEditorText('');
      setEditorColor(colors.background);
      setEditorIcon('');
      setEditorFontColor(null);
      setEditorImages([]);
      setEditorVoiceMemos([]);
      setIsViewMode(false);
      loadedSnapshotRef.current = JSON.stringify({
        text: '',
        color: colors.background,
        icon: '',
        fontColor: null,
        images: [] as string[],
        voiceMemos: [] as string[],
      });
    }
    if (dirtyRef) dirtyRef.current = false;
    newVoiceMemosRef.current = [];
    setActivePlayerUri(null);
    setIsRecording(false);
    isRecordingRef.current = false;
    setEditorPlaceholder(EDITOR_PLACEHOLDERS[Math.floor(Math.random() * EDITOR_PLACEHOLDERS.length)]);
    pickedBgRef.current = customBgColor || '#4A90D9';
    pickedFontRef.current = customFontColor || '#FF6B6B';
  }, [visible, note]);

  // Watch editor content and flip dirtyRef based on a diff against the
  // baseline snapshot captured in the load effect above. This uses a
  // real comparison rather than a one-way flag so typing and then
  // reverting drops dirty back to false.
  useEffect(() => {
    if (!visible) return;
    if (!dirtyRef) return;
    if (!loadedSnapshotRef.current) return;
    const current = JSON.stringify({
      text: editorText,
      color: editorColor,
      icon: editorIcon,
      fontColor: editorFontColor,
      images: editorImages,
      voiceMemos: editorVoiceMemos,
    });
    dirtyRef.current = current !== loadedSnapshotRef.current;
  }, [
    visible,
    editorText,
    editorColor,
    editorIcon,
    editorFontColor,
    editorImages,
    editorVoiceMemos,
    dirtyRef,
  ]);

  useEffect(() => {
    if (pendingPlayRef.current && playerStatus.isLoaded) {
      player.play();
      pendingPlayRef.current = false;
    }
  }, [playerStatus.isLoaded, player]);

  useEffect(() => {
    if (playerStatus.didJustFinish) {
      player.seekTo(0);
    }
  }, [playerStatus.didJustFinish, player]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && isRecordingRef.current) {
        try { recorder.stop(); } catch { /* best-effort */ }
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    });
    return () => sub.remove();
  }, [recorder]);

  const noteTextColor = getTextColor(editorColor);
  const resolvedFontColor = editorFontColor || noteTextColor;

  // View-mode link parser is expensive (regex scan + JSX building per match).
  // Memoize so it doesn't re-run on every recorder tick / unrelated re-render.
  const linkColor = useMemo(
    () => (noteTextColor === '#FFFFFF' ? '#48DBFB' : '#0066CC'),
    [noteTextColor],
  );

  const hasUnsavedChanges = (): boolean => {
    if (note) {
      return (
        editorText !== note.text ||
        editorColor !== note.color ||
        editorIcon !== note.icon ||
        editorFontColor !== (note.fontColor ?? null) ||
        JSON.stringify(editorImages) !== JSON.stringify(note.images || []) ||
        JSON.stringify(editorVoiceMemos) !== JSON.stringify(note.voiceMemos || []) ||
        isRecording
      );
    }
    return (
      editorText.trim().length > 0 ||
      editorColor !== colors.background ||
      editorIcon !== '' ||
      editorFontColor !== null ||
      editorImages.length > 0 ||
      editorVoiceMemos.length > 0 ||
      isRecording
    );
  };

  const confirmClose = () => {
    if (!hasUnsavedChanges()) {
      onClose();
      return;
    }
    Keyboard.dismiss();
    Alert.alert(
      'Leaving Already?',
      "You've got unsaved changes. Walk away and they're gone forever. Just like your memory.",
      [
        { text: 'Go Back to Editing', style: 'cancel' },
        { text: 'Abandon Note', style: 'destructive', onPress: onClose },
      ],
    );
  };

  const handleGoHome = () => {
    if (isRecording) {
      ToastAndroid.show('Stop recording first', ToastAndroid.SHORT);
      return;
    }
    if (!hasUnsavedChanges()) {
      onClose();
      navigation.navigate('Home');
      return;
    }
    Keyboard.dismiss();
    Alert.alert(
      'Leaving Already?',
      "You've got unsaved changes. Walk away and they're gone forever. Just like your memory.",
      [
        { text: 'Go Back to Editing', style: 'cancel' },
        {
          text: 'Abandon Note',
          style: 'destructive',
          onPress: () => {
            onClose();
            navigation.navigate('Home');
          },
        },
      ],
    );
  };

  const handleSave = () => {
    hapticMedium();
    if (isRecording) {
      ToastAndroid.show('Stop recording first', ToastAndroid.SHORT);
      return;
    }
    const trimmed = editorText.trim();
    if (!trimmed && editorImages.length === 0 && editorVoiceMemos.length === 0) {
      ToastAndroid.show('Write something down before you forget. Oh wait, too late.', ToastAndroid.LONG);
      return;
    }
    newVoiceMemosRef.current = [];
    onSave({
      text: trimmed,
      color: editorColor,
      fontColor: editorFontColor,
      icon: editorIcon,
      isNew: !note,
      noteId: note?.id,
      images: editorImages,
      voiceMemos: editorVoiceMemos,
    });
  };

  const handleDeleteFromEditor = () => {
    if (!note) return;
    onDelete(note.id);
  };

  const pickImage = async () => {
    Keyboard.dismiss();
    setShowColorPicker(false);
    if (editorImages.length + editorVoiceMemos.length >= 3) {
      ToastAndroid.show('3 attachments max. Delete one first.', ToastAndroid.SHORT);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setEditorImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    if (isRecording) {
      ToastAndroid.show('Stop recording first', ToastAndroid.SHORT);
      return;
    }
    if (editorImages.length + editorVoiceMemos.length >= 3) {
      ToastAndroid.show('3 attachments max. Delete one first.', ToastAndroid.SHORT);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      ToastAndroid.show('Camera permission needed', ToastAndroid.SHORT);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setEditorImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleMicPress = async () => {
    if (isRecording) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsPaused(false);
      try {
        await recorder.stop();
        const status = recorder.getStatus();
        const uri = status.url;
        if (uri) {
          setEditorVoiceMemos(prev => [...prev, uri]);
          newVoiceMemosRef.current.push(uri);
        }
      } catch (e) {
        console.error('Stop recording failed:', e);
      }
      return;
    }
    if (editorImages.length + editorVoiceMemos.length >= 3) {
      ToastAndroid.show('3 attachments max. Delete one first.', ToastAndroid.SHORT);
      return;
    }
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      ToastAndroid.show('Microphone permission needed', ToastAndroid.SHORT);
      return;
    }
    Keyboard.dismiss();
    setShowColorPicker(false);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (e) {
      console.error('Recording failed:', e);
      ToastAndroid.show('Recording failed', ToastAndroid.SHORT);
    }
  };

  const handlePauseToggle = () => {
    if (!isRecording) return;
    hapticLight();
    if (isPaused) {
      recorder.record();
      setIsPaused(false);
    } else {
      recorder.pause();
      setIsPaused(true);
    }
  };

  const handlePlayMemo = (uri: string) => {
    if (activePlayerUri === uri) {
      if (playerStatus.playing) {
        player.pause();
      } else {
        player.play();
      }
    } else {
      pendingPlayRef.current = true;
      setActivePlayerUri(uri);
    }
  };

  const handleSeek = (e: GestureResponderEvent, duration: number) => {
    if (duration <= 0 || progressBarWidthRef.current <= 0) return;
    const x = e.nativeEvent.locationX;
    const fraction = Math.max(0, Math.min(1, x / progressBarWidthRef.current));
    player.seekTo(fraction * duration);
  };

  const styles = useMemo(() => StyleSheet.create({
    editorContainer: {
      flex: 1,
    },
    editorTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    topBarLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    topBarCenter: {
      flex: 1,
      alignItems: 'center',
    },
    topBarRight: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
    },
    topBarContentPad: {
      height: insets.top + 58,
    },
    editorTopBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    },
    editorTopBtnActive: {
      borderColor: colors.accent,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.85)' : 'rgba(0, 0, 0, 0.10)',
    },
    editorTrashBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.red,
    },
    editorInputArea: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    editorInput: {
      flex: 1,
      fontSize: 18,
      color: colors.textPrimary,
      textAlignVertical: 'top',
      lineHeight: 28,
    },
    charCount: {
      fontSize: 11,
      fontFamily: FONTS.regular,
      color: colors.textTertiary,
      textAlign: 'right',
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    pickerOverlay: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12 + insets.bottom,
      maxHeight: 280,
    },
    colorRow: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    },
    colorDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorDotSelected: {
      borderWidth: 3,
      borderColor: colors.textPrimary,
    },
    colorCheck: {
      fontSize: 16,
      color: '#FFFFFF',
      fontFamily: FONTS.bold,
    },
    fontColorRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
      marginTop: 12,
    },
    fontColorDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fontColorDotSelected: {
      borderWidth: 2.5,
      borderColor: colors.textPrimary,
    },
    fontColorCheck: {
      fontSize: 12,
      fontFamily: FONTS.bold,
    },
    pickerRowLabel: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      marginBottom: 6,
    },
    dropdownMenu: {
      position: 'absolute',
      top: insets.top + 56,
      right: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 4,
      minWidth: 160,
      zIndex: 100,
      elevation: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    dropdownText: {
      fontSize: 14,
      fontFamily: FONTS.semiBold,
      color: colors.textPrimary,
    },
    thumbnailRow: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: insets.bottom + 12,
    },
    thumbnail: {
      width: 80,
      height: 80,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    thumbnailRemove: {
      position: 'absolute',
      top: 2,
      right: 10,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [colors, insets.top, insets.bottom]);

  // Memoize the parsed linked text used in view mode. Without this, every
  // recorder tick or unrelated re-render re-runs the regex parser. We
  // short-circuit when not in view mode so edit-mode keystrokes don't pay
  // for output that's never used.
  const linkedTextContent = useMemo(() => {
    if (!isViewMode) return null;
    return renderLinkedText(
      editorText,
      [styles.editorInput, { color: resolvedFontColor }],
      linkColor,
    );
  }, [isViewMode, editorText, styles.editorInput, resolvedFontColor, linkColor]);

  return (
    <>
      {/* Editor Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={confirmClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView style={[styles.editorContainer, { backgroundColor: editorColor }]} contentContainerStyle={{ flex: 1 }} keyboardShouldPersistTaps="handled" scrollEnabled={false} accessibilityViewIsModal={true}>

          {/* Top bar */}
          <View style={styles.editorTopBar}>
            {isViewMode ? (
              <>
                <View style={styles.topBarLeft}>
                  <BackButton onPress={confirmClose} />
                  <TouchableOpacity
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      justifyContent: 'center', alignItems: 'center',
                      borderWidth: 1, marginLeft: 4,
                      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
                      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                    }}
                    onPress={handleGoHome}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Go to home screen"
                  >
                    <Image source={APP_ICONS.house} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
                <View style={styles.topBarCenter} />
                <View style={styles.topBarRight}>
                  <TouchableOpacity
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
                      borderWidth: 1,
                      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                    }}
                    onPress={() => { hapticLight(); setIsViewMode(false); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Edit note"
                  >
                    <Image source={APP_ICONS.edit} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editorTopBtn}
                    onPress={() => {
                      hapticLight();
                      const hasText = !!editorText.trim();
                      const hasImages = editorImages.length > 0;
                      if (!hasText && !hasImages) {
                        ToastAndroid.show('Nothing to share', ToastAndroid.SHORT);
                        return;
                      }
                      setShowShareModal(true);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Share note"
                  >
                    <Image source={APP_ICONS.share} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  </TouchableOpacity>
                  {note && (
                    <TouchableOpacity
                      style={styles.editorTrashBtn}
                      onPress={handleDeleteFromEditor}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Delete note"
                    >
                      <Image source={APP_ICONS.trash} style={{ width: 18, height: 18 }} resizeMode="contain" />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.topBarLeft}>
                  <BackButton onPress={confirmClose} />
                  <TouchableOpacity
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      justifyContent: 'center', alignItems: 'center',
                      borderWidth: 1, marginLeft: 4,
                      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.15)',
                      borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                    }}
                    onPress={handleGoHome}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Go to home screen"
                  >
                    <Image source={APP_ICONS.house} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
                <View style={styles.topBarCenter} />
                <View style={styles.topBarRight}>
                  {hasUnsavedChanges() ? (
                    <TouchableOpacity
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(0, 0, 0, 0.15)',
                        borderWidth: 1,
                        borderColor: colors.accent,
                      }}
                      onPress={handleSave}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Save note"
                    >
                      <Image source={APP_ICONS.save} style={{ width: 18, height: 18 }} resizeMode="contain" />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.editorTopBtn, showMenu && styles.editorTopBtnActive]}
                    onPress={() => {
                      hapticLight();
                      Keyboard.dismiss();
                      setShowColorPicker(false);
                      setShowMenu((v) => !v);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Attachment menu"
                  >
                    <Image source={APP_ICONS.plus} style={{ width: 24, height: 24 }} resizeMode="contain" />
                  </TouchableOpacity>
                  {note && (
                    <TouchableOpacity
                      style={styles.editorTrashBtn}
                      onPress={handleDeleteFromEditor}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Delete note"
                    >
                      <Image source={APP_ICONS.trash} style={{ width: 18, height: 18 }} resizeMode="contain" />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Dropdown menu */}
          {showMenu && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  hapticLight();
                  setShowMenu(false);
                  Keyboard.dismiss();
                  setShowColorPicker((v) => !v);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Note colors"
              >
                <Image source={APP_ICONS.palette} style={{ width: 26, height: 26, marginLeft: -4 }} resizeMode="contain" />
                <Text style={styles.dropdownText}>Colors</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  hapticLight();
                  setShowMenu(false);
                  pickImage();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Add photo from gallery"
              >
                <Image source={APP_ICONS.image} style={{ width: 18, height: 18 }} resizeMode="contain" />
                <Text style={styles.dropdownText}>Photo Library</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  hapticLight();
                  setShowMenu(false);
                  takePhoto();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Take photo"
              >
                <Image source={APP_ICONS.camera} style={{ width: 18, height: 18 }} resizeMode="contain" />
                <Text style={styles.dropdownText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  hapticLight();
                  setShowMenu(false);
                  Keyboard.dismiss();
                  setShowColorPicker(false);
                  if (editorImages.length + editorVoiceMemos.length >= 3) {
                    ToastAndroid.show('3 attachments max. Delete one first.', ToastAndroid.SHORT);
                    return;
                  }
                  setShowDrawing(true);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Add drawing"
              >
                <Image source={APP_ICONS.paintbrush} style={{ width: 18, height: 18 }} resizeMode="contain" />
                <Text style={styles.dropdownText}>Draw</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dropdownItem, isRecording && { backgroundColor: 'rgba(255, 50, 50, 0.15)' }]}
                onPress={() => {
                  hapticLight();
                  setShowMenu(false);
                  handleMicPress();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Record voice memo"
              >
                <Image source={APP_ICONS.microphone} style={{ width: 18, height: 18 }} resizeMode="contain" />
                <Text style={styles.dropdownText}>{isRecording ? 'Stop Recording' : 'Record'}</Text>
                {isRecording && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3333', marginLeft: 6 }} />}
              </TouchableOpacity>
            </View>
          )}

          {/* Spacer so content clears the floating top bar */}
          <View style={styles.topBarContentPad} />

          {isRecording && (
            <RecordingControls
              isPaused={isPaused}
              durationMillis={recorderState.durationMillis ?? 0}
              onPauseToggle={handlePauseToggle}
              onStop={handleMicPress}
              recordingColor={colors.red}
              successColor={colors.success}
            />
          )}

          {/* Hero text area */}
          {isViewMode ? (
            <ScrollView style={styles.editorInputArea} contentContainerStyle={{ paddingBottom: 20 }}>
              {editorIcon ? <Text style={{ fontSize: 28, marginBottom: 8 }}>{editorIcon}</Text> : null}
              <Text style={[styles.editorInput, { color: resolvedFontColor }]}>
                {linkedTextContent}
              </Text>
            </ScrollView>
          ) : (
            <View style={styles.editorInputArea}>
              <TextInput
                ref={textInputRef}
                style={[styles.editorInput, { color: resolvedFontColor }]}
                value={editorText}
                onChangeText={setEditorText}
                placeholder={editorPlaceholder}
                placeholderTextColor={resolvedFontColor + '80'}
                multiline
                maxLength={MAX_NOTE_LENGTH}
                textAlignVertical="top"
                autoFocus={!note}
                onFocus={() => {
                  setShowColorPicker(false);
                  setShowMenu(false);
                }}
              />
            </View>
          )}

          {editorImages.length > 0 && (
            <View style={styles.thumbnailRow}>
              {editorImages.map((uri, idx) => (
                <TouchableOpacity key={`${uri}-${idx}`} onPress={async () => {
                  const drawingData = await loadDrawingData(uri);
                  if (drawingData) {
                    Alert.alert('Drawing', '', [
                      { text: 'View', onPress: () => setLightboxUri(uri) },
                      { text: 'Edit', onPress: () => {
                        setEditingDrawingData(drawingData);
                        setEditingImageUri(uri);
                        setShowDrawing(true);
                      }},
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  } else {
                    if (isViewMode) {
                      setLightboxUri(uri);
                    } else {
                      Alert.alert('Photo', '', [
                        { text: 'View', onPress: () => setLightboxUri(uri) },
                        { text: 'Draw On', onPress: () => {
                          setEditingDrawingData(null);
                          setEditingImageUri(uri);
                          setShowDrawing(true);
                        }},
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }
                  }
                }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="View image">
                  <Image source={{ uri }} style={styles.thumbnail} resizeMethod="resize" />
                  {!isViewMode && (
                    <TouchableOpacity
                      style={styles.thumbnailRemove}
                      onPress={() => {
                        hapticLight();
                        setEditorImages((imgs) => imgs.filter((_, i) => i !== idx));
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Remove image"
                    >
                      <Image source={APP_ICONS.closeX} style={{ width: 10, height: 10 }} resizeMode="contain" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {editorVoiceMemos.length > 0 && (
            <View style={[voiceMemoStyles.memoRow, { paddingBottom: 8 + insets.bottom }]}>
              {editorVoiceMemos.map((memoUri, idx) => {
                const isActive = activePlayerUri === memoUri;
                return (
                  <MemoCard
                    key={`memo-${idx}`}
                    isActive={isActive}
                    isPlaying={isActive && playerStatus.playing}
                    currentTime={isActive ? playerStatus.currentTime : 0}
                    duration={isActive && playerStatus.duration > 0 ? playerStatus.duration : 0}
                    accentColor={colors.accent}
                    isViewMode={isViewMode}
                    onPlay={() => handlePlayMemo(memoUri)}
                    onSeek={(e, dur) => handleSeek(e, dur)}
                    onDelete={() => {
                      hapticLight();
                      if (activePlayerUri === memoUri) {
                        try { player.pause(); } catch { /* */ }
                        setActivePlayerUri(null);
                      }
                      setEditorVoiceMemos(prev => prev.filter((_, i) => i !== idx));
                    }}
                    onProgressLayout={(w) => { progressBarWidthRef.current = w; }}
                  />
                );
              })}
            </View>
          )}

          {!isViewMode && (
            <Text style={[
              styles.charCount,
              { color: resolvedFontColor + '99' },
              editorText.length >= 490 ? { color: colors.red } :
              editorText.length >= 450 ? { color: colors.orange } : undefined,
            ]}>{editorText.length}/{MAX_NOTE_LENGTH}</Text>
          )}

          {/* Color picker overlay */}
          {showColorPicker && (
            <View style={[styles.pickerOverlay, { backgroundColor: editorColor, borderTopColor: noteTextColor + '20' }]}>
              <Text style={[styles.pickerRowLabel, { color: noteTextColor + '99' }]}>Background</Text>
              <View style={styles.colorRow}>
                {NOTE_COLORS.filter((c) => c !== 'custom').map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      editorColor === c && styles.colorDotSelected,
                    ]}
                    onPress={() => { hapticLight(); setEditorColor(c); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Background color ${c}`}
                    accessibilityState={{ selected: editorColor === c }}
                  >
                    {editorColor === c && <Text style={[styles.colorCheck, { color: getTextColor(c) }]}>{'\u2713'}</Text>}
                  </TouchableOpacity>
                ))}
                {/* Custom color slot */}
                {(() => {
                  const isCustomBgSelected = !!customBgColor && editorColor === customBgColor && !NOTE_COLORS.slice(0, -1).includes(editorColor);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.colorDot,
                        customBgColor
                          ? { backgroundColor: customBgColor }
                          : { borderWidth: 2, borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)', borderStyle: 'dashed' as const, backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.5)' : 'rgba(0, 0, 0, 0.04)' },
                        isCustomBgSelected && styles.colorDotSelected,
                      ]}
                      onPress={() => {
                        hapticLight();
                        if (customBgColor) {
                          setEditorColor(customBgColor);
                        } else {
                          pickedBgRef.current = '#4A90D9';
                          setShowBgPicker(true);
                        }
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Custom background color"
                      accessibilityState={{ selected: isCustomBgSelected }}
                    >
                      {isCustomBgSelected && <Text style={[styles.colorCheck, { color: getTextColor(customBgColor!) }]}>{'\u2713'}</Text>}
                    </TouchableOpacity>
                  );
                })()}
                {/* Picker button */}
                <TouchableOpacity
                  style={[styles.colorDot, { borderWidth: 1, borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)', backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)' }]}
                  onPress={() => {
                    hapticLight();
                    pickedBgRef.current = customBgColor || '#4A90D9';
                    setShowBgPicker(true);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Add custom background color"
                >
                  <Image source={APP_ICONS.plus} style={{ width: 24, height: 24 }} resizeMode="contain" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.pickerRowLabel, { color: resolvedFontColor, marginTop: 14 }]}>A  Text Color</Text>
              <View style={styles.fontColorRow}>
                {NOTE_FONT_COLORS.filter((fc) => fc !== 'custom').map((fc) => {
                  const isAuto = fc === 'auto';
                  const isSelected = isAuto ? !editorFontColor : editorFontColor === fc;
                  const dotBg = isAuto ? undefined : fc;
                  return (
                    <TouchableOpacity
                      key={fc}
                      style={[
                        styles.fontColorDot,
                        isAuto ? { borderWidth: 1.5, borderColor: noteTextColor + '50', overflow: 'hidden' as const } : { backgroundColor: dotBg },
                        isSelected && styles.fontColorDotSelected,
                      ]}
                      onPress={() => { hapticLight(); setEditorFontColor(isAuto ? null : fc); }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={isAuto ? 'Automatic text color' : `Text color ${fc}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      {isAuto ? (
                        <View style={{ flexDirection: 'row', flex: 1, width: '100%', height: '100%' }}>
                          <View style={{ flex: 1, backgroundColor: '#1A1A2E' }} />
                          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
                        </View>
                      ) : isSelected ? (
                        <Text style={[styles.fontColorCheck, { color: getTextColor(fc) }]}>{'\u2713'}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
                {/* Custom font color slot */}
                {(() => {
                  const isCustomFcSelected = !!customFontColor && editorFontColor === customFontColor && !NOTE_FONT_COLORS.slice(0, -1).filter(x => x !== 'auto').includes(editorFontColor!);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.fontColorDot,
                        customFontColor
                          ? { backgroundColor: customFontColor }
                          : { borderWidth: 1.5, borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)', borderStyle: 'dashed' as const, backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.5)' : 'rgba(0, 0, 0, 0.04)' },
                        isCustomFcSelected && styles.fontColorDotSelected,
                      ]}
                      onPress={() => {
                        hapticLight();
                        if (customFontColor) {
                          setEditorFontColor(customFontColor);
                        } else {
                          pickedFontRef.current = '#FF6B6B';
                          setShowFontPicker(true);
                        }
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Custom text color"
                      accessibilityState={{ selected: isCustomFcSelected }}
                    >
                      {isCustomFcSelected && <Text style={[styles.fontColorCheck, { color: getTextColor(customFontColor!) }]}>{'\u2713'}</Text>}
                    </TouchableOpacity>
                  );
                })()}
                {/* Font picker button */}
                <TouchableOpacity
                  style={[styles.fontColorDot, { borderWidth: 1, borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)', backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)' }]}
                  onPress={() => {
                    hapticLight();
                    pickedFontRef.current = customFontColor || '#FF6B6B';
                    setShowFontPicker(true);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Add custom text color"
                >
                  <Image source={APP_ICONS.plus} style={{ width: 20, height: 20 }} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            </View>
          )}


        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <ColorPickerModal
        visible={showBgPicker}
        title="Pick Background Color"
        initialColor={pickedBgRef.current}
        onApply={(hex) => {
          onCustomBgColorChange(hex);
          setEditorColor(hex);
          setShowBgPicker(false);
        }}
        onCancel={() => setShowBgPicker(false)}
      />

      <ColorPickerModal
        visible={showFontPicker}
        title="Pick Text Color"
        initialColor={pickedFontRef.current}
        onApply={(hex) => {
          onCustomFontColorChange(hex);
          setEditorFontColor(hex);
          setShowFontPicker(false);
        }}
        onCancel={() => setShowFontPicker(false)}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        visible={!!lightboxUri}
        imageUri={lightboxUri}
        onClose={() => setLightboxUri(null)}
      />

      {/* Share Modal */}
      <ShareNoteModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        noteText={editorText}
        noteIcon={editorIcon}
        noteImages={editorImages}
      />

      {/* Drawing Canvas */}
      <DrawingCanvas
        visible={showDrawing}
        backgroundImageUri={editingImageUri && !editingDrawingData ? editingImageUri : (editingDrawingData?.sourceImageUri || null)}
        initialBackgroundImageUri={editingDrawingData?.sourceImageUri || null}
        onSave={(imageUri: string) => {
          if (editingImageUri) {
            setEditorImages((prev) => prev.map((uri) => uri === editingImageUri ? imageUri : uri));
            setShowDrawing(false);
            setEditingDrawingData(null);
            setEditingImageUri(null);
            ToastAndroid.show('Drawing updated!', ToastAndroid.SHORT);
          } else {
            setEditorImages((prev) => [...prev, imageUri]);
            setShowDrawing(false);
            ToastAndroid.show('Drawing saved!', ToastAndroid.SHORT);
          }
        }}
        onCancel={() => {
          setShowDrawing(false);
          setEditingDrawingData(null);
          setEditingImageUri(null);
        }}
        initialStrokes={editingDrawingData?.strokes}
        initialBgColor={editingDrawingData?.bgColor}
        editingImageUri={editingImageUri}
      />
    </>
  );
}

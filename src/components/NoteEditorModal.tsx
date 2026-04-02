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
  Linking,
  Image,
  AppState,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, useAudioRecorderState, useAudioPlayer, useAudioPlayerStatus, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import { deleteVoiceMemo } from '../services/noteVoiceMemoStorage';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { getTextColor } from '../utils/noteColors';
import { NOTE_COLORS, NOTE_FONT_COLORS } from '../types/note';
import type { Note } from '../types/note';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import BackButton from './BackButton';
import { ImageIcon, CameraIcon, PaintBrushIcon, MicIcon, ShareIcon, TrashIcon } from './Icons';
import DrawingCanvas from './DrawingCanvas';
import type { StrokeData } from './DrawingCanvas';
import ShareNoteModal from './ShareNoteModal';
import ImageLightbox from './ImageLightbox';
import { loadDrawingData } from '../services/noteImageStorage';
import { EDITOR_PLACEHOLDERS } from '../data/placeholders';

const MAX_NOTE_LENGTH = 999;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const voiceMemoStyles = StyleSheet.create({
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  recordingDot: {
    fontSize: 10,
  },
  recordingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF4444',
  },
  memoRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  memoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 30, 0.85)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  memoPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoPlayText: {
    fontSize: 16,
  },
  memoProgress: {
    flex: 1,
    gap: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  memoTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  memoDeleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoDeleteText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
  },
});

const LINK_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)|([\w.-]+@[\w.-]+\.\w{2,})|((\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;

function renderLinkedText(
  text: string,
  baseStyle: StyleProp<TextStyle>,
  linkColor: string,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(LINK_REGEX.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`t-${lastIndex}`} style={baseStyle}>
          {text.substring(lastIndex, match.index)}
        </Text>,
      );
    }

    let matched = match[0];
    let url: string;
    if (match[1]) {
      const trimmed = matched.replace(/[.,!?)\]]+$/, '');
      if (trimmed.length < matched.length) {
        regex.lastIndex -= matched.length - trimmed.length;
        matched = trimmed;
      }
      url = /^https?:\/\//i.test(matched) ? matched : `https://${matched}`;
    } else if (match[2]) {
      url = `mailto:${matched}`;
    } else {
      url = `tel:${matched.replace(/[^\d+]/g, '')}`;
    }

    parts.push(
      <Text
        key={`l-${match.index}`}
        style={[baseStyle, { color: linkColor, textDecorationLine: 'underline' as const }]}
        onPress={() => Linking.openURL(url).catch(() => {})}
      >
        {matched}
      </Text>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-${lastIndex}`} style={baseStyle}>
        {text.substring(lastIndex)}
      </Text>,
    );
  }

  return parts.length > 0 ? parts : [<Text key="full" style={baseStyle}>{text}</Text>];
}

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
}: NoteEditorModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
  const [activePlayerUri, setActivePlayerUri] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const pickedBgRef = useRef(customBgColor || '#4A90D9');
  const pickedFontRef = useRef(customFontColor || '#FF6B6B');
  const textInputRef = useRef<TextInput>(null);
  const newVoiceMemosRef = useRef<string[]>([]);
  const isRecordingRef = useRef(false);
  const progressBarWidthRef = useRef(0);
  const pendingPlayRef = useRef(false);

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
    } else {
      setEditorText('');
      setEditorColor(colors.background);
      setEditorIcon('');
      setEditorFontColor(null);
      setEditorImages([]);
      setEditorVoiceMemos([]);
      setIsViewMode(false);
    }
    newVoiceMemosRef.current = [];
    setActivePlayerUri(null);
    setIsRecording(false);
    isRecordingRef.current = false;
    setEditorPlaceholder(EDITOR_PLACEHOLDERS[Math.floor(Math.random() * EDITOR_PLACEHOLDERS.length)]);
    pickedBgRef.current = customBgColor || '#4A90D9';
    pickedFontRef.current = customFontColor || '#FF6B6B';
  }, [visible, note]);

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

  const handleSeek = (e: any, duration: number) => {
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
    editorTopBtnEmoji: {
      fontSize: 18,
    },
    editorColorIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    editorTrashBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.red + '40',
    },
    editorTrashIconWrap: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
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
    pickerTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      marginBottom: 10,
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
      fontWeight: '700',
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
      fontWeight: '700',
    },
    pickerRowLabel: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 6,
    },
    cpOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    cpCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cpTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 20,
    },
    cpWrapper: {
      gap: 16,
    },
    cpBtns: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    cpCancelBtn: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cpCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    cpSaveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    cpSaveText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
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
    dropdownDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    dropdownText: {
      fontSize: 15,
      fontWeight: '500',
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
    thumbnailRemoveText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
  }), [colors, insets.top, insets.bottom]);

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
        <ScrollView style={[styles.editorContainer, { backgroundColor: editorColor }]} contentContainerStyle={{ flex: 1 }} keyboardShouldPersistTaps="handled" scrollEnabled={false}>

          {/* Top bar */}
          <View style={styles.editorTopBar}>
            {isViewMode ? (
              <>
                <View style={styles.topBarLeft}>
                  <BackButton onPress={confirmClose} />
                </View>
                <View style={styles.topBarCenter} />
                <View style={styles.topBarRight}>
                  <TouchableOpacity
                    style={styles.editorTopBtn}
                    onPress={() => { hapticLight(); setIsViewMode(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>Edit</Text>
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
                  >
                    <ShareIcon color={colors.textPrimary} size={18} />
                  </TouchableOpacity>
                  {note && (
                    <TouchableOpacity
                      style={styles.editorTrashBtn}
                      onPress={handleDeleteFromEditor}
                      activeOpacity={0.7}
                    >
                      <TrashIcon color={colors.red} size={18} />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.topBarLeft}>
                  <BackButton onPress={confirmClose} />
                </View>
                <View style={styles.topBarCenter}>
                  <TouchableOpacity
                    style={{ backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 }}
                    onPress={handleSave}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Save</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.topBarRight}>
                  <TouchableOpacity
                    style={[styles.editorTopBtn, showMenu && styles.editorTopBtnActive]}
                    onPress={() => {
                      hapticLight();
                      Keyboard.dismiss();
                      setShowColorPicker(false);
                      setShowMenu((v) => !v);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textPrimary }}>+</Text>
                  </TouchableOpacity>
                  {note && (
                    <TouchableOpacity
                      style={styles.editorTrashBtn}
                      onPress={handleDeleteFromEditor}
                      activeOpacity={0.7}
                    >
                      <TrashIcon color={colors.red} size={18} />
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
              >
                <View style={[styles.dropdownDot, { backgroundColor: editorColor, borderWidth: 1.5, borderColor: colors.border }]} />
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
              >
                <ImageIcon color={colors.textSecondary} size={18} />
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
              >
                <CameraIcon color={colors.textSecondary} size={18} />
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
              >
                <PaintBrushIcon color={colors.textSecondary} size={18} />
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
              >
                <MicIcon color={isRecording ? '#FF3333' : colors.textSecondary} size={18} />
                <Text style={styles.dropdownText}>{isRecording ? 'Stop Recording' : 'Record'}</Text>
                {isRecording && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3333', marginLeft: 6 }} />}
              </TouchableOpacity>
            </View>
          )}

          {/* Spacer so content clears the floating top bar */}
          <View style={styles.topBarContentPad} />

          {isRecording && (
            <View style={voiceMemoStyles.recordingBanner}>
              <Text style={voiceMemoStyles.recordingDot}>{'\u{1F534}'}</Text>
              <Text style={voiceMemoStyles.recordingText}>
                Recording {formatDuration((recorderState.durationMillis ?? 0) / 1000)}
              </Text>
            </View>
          )}

          {/* Hero text area */}
          {isViewMode ? (
            <ScrollView style={styles.editorInputArea} contentContainerStyle={{ paddingBottom: 20 }}>
              {editorIcon ? <Text style={{ fontSize: 28, marginBottom: 8 }}>{editorIcon}</Text> : null}
              <Text style={[styles.editorInput, { color: resolvedFontColor }]}>
                {renderLinkedText(editorText, [styles.editorInput, { color: resolvedFontColor }], getTextColor(editorColor) === '#FFFFFF' ? '#48DBFB' : '#0066CC')}
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
                }} activeOpacity={0.8}>
                  <Image source={{ uri }} style={styles.thumbnail} resizeMethod="resize" />
                  {!isViewMode && (
                    <TouchableOpacity
                      style={styles.thumbnailRemove}
                      onPress={() => {
                        hapticLight();
                        setEditorImages((imgs) => imgs.filter((_, i) => i !== idx));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.thumbnailRemoveText}>{'\u2715'}</Text>
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
                const isThisPlaying = isActive && playerStatus.playing;
                const currentTime = isActive ? playerStatus.currentTime : 0;
                const duration = isActive && playerStatus.duration > 0 ? playerStatus.duration : 0;
                const progress = duration > 0 ? currentTime / duration : 0;
                return (
                  <View key={`memo-${idx}`} style={voiceMemoStyles.memoCard}>
                    <TouchableOpacity
                      style={voiceMemoStyles.memoPlayBtn}
                      onPress={() => handlePlayMemo(memoUri)}
                      activeOpacity={0.7}
                    >
                      <Text style={voiceMemoStyles.memoPlayText}>
                        {isThisPlaying ? '\u23F8\uFE0F' : '\u25B6\uFE0F'}
                      </Text>
                    </TouchableOpacity>
                    <View style={voiceMemoStyles.memoProgress}>
                      <View
                        style={voiceMemoStyles.progressTrack}
                        onLayout={(e) => { progressBarWidthRef.current = e.nativeEvent.layout.width; }}
                        onStartShouldSetResponder={() => isActive && duration > 0}
                        onResponderGrant={(e) => handleSeek(e, duration)}
                        onResponderMove={(e) => handleSeek(e, duration)}
                      >
                        <View style={[voiceMemoStyles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
                      </View>
                      <Text style={voiceMemoStyles.memoTime}>
                        {formatDuration(currentTime)} / {formatDuration(duration)}
                      </Text>
                    </View>
                    {!isViewMode && (
                      <TouchableOpacity
                        style={voiceMemoStyles.memoDeleteBtn}
                        onPress={() => {
                          hapticLight();
                          if (isActive) {
                            try { player.pause(); } catch { /* */ }
                            setActivePlayerUri(null);
                          }
                          setEditorVoiceMemos(prev => prev.filter((_, i) => i !== idx));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={voiceMemoStyles.memoDeleteText}>{'\u2715'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
                    >
                      {isCustomBgSelected && <Text style={[styles.colorCheck, { color: getTextColor(customBgColor!) }]}>{'\u2713'}</Text>}
                    </TouchableOpacity>
                  );
                })()}
                {/* Picker button */}
                <TouchableOpacity
                  style={[styles.colorDot, { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)', backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)' }]}
                  onPress={() => {
                    hapticLight();
                    pickedBgRef.current = customBgColor || '#4A90D9';
                    setShowBgPicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: 'rgba(255, 255, 255, 0.6)' }}>+</Text>
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
                    >
                      {isCustomFcSelected && <Text style={[styles.fontColorCheck, { color: getTextColor(customFontColor!) }]}>{'\u2713'}</Text>}
                    </TouchableOpacity>
                  );
                })()}
                {/* Font picker button */}
                <TouchableOpacity
                  style={[styles.fontColorDot, { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)', backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.7)' : 'rgba(0, 0, 0, 0.06)' }]}
                  onPress={() => {
                    hapticLight();
                    pickedFontRef.current = customFontColor || '#FF6B6B';
                    setShowFontPicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255, 255, 255, 0.6)' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}


        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom BG Color Picker Modal */}
      <Modal transparent visible={showBgPicker} animationType="fade">
        <View style={styles.cpOverlay}>
          <View style={styles.cpCard}>
            <Text style={styles.cpTitle}>Pick Background Color</Text>
            <ColorPicker
              value={pickedBgRef.current}
              onCompleteJS={(result: ColorFormatsObject) => { pickedBgRef.current = result.hex; }}
            >
              <View style={styles.cpWrapper}>
                <Preview hideInitialColor />
                <Panel1 />
                <HueSlider />
              </View>
            </ColorPicker>
            <View style={styles.cpBtns}>
              <TouchableOpacity
                onPress={() => { hapticLight(); setShowBgPicker(false); }}
                style={styles.cpCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  hapticMedium();
                  const hex = pickedBgRef.current;
                  onCustomBgColorChange(hex);
                  setEditorColor(hex);
                  setShowBgPicker(false);
                }}
                style={styles.cpSaveBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cpSaveText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Font Color Picker Modal */}
      <Modal transparent visible={showFontPicker} animationType="fade">
        <View style={styles.cpOverlay}>
          <View style={styles.cpCard}>
            <Text style={styles.cpTitle}>Pick Text Color</Text>
            <ColorPicker
              value={pickedFontRef.current}
              onCompleteJS={(result: ColorFormatsObject) => { pickedFontRef.current = result.hex; }}
            >
              <View style={styles.cpWrapper}>
                <Preview hideInitialColor />
                <Panel1 />
                <HueSlider />
              </View>
            </ColorPicker>
            <View style={styles.cpBtns}>
              <TouchableOpacity
                onPress={() => { hapticLight(); setShowFontPicker(false); }}
                style={styles.cpCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  hapticMedium();
                  const hex = pickedFontRef.current;
                  onCustomFontColorChange(hex);
                  setEditorFontColor(hex);
                  setShowFontPicker(false);
                }}
                style={styles.cpSaveBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cpSaveText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

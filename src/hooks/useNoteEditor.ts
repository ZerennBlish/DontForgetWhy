import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ToastAndroid,
  Keyboard,
  Alert,
  GestureResponderEvent,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { hapticMedium } from '../utils/haptics';
import { getTextColor } from '../utils/noteColors';
import { NOTE_COLORS } from '../types/note';
import type { Note } from '../types/note';
import { EDITOR_PLACEHOLDERS } from '../data/placeholders';
import type { StrokeData } from '../components/DrawingCanvas';
import type { TextInput } from 'react-native';

interface UseNoteEditorParams {
  note: Note | null;
  customBgColor: string | null;
  customFontColor: string | null;
  onSave: (note: {
    title: string;
    text: string;
    color: string;
    fontColor: string | null;
    icon: string;
    isNew: boolean;
    noteId?: string;
    images: string[];
    voiceMemos: string[];
  }) => void;
  onDelete: (noteId: string) => void;
  onClose: () => void;
  dirtyRef?: React.MutableRefObject<boolean>;
}

export function useNoteEditor({
  note,
  customBgColor,
  customFontColor,
  onSave,
  onDelete,
  onClose,
  dirtyRef,
}: UseNoteEditorParams) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ── State ──────────────────────────────────────────────────────────
  const [editorTitle, setEditorTitle] = useState('');
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
  const [activePlayerUri, setActivePlayerUri] = useState<string | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────
  const pickedBgRef = useRef(customBgColor || '#4A90D9');
  const pickedFontRef = useRef(customFontColor || '#FF6B6B');
  const textInputRef = useRef<TextInput>(null);
  const progressBarWidthRef = useRef(0);
  const pendingPlayRef = useRef(false);
  const loadedSnapshotRef = useRef<string>('');

  // ── Audio (legacy playback only) ───────────────────────────────────
  const player = useAudioPlayer(activePlayerUri ? { uri: activePlayerUri } : null);
  const playerStatus = useAudioPlayerStatus(player);

  // ── Effects ────────────────────────────────────────────────────────

  // Note-load effect
  useEffect(() => {
    if (note) {
      setEditorTitle(note.title ?? '');
      setEditorText(note.text);
      setEditorColor(note.color);
      setEditorIcon(note.icon);
      setEditorFontColor(note.fontColor ?? null);
      setEditorImages(note.images || []);
      setEditorVoiceMemos(note.voiceMemos || []);
      setIsViewMode(true);
      loadedSnapshotRef.current = JSON.stringify({
        title: note.title ?? '',
        text: note.text,
        color: note.color,
        icon: note.icon,
        fontColor: note.fontColor ?? null,
        images: note.images || [],
        voiceMemos: note.voiceMemos || [],
      });
    } else {
      setEditorTitle('');
      setEditorText('');
      setEditorColor(colors.background);
      setEditorIcon('');
      setEditorFontColor(null);
      setEditorImages([]);
      setEditorVoiceMemos([]);
      setIsViewMode(false);
      loadedSnapshotRef.current = JSON.stringify({
        title: '',
        text: '',
        color: colors.background,
        icon: '',
        fontColor: null,
        images: [] as string[],
        voiceMemos: [] as string[],
      });
    }
    if (dirtyRef) dirtyRef.current = false;
    setActivePlayerUri(null);
    setEditorPlaceholder(EDITOR_PLACEHOLDERS[Math.floor(Math.random() * EDITOR_PLACEHOLDERS.length)]);
    pickedBgRef.current = customBgColor || '#4A90D9';
    pickedFontRef.current = customFontColor || '#FF6B6B';
  }, [note]);

  // Dirty-tracking effect
  useEffect(() => {
    if (!dirtyRef) return;
    if (!loadedSnapshotRef.current) return;
    const current = JSON.stringify({
      title: editorTitle,
      text: editorText,
      color: editorColor,
      icon: editorIcon,
      fontColor: editorFontColor,
      images: editorImages,
      voiceMemos: editorVoiceMemos,
    });
    dirtyRef.current = current !== loadedSnapshotRef.current;
  }, [
    editorTitle,
    editorText,
    editorColor,
    editorIcon,
    editorFontColor,
    editorImages,
    editorVoiceMemos,
    dirtyRef,
  ]);

  // Player loaded → auto-play
  useEffect(() => {
    if (pendingPlayRef.current && playerStatus.isLoaded) {
      player.play();
      pendingPlayRef.current = false;
    }
  }, [playerStatus.isLoaded, player]);

  // Player finished → seek to start
  useEffect(() => {
    if (playerStatus.didJustFinish) {
      player.seekTo(0);
    }
  }, [playerStatus.didJustFinish, player]);

  // ── Computed ───────────────────────────────────────────────────────
  const noteTextColor = getTextColor(editorColor);
  const resolvedFontColor = editorFontColor || noteTextColor;

  const linkColor = useMemo(
    () => (noteTextColor === '#FFFFFF' ? '#48DBFB' : '#0066CC'),
    [noteTextColor],
  );

  // ── Helpers ─────────────────────────────────────────────────────────

  const dismissColorPicker = useCallback(() => {
    setShowColorPicker(false);
  }, []);

  const dismissAttachments = useCallback(() => {
    setShowAttachments(false);
  }, []);

  const toggleAttachments = useCallback(() => {
    Keyboard.dismiss();
    setShowColorPicker(false);
    setShowAttachments((prev) => !prev);
  }, []);

  const toggleColorPicker = useCallback(() => {
    Keyboard.dismiss();
    setShowAttachments(false);
    setShowColorPicker((prev) => !prev);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────

  const hasUnsavedChanges = (): boolean => {
    if (note) {
      return (
        editorTitle !== (note.title ?? '') ||
        editorText !== note.text ||
        editorColor !== note.color ||
        editorIcon !== note.icon ||
        editorFontColor !== (note.fontColor ?? null) ||
        JSON.stringify(editorImages) !== JSON.stringify(note.images || []) ||
        JSON.stringify(editorVoiceMemos) !== JSON.stringify(note.voiceMemos || [])
      );
    }
    return (
      editorTitle.trim().length > 0 ||
      editorText.trim().length > 0 ||
      editorColor !== colors.background ||
      editorIcon !== '' ||
      editorFontColor !== null ||
      editorImages.length > 0 ||
      editorVoiceMemos.length > 0
    );
  };

  const confirmClose = () => {
    if (showColorPicker) {
      setShowColorPicker(false);
      return;
    }
    if (showAttachments) {
      setShowAttachments(false);
      return;
    }
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
    const trimmedTitle = editorTitle.trim();
    const trimmed = editorText.trim();
    if (!trimmedTitle && !trimmed && editorImages.length === 0 && editorVoiceMemos.length === 0) {
      ToastAndroid.show('Write something down before you forget. Oh wait, too late.', ToastAndroid.LONG);
      return;
    }
    onSave({
      title: trimmedTitle,
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

  const handleShare = () => {
    const hasText = !!editorTitle.trim() || !!editorText.trim();
    const hasImages = editorImages.length > 0;
    if (!hasText && !hasImages) {
      ToastAndroid.show('Nothing to share', ToastAndroid.SHORT);
      return;
    }
    setShowShareModal(true);
  };

  const handleDraw = () => {
    Keyboard.dismiss();
    setShowColorPicker(false);
    setShowAttachments(false);
    if (editorImages.length + editorVoiceMemos.length >= 5) {
      ToastAndroid.show('5 attachments max. Delete one first.', ToastAndroid.SHORT);
      return;
    }
    setShowDrawing(true);
  };

  const handleToggleColors = toggleColorPicker;

  const pickImage = async () => {
    Keyboard.dismiss();
    setShowColorPicker(false);
    setShowAttachments(false);
    if (editorImages.length + editorVoiceMemos.length >= 5) {
      ToastAndroid.show('5 attachments max. Delete one first.', ToastAndroid.SHORT);
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
    Keyboard.dismiss();
    setShowColorPicker(false);
    setShowAttachments(false);
    if (editorImages.length + editorVoiceMemos.length >= 5) {
      ToastAndroid.show('5 attachments max. Delete one first.', ToastAndroid.SHORT);
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

  return {
    // Text
    editorTitle, setEditorTitle,
    editorText, setEditorText, editorColor, setEditorColor,
    editorIcon, editorFontColor, setEditorFontColor,
    editorPlaceholder,

    // Computed
    noteTextColor, resolvedFontColor, linkColor,

    // Mode
    isViewMode, setIsViewMode,

    // Images
    editorImages, setEditorImages,

    // Legacy voice memos (playback only)
    editorVoiceMemos, setEditorVoiceMemos,
    activePlayerUri, setActivePlayerUri, playerStatus, player,
    progressBarWidthRef,
    handlePlayMemo, handleSeek,

    // Panels
    showColorPicker, setShowColorPicker,
    showAttachments, setShowAttachments,
    showBgPicker, setShowBgPicker,
    showFontPicker, setShowFontPicker,
    showDrawing, setShowDrawing,
    showShareModal, setShowShareModal,
    lightboxUri, setLightboxUri,
    editingDrawingData, setEditingDrawingData,
    editingImageUri, setEditingImageUri,

    // Refs the component needs
    pickedBgRef, pickedFontRef, textInputRef,

    // Actions
    confirmClose, handleGoHome, handleSave,
    handleDeleteFromEditor, handleShare,
    handleDraw, handleToggleColors,
    dismissColorPicker, dismissAttachments,
    toggleAttachments,
    pickImage, takePhoto,
    hasUnsavedChanges,
  };
}

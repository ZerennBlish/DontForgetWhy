import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  ToastAndroid,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Linking,
  AppState,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import { v4 as uuidv4 } from 'uuid';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import {
  getNotes,
  getAllNotes,
  addNote,
  updateNote,
  deleteNote,
  restoreNote,
  permanentlyDeleteNote,
  getPendingNoteAction,
} from '../services/noteStorage';
import {
  getPinnedNotes,
  togglePinNote,
  unpinNote,
  pruneNotePins,
  isNotePinned,
} from '../services/widgetPins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshTimerWidget } from '../widget/updateWidget';
import UndoToast from '../components/UndoToast';
import BackButton from '../components/BackButton';
import { NOTE_COLORS, NOTE_FONT_COLORS, CUSTOM_BG_COLOR_KEY, CUSTOM_FONT_COLOR_KEY } from '../types/note';
import type { Note } from '../types/note';
import ColorPicker, { Panel1, HueSlider, Preview } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import type { RootStackParamList } from '../navigation/types';

const MAX_NOTE_LENGTH = 500;
const MAX_NOTE_PINS = 4;
let welcomeNoteCreating = false;

const EDITOR_PLACEHOLDERS = [
  'Type something before you forget... again.',
  'Your brain called. It wants backup.',
  'Future you will thank present you. Maybe.',
  'Quick, write it down before it\'s gone forever.',
  'If you\'re reading this, you already forgot something.',
  'Your memory has left the chat.',
];

const SAVE_TOASTS = [
  'Got it. Try not to forget this one too.',
  'Saved. Your brain can relax now.',
  'Written down. No excuses.',
  'Noted. Literally.',
  'Stored safely. Unlike your car keys.',
  'Done. See? That wasn\'t so hard.',
];

function getRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const date = new Date(isoDate);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

function formatDeletedAgo(deletedAt: string): string {
  const ms = Date.now() - new Date(deletedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return 'Deleted today';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 1) return 'Deleted yesterday';
  if (days < 30) return `Deleted ${days} days ago`;
  return `Deleted ${Math.floor(days / 30)}mo ago`;
}

function getTextColor(bgHex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(bgHex)) return '#FFFFFF';
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#1A1A2E' : '#FFFFFF';
}

const LINK_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)|([\w.-]+@[\w.-]+\.\w{2,})|((\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;

function renderLinkedText(
  text: string,
  baseStyle: any,
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
      // Strip trailing punctuation greedily captured in URLs
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

type Props = NativeStackScreenProps<RootStackParamList, 'Notepad'>;

export default function NotepadScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [notes, setNotes] = useState<Note[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'active' | 'deleted'>('active');
  const [showFilter, setShowFilter] = useState(false);

  // Editor modal state
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editorText, setEditorText] = useState('');
  const [editorColor, setEditorColor] = useState(NOTE_COLORS[0]);
  const [editorIcon, setEditorIcon] = useState('');
  const [editorFontColor, setEditorFontColor] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editorPlaceholder, setEditorPlaceholder] = useState(EDITOR_PLACEHOLDERS[0]);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [customBgColor, setCustomBgColor] = useState<string | null>(null);
  const [customFontColor, setCustomFontColor] = useState<string | null>(null);
  const pickedBgRef = useRef('#4A90D9');
  const pickedFontRef = useRef('#FF6B6B');

  // Undo toast state
  const [deletedNote, setDeletedNote] = useState<Note | null>(null);
  const [deletedNotePinned, setDeletedNotePinned] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoKey, setUndoKey] = useState(0);

  const textInputRef = useRef<TextInput>(null);
  const emojiInputRef = useRef<TextInput>(null);
  const handledActionRef = useRef('');
  useEffect(() => {
    (async () => {
      const [bg, fc] = await Promise.all([
        AsyncStorage.getItem(CUSTOM_BG_COLOR_KEY),
        AsyncStorage.getItem(CUSTOM_FONT_COLOR_KEY),
      ]);
      const validHex = /^#[0-9A-Fa-f]{6}$/;
      // Migrate old keys if new keys are empty
      let resolvedBg = bg;
      let resolvedFc = fc;
      if (!bg) {
        const oldBg = await AsyncStorage.getItem('noteCustomBgColor');
        if (oldBg && validHex.test(oldBg)) {
          resolvedBg = oldBg;
          AsyncStorage.setItem(CUSTOM_BG_COLOR_KEY, oldBg);
        }
      }
      if (!fc) {
        const oldFc = await AsyncStorage.getItem('noteCustomFontColor');
        if (oldFc && validHex.test(oldFc)) {
          resolvedFc = oldFc;
          AsyncStorage.setItem(CUSTOM_FONT_COLOR_KEY, oldFc);
        }
      }
      if (resolvedBg && validHex.test(resolvedBg)) { setCustomBgColor(resolvedBg); pickedBgRef.current = resolvedBg; }
      if (resolvedFc && validHex.test(resolvedFc)) { setCustomFontColor(resolvedFc); pickedFontRef.current = resolvedFc; }
    })();
  }, []);

  const loadData = useCallback(async () => {
    let loaded = await getAllNotes(true);

    // First-launch welcome note — in-memory guard + persisted flag prevent duplicates
    const onboarded = await AsyncStorage.getItem('notepadOnboarded');
    if (!onboarded && !welcomeNoteCreating && loaded.filter((n) => !n.deletedAt).length === 0) {
      welcomeNoteCreating = true;
      await AsyncStorage.setItem('notepadOnboarded', 'true');
      const now = new Date().toISOString();
      const welcomeNote: Note = {
        id: uuidv4(),
        text: "Welcome to Notes! Quick capture, right from your home screen. Pin notes to your widget so you never forget.\n\nTip: Long-press a note to copy it. Tap the color dot to make it yours.",
        color: '#FECA57',
        icon: '\u{1F44B}',
        pinned: true,
        createdAt: now,
        updatedAt: now,
      };
      await addNote(welcomeNote);
      await togglePinNote(welcomeNote.id);
      refreshTimerWidget();
      loaded = await getAllNotes(true);
    }

    setNotes(loaded);
    const activeIds = loaded.filter((n) => !n.deletedAt).map((n) => n.id);
    const pruned = await pruneNotePins(activeIds);
    setPinnedIds(pruned);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Handle route params and pending actions
  useEffect(() => {
    const params = route.params;
    const actionKey = params?.noteId
      ? `edit:${params.noteId}`
      : params?.newNote
        ? 'new'
        : '';

    // Skip if we already handled this exact action
    if (actionKey && actionKey === handledActionRef.current) return;

    const isInitial = handledActionRef.current === '';

    const handle = async () => {
      // Route params take priority
      if (params?.newNote) {
        handledActionRef.current = 'new';
        openNewEditor();
        return;
      }
      if (params?.noteId) {
        handledActionRef.current = `edit:${params.noteId}`;
        const all = await getNotes();
        const found = all.find((n) => n.id === params.noteId);
        if (found) openEditorWithNote(found);
        return;
      }

      // Check pending note action from widget (initial mount only)
      if (!isInitial) return;
      handledActionRef.current = '__init__';
      const action = await getPendingNoteAction();
      if (!action) return;
      if (action.type === 'new') {
        openNewEditor();
      } else if ((action.type === 'edit' || action.type === 'open') && action.noteId) {
        const all = await getNotes();
        const found = all.find((n) => n.id === action.noteId);
        if (found) openEditorWithNote(found);
      }
    };

    handle();
  }, [route.params]);

  // BUG A fix: check pending widget actions when app foregrounds while already mounted
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const action = await getPendingNoteAction();
      if (!action) return;
      const actionKey =
        action.type === 'new'
          ? 'new'
          : action.type === 'edit' || action.type === 'open'
            ? `edit:${action.noteId}`
            : '';
      if (actionKey && actionKey === handledActionRef.current) return;
      if (action.type === 'new') {
        handledActionRef.current = 'new';
        openNewEditor();
      } else if ((action.type === 'edit' || action.type === 'open') && action.noteId) {
        handledActionRef.current = `edit:${action.noteId}`;
        const all = await getNotes();
        const found = all.find((n) => n.id === action.noteId);
        if (found) openEditorWithNote(found);
      }
    });
    return () => sub.remove();
  }, []);

  const openNewEditor = () => {
    setEditingNote(null);
    setEditorText('');
    setEditorColor(colors.background);
    setEditorIcon('');
    setEditorFontColor(null);
    setShowColorPicker(false);
    setShowEmojiPicker(false);
    setEditorPlaceholder(EDITOR_PLACEHOLDERS[Math.floor(Math.random() * EDITOR_PLACEHOLDERS.length)]);
    setIsViewMode(false);
    setEditorVisible(true);
  };

  const openEditorWithNote = (note: Note) => {
    setEditingNote(note);
    setEditorText(note.text);
    setEditorColor(note.color);
    setEditorIcon(note.icon);
    setEditorFontColor(note.fontColor ?? null);
    setShowColorPicker(false);
    setShowEmojiPicker(false);
    setEditorPlaceholder(EDITOR_PLACEHOLDERS[Math.floor(Math.random() * EDITOR_PLACEHOLDERS.length)]);
    setIsViewMode(true);
    setEditorVisible(true);
  };

  const closeEditor = () => {
    Keyboard.dismiss();
    setEditorVisible(false);
    setEditingNote(null);
    setShowColorPicker(false);
    setShowEmojiPicker(false);
    handledActionRef.current = '';
  };

  const hasUnsavedChanges = (): boolean => {
    if (editingNote) {
      return (
        editorText !== editingNote.text ||
        editorColor !== editingNote.color ||
        editorIcon !== editingNote.icon ||
        editorFontColor !== (editingNote.fontColor ?? null)
      );
    }
    return editorText.trim().length > 0;
  };

  const confirmClose = () => {
    if (!hasUnsavedChanges()) {
      closeEditor();
      return;
    }
    Keyboard.dismiss();
    Alert.alert(
      'Leaving Already?',
      "You've got unsaved changes. Walk away and they're gone forever. Just like your memory.",
      [
        { text: 'Go Back to Editing', style: 'cancel' },
        { text: 'Abandon Note', style: 'destructive', onPress: closeEditor },
      ],
    );
  };

  const handleSave = async () => {
    hapticMedium();
    const trimmed = editorText.trim();
    if (!trimmed) {
      ToastAndroid.show('Write something down before you forget. Oh wait, too late.', ToastAndroid.LONG);
      return;
    }

    const now = new Date().toISOString();
    const isNew = !editingNote;

    if (editingNote) {
      const updated: Note = {
        ...editingNote,
        text: trimmed,
        color: editorColor,
        fontColor: editorFontColor,
        icon: editorIcon,
        updatedAt: now,
      };
      await updateNote(updated);
    } else {
      const newNote: Note = {
        id: uuidv4(),
        text: trimmed,
        color: editorColor,
        fontColor: editorFontColor,
        icon: editorIcon,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      await addNote(newNote);
    }

    await loadData();
    refreshTimerWidget();
    closeEditor();
    ToastAndroid.show(
      isNew ? SAVE_TOASTS[Math.floor(Math.random() * SAVE_TOASTS.length)] : 'Note updated',
      ToastAndroid.SHORT,
    );
  };

  const handleDeleteFromEditor = async () => {
    if (!editingNote) return;
    hapticHeavy();
    const wasPinned = isNotePinned(editingNote.id, pinnedIds);
    setDeletedNote(editingNote);
    setDeletedNotePinned(wasPinned);
    await unpinNote(editingNote.id);
    await deleteNote(editingNote.id);
    await loadData();
    refreshTimerWidget();
    closeEditor();
    setUndoKey((k) => k + 1);
    setShowUndo(true);
  };

  const handleDeleteFromList = async (id: string) => {
    hapticHeavy();
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const wasPinned = isNotePinned(id, pinnedIds);
    setDeletedNote(note);
    setDeletedNotePinned(wasPinned);
    await unpinNote(id);
    await deleteNote(id);
    await loadData();
    refreshTimerWidget();
    setUndoKey((k) => k + 1);
    setShowUndo(true);
  };

  const handleUndoDelete = async () => {
    setShowUndo(false);
    if (!deletedNote) return;
    await restoreNote(deletedNote.id);
    if (deletedNotePinned) {
      await togglePinNote(deletedNote.id);
    }
    await loadData();
    refreshTimerWidget();
    setDeletedNote(null);
  };

  const handleUndoDismiss = () => {
    setShowUndo(false);
    setDeletedNote(null);
  };

  const handleRestore = async (id: string) => {
    hapticLight();
    await restoreNote(id);
    await loadData();
    refreshTimerWidget();
  };

  const handlePermanentDelete = async (id: string) => {
    hapticHeavy();
    await permanentlyDeleteNote(id);
    await loadData();
    refreshTimerWidget();
  };

  const handleTogglePin = async (id: string) => {
    hapticMedium();
    const currentlyPinned = isNotePinned(id, pinnedIds);
    if (!currentlyPinned && pinnedIds.length >= MAX_NOTE_PINS) {
      ToastAndroid.show('Widget full \u2014 unpin one first', ToastAndroid.SHORT);
      return;
    }
    await togglePinNote(id);
    const updated = await getPinnedNotes();
    setPinnedIds(updated);
    refreshTimerWidget();
    ToastAndroid.show(
      currentlyPinned ? 'Unpinned from widget' : 'Pinned to widget',
      ToastAndroid.SHORT,
    );
  };

  const sorted = useMemo(() => {
    if (filter === 'deleted') {
      return notes
        .filter((n) => !!n.deletedAt)
        .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
    }

    const active = notes.filter((n) => !n.deletedAt);
    const pinned = active.filter((n) => isNotePinned(n.id, pinnedIds));
    const unpinned = active.filter((n) => !isNotePinned(n.id, pinnedIds));
    pinned.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    unpinned.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return [...pinned, ...unpinned];
  }, [notes, pinnedIds, filter]);

  const nonDeletedCount = notes.filter((n) => !n.deletedAt).length;

  const styles = useMemo(() => StyleSheet.create({
    outerContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    watermark: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
      opacity: 0.07,
    },
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: insets.top + 10,
      paddingHorizontal: 20,
      paddingBottom: 2,
    },
    headerBack: {
      position: 'absolute',
      left: 20,
      top: insets.top + 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    filterToggleRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 0,
    },
    filterToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
    },
    filterToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    filterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 6,
      gap: 6,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    pillTextActive: {
      color: colors.textPrimary,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 100 + insets.bottom,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 80 + insets.bottom,
      paddingHorizontal: 32,
    },
    emptyIcon: {
      fontSize: 40,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textTertiary,
      marginBottom: 4,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 22,
    },
    emptyBtn: {
      marginTop: 20,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    emptyBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    card: {
      backgroundColor: colors.card + 'BF',
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'stretch',
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 10,
    },
    cardStripe: {
      width: 4,
    },
    cardContent: {
      flex: 1,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardMiddle: {
      flex: 1,
      marginRight: 10,
    },
    cardIcon: {
      fontSize: 18,
      marginRight: 6,
    },
    cardTextRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    cardText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      lineHeight: 20,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 6,
    },
    cardTime: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    cardPin: {
      fontSize: 11,
      color: colors.accent,
    },
    cardRight: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    pinBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    pinBtnActive: {
      backgroundColor: colors.activeBackground,
    },
    pinBtnText: {
      fontSize: 13,
    },
    deleteBtn: {
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    deleteText: {
      fontSize: 12,
      color: colors.red,
    },
    deletedAgo: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    btnRow: {
      flexDirection: 'row',
      gap: 6,
    },
    restoreBtn: {
      backgroundColor: colors.activeBackground,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    restoreText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    foreverBtn: {
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    foreverText: {
      color: colors.red,
      fontSize: 13,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      bottom: 36 + insets.bottom,
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    fabText: {
      fontSize: 32,
      color: colors.textPrimary,
      fontWeight: '300',
      marginTop: -2,
    },
    // --- Editor modal styles ---
    editorContainer: {
      flex: 1,
    },
    editorTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 54,
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 10,
    },
    editorTopSpacer: {
      flex: 1,
    },
    editorTopBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    editorTopBtnActive: {
      borderColor: colors.accent,
      backgroundColor: colors.activeBackground,
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
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.red + '40',
    },
    editorTrashIcon: {
      fontSize: 18,
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
  }), [colors, insets.bottom]);

  const renderDeletedItem = (item: Note) => (
    <View style={[styles.card, { opacity: 0.7 }]}>
      <View style={[styles.cardStripe, { backgroundColor: item.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardMiddle}>
          <Text style={[styles.cardText, { color: colors.textTertiary }]} numberOfLines={2}>
            {item.icon ? `${item.icon} ` : ''}{item.text}
          </Text>
          <Text style={styles.deletedAgo}>
            {formatDeletedAgo(item.deletedAt!)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={styles.btnRow}>
            <TouchableOpacity onPress={() => handleRestore(item.id)} style={styles.restoreBtn} activeOpacity={0.7}>
              <Text style={styles.restoreText}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handlePermanentDelete(item.id)} style={styles.foreverBtn} activeOpacity={0.7}>
              <Text style={styles.foreverText}>Forever</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderActiveItem = (item: Note) => {
    const pinned = isNotePinned(item.id, pinnedIds);
    const cardFontColor = item.fontColor || undefined;
    const linkColor = getTextColor(item.color) === '#FFFFFF' ? '#48DBFB' : '#0066CC';
    const textStyle = [styles.cardText, cardFontColor ? { color: cardFontColor } : undefined];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => { hapticLight(); openEditorWithNote(item); }}
        onLongPress={async () => {
          hapticMedium();
          try {
            await Clipboard.setStringAsync(item.text);
            ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
          } catch {
            ToastAndroid.show("Couldn't copy", ToastAndroid.SHORT);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.cardStripe, { backgroundColor: item.color }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardMiddle}>
            <View style={styles.cardTextRow}>
              {item.icon ? <Text style={styles.cardIcon}>{item.icon}</Text> : null}
              <Text style={textStyle} numberOfLines={3}>
                {renderLinkedText(item.text, textStyle, linkColor)}
              </Text>
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.cardTime}>{getRelativeTime(item.updatedAt)}</Text>
              {pinned && <Text style={styles.cardPin}>{'\u{1F4CC}'}</Text>}
            </View>
          </View>
          <View style={styles.cardRight}>
            <TouchableOpacity
              onPress={() => handleTogglePin(item.id)}
              style={[styles.pinBtn, pinned && styles.pinBtnActive]}
              activeOpacity={0.6}
            >
              <Text style={[styles.pinBtnText, { opacity: pinned ? 1 : 0.3 }]}>
                {'\u{1F4CC}'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteFromList(item.id)}
              style={styles.deleteBtn}
              activeOpacity={0.6}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Note }) => {
    if (item.deletedAt) return renderDeletedItem(item);
    return renderActiveItem(item);
  };

  const renderEmpty = () => {
    if (filter === 'deleted') {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'\u{1F5D1}\uFE0F'}</Text>
          <Text style={styles.emptyTitle}>Nothing in the trash</Text>
          <Text style={styles.emptyText}>How responsible of you.</Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>{'\u{1F4DD}'}</Text>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptyText}>
          That's either impressive or suspicious.
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => { hapticLight(); openNewEditor(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyBtnText}>Create a Note</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const noteTextColor = getTextColor(editorColor);
  const resolvedFontColor = editorFontColor || noteTextColor;

  return (
    <View style={styles.outerContainer}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={require('../../assets/fullscreenicon.png')}
          style={styles.watermark}
          resizeMode="cover"
        />
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerBack}>
            <BackButton onPress={() => navigation.goBack()} />
          </View>
          <Text style={styles.title}>Notes</Text>
        </View>

        <View style={styles.filterToggleRow}>
          <TouchableOpacity
            style={styles.filterToggleBtn}
            onPress={() => {
              hapticLight();
              setShowFilter((prev) => {
                if (prev) setFilter('active');
                return !prev;
              });
            }}
            activeOpacity={0.7}
          >
            {filter !== 'active' && <View style={styles.filterDot} />}
            <Text style={styles.filterToggleText}>
              Filter {showFilter ? '\u25B4' : '\u25BE'}
            </Text>
          </TouchableOpacity>
        </View>

        {showFilter && (
          <View style={styles.filterRow}>
            {(['active', 'deleted'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, filter === f && styles.pillActive]}
                onPress={() => { hapticLight(); setFilter(f); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                  {f === 'active' ? 'Active' : 'Deleted'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {sorted.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => { hapticLight(); openNewEditor(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        <UndoToast
          key={undoKey}
          visible={showUndo}
          message="Note deleted"
          onUndo={handleUndoDelete}
          onDismiss={handleUndoDismiss}
        />
      </View>

      {/* Editor Modal */}
      <Modal
        visible={editorVisible}
        animationType="slide"
        onRequestClose={confirmClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView style={[styles.editorContainer, { backgroundColor: editorColor }]} contentContainerStyle={{ flex: 1 }} keyboardShouldPersistTaps="handled" scrollEnabled={false}>

          {/* Top bar: back, spacer, emoji btn, color btn, trash btn */}
          <View style={styles.editorTopBar}>
            <BackButton onPress={confirmClose} />
            {isViewMode ? (
              <>
                <View style={styles.editorTopSpacer} />
                <TouchableOpacity
                  style={[styles.editorTopBtn, { backgroundColor: noteTextColor + '15', borderColor: noteTextColor + '25' }]}
                  onPress={() => { hapticLight(); setIsViewMode(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16 }}>{'\u270F\uFE0F'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editorTopBtn, { backgroundColor: noteTextColor + '15', borderColor: noteTextColor + '25' }]}
                  onPress={() => {
                    hapticLight();
                    Alert.alert('Share Note', '', [
                      {
                        text: 'Share',
                        onPress: () => {
                          if (!editorText.trim()) {
                            ToastAndroid.show('Nothing to share', ToastAndroid.SHORT);
                            return;
                          }
                          const content = editorIcon ? `${editorIcon} ${editorText}` : editorText;
                          Share.share({ message: content });
                        },
                      },
                      {
                        text: 'Print',
                        onPress: () => {
                          if (!editorText.trim()) {
                            ToastAndroid.show('Nothing to print', ToastAndroid.SHORT);
                            return;
                          }
                          const iconHtml = editorIcon ? `<div style="font-size:48px;margin-bottom:16px;">${editorIcon}</div>` : '';
                          const html = `<html><head><style>@page { size: letter; margin: 0.75in; }</style></head><body style="background:${editorColor};color:${noteTextColor};font-family:system-ui;padding:40px;">${iconHtml}<pre style="white-space:pre-wrap;font-family:system-ui;font-size:16px;color:${noteTextColor};margin:0;">${editorText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`;
                          Print.printAsync({ html });
                        },
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16 }}>{'\u{1F4E4}'}</Text>
                </TouchableOpacity>
                {editingNote && (
                  <TouchableOpacity
                    style={[styles.editorTrashBtn, { backgroundColor: noteTextColor + '15', borderColor: colors.red + '40' }]}
                    onPress={handleDeleteFromEditor}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editorTrashIcon}>{'\u{1F5D1}\uFE0F'}</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.accent, borderRadius: 14, height: 28, alignItems: 'center', justifyContent: 'center' }}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: getTextColor(colors.accent) }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editorTopBtn, { backgroundColor: noteTextColor + '15', borderColor: noteTextColor + '25' }, showEmojiPicker && styles.editorTopBtnActive]}
                  onPress={() => {
                    hapticLight();
                    Keyboard.dismiss();
                    setShowColorPicker(false);
                    setShowEmojiPicker((v) => !v);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editorTopBtnEmoji}>{editorIcon || '\u{1F600}'}</Text>
                </TouchableOpacity>
                <TextInput
                  ref={emojiInputRef}
                  style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
                  autoCorrect={false}
                  onChangeText={(t) => {
                    if (t) {
                      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
                      const graphemes = Array.from(segmenter.segment(t), s => s.segment);
                      setEditorIcon(graphemes[graphemes.length - 1] || '');
                    }
                    setShowEmojiPicker(false);
                    if (emojiInputRef.current) {
                      emojiInputRef.current.setNativeProps({ text: '' });
                      emojiInputRef.current.blur();
                    }
                  }}
                />
                <TouchableOpacity
                  style={[styles.editorTopBtn, { backgroundColor: noteTextColor + '15', borderColor: noteTextColor + '25' }, showColorPicker && styles.editorTopBtnActive]}
                  onPress={() => {
                    hapticLight();
                    Keyboard.dismiss();
                    setShowEmojiPicker(false);
                    setShowColorPicker((v) => !v);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.editorColorIndicator, { backgroundColor: editorColor, borderWidth: 2, borderColor: noteTextColor + '40' }]} />
                </TouchableOpacity>
                {editingNote && (
                  <TouchableOpacity
                    style={[styles.editorTrashBtn, { backgroundColor: noteTextColor + '15', borderColor: colors.red + '40' }]}
                    onPress={handleDeleteFromEditor}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editorTrashIcon}>{'\u{1F5D1}\uFE0F'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Emoji quick-pick row */}
          {showEmojiPicker && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 8, paddingVertical: 8 }}>
              {['\u{1F4DD}', '\u{1F4CC}', '\u{1F4A1}', '\u2B50', '\u2764\uFE0F', '\u{1F3AF}', '\u{1F4C5}', '\u{1F514}'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    hapticLight();
                    if (editorIcon === emoji) {
                      setEditorIcon('');
                    } else {
                      setEditorIcon(emoji);
                      setShowEmojiPicker(false);
                    }
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: editorIcon === emoji ? noteTextColor + '25' : noteTextColor + '10',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => { hapticLight(); emojiInputRef.current?.focus(); }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: noteTextColor + '10',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18, color: noteTextColor + '80' }}>+</Text>
              </TouchableOpacity>
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
                autoFocus={!editingNote}
                onFocus={() => {
                  setShowColorPicker(false);
                  setShowEmojiPicker(false);
                }}
              />
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
                          : { borderWidth: 2, borderColor: noteTextColor + '30', borderStyle: 'dashed' as const },
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
                  style={[styles.colorDot, { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: noteTextColor + '40', backgroundColor: 'transparent' }]}
                  onPress={() => {
                    hapticLight();
                    pickedBgRef.current = customBgColor || '#4A90D9';
                    setShowBgPicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: noteTextColor + '80' }}>+</Text>
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
                          : { borderWidth: 1.5, borderColor: noteTextColor + '30', borderStyle: 'dashed' as const },
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
                  style={[styles.fontColorDot, { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: noteTextColor + '40', backgroundColor: 'transparent' }]}
                  onPress={() => {
                    hapticLight();
                    pickedFontRef.current = customFontColor || '#FF6B6B';
                    setShowFontPicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: noteTextColor + '80' }}>+</Text>
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
                  setCustomBgColor(hex);
                  setEditorColor(hex);
                  AsyncStorage.setItem(CUSTOM_BG_COLOR_KEY, hex);
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
                  setCustomFontColor(hex);
                  setEditorFontColor(hex);
                  AsyncStorage.setItem(CUSTOM_FONT_COLOR_KEY, hex);
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
    </View>
  );
}

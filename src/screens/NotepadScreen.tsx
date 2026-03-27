import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ToastAndroid,
  Image,
  Linking,
  AppState,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
import { saveNoteImage, deleteNoteImage } from '../services/noteImageStorage';
import {
  getPinnedNotes,
  togglePinNote,
  unpinNote,
  pruneNotePins,
  isNotePinned,
} from '../services/widgetPins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshWidgets } from '../widget/updateWidget';
import UndoToast from '../components/UndoToast';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import BackButton from '../components/BackButton';
import NoteEditorModal from '../components/NoteEditorModal';
import { CUSTOM_BG_COLOR_KEY, CUSTOM_FONT_COLOR_KEY } from '../types/note';
import type { Note } from '../types/note';
import type { RootStackParamList } from '../navigation/types';

const MAX_NOTE_PINS = 4;
let welcomeNoteCreating = false;

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
  const [customBgColor, setCustomBgColor] = useState<string | null>(null);
  const [customFontColor, setCustomFontColor] = useState<string | null>(null);

  // Undo toast state
  const [deletedNote, setDeletedNote] = useState<Note | null>(null);
  const [deletedNotePinned, setDeletedNotePinned] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoKey, setUndoKey] = useState(0);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);

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
      if (resolvedBg && validHex.test(resolvedBg)) { setCustomBgColor(resolvedBg); }
      if (resolvedFc && validHex.test(resolvedFc)) { setCustomFontColor(resolvedFc); }
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
      refreshWidgets();
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
      loadBackground().then(setBgUri);
      getOverlayOpacity().then(setBgOpacity);
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
    setEditorVisible(true);
  };

  const openEditorWithNote = (note: Note) => {
    setEditingNote(note);
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingNote(null);
    handledActionRef.current = '';
  };

  const handleEditorSave = async (data: { text: string; color: string; fontColor: string | null; icon: string; isNew: boolean; noteId?: string; images: string[] }) => {
    const now = new Date().toISOString();
    try {
      if (data.isNew) {
        const noteId = uuidv4();
        const savedUris = await Promise.all(
          data.images.map((uri) => saveNoteImage(noteId, uri)),
        );
        try {
          const newNote: Note = {
            id: noteId,
            text: data.text,
            color: data.color,
            fontColor: data.fontColor,
            icon: data.icon,
            pinned: false,
            createdAt: now,
            updatedAt: now,
            images: savedUris.length > 0 ? savedUris : undefined,
          };
          await addNote(newNote);
        } catch (e) {
          for (const uri of savedUris) { await deleteNoteImage(uri); }
          throw e;
        }
      } else if (data.noteId) {
        const existing = notes.find(n => n.id === data.noteId);
        if (existing) {
          const originalImages = existing.images || [];
          const keptImages = data.images.filter((uri) => originalImages.includes(uri));
          const newImageUris = data.images.filter((uri) => !originalImages.includes(uri));
          const removedImages = originalImages.filter((uri) => !data.images.includes(uri));
          const savedNewUris = await Promise.all(
            newImageUris.map((uri) => saveNoteImage(data.noteId!, uri)),
          );
          try {
            const finalImages = [...keptImages, ...savedNewUris];
            await updateNote({
              ...existing,
              text: data.text,
              color: data.color,
              fontColor: data.fontColor,
              icon: data.icon,
              updatedAt: now,
              images: finalImages.length > 0 ? finalImages : undefined,
            });
          } catch (e) {
            for (const uri of savedNewUris) { await deleteNoteImage(uri); }
            throw e;
          }
          for (const uri of removedImages) { await deleteNoteImage(uri); }
        }
      }
    } catch {
      ToastAndroid.show('Failed to save note', ToastAndroid.SHORT);
      return;
    }
    await loadData();
    refreshWidgets();
    closeEditor();
    ToastAndroid.show(
      data.isNew ? SAVE_TOASTS[Math.floor(Math.random() * SAVE_TOASTS.length)] : 'Note updated',
      ToastAndroid.SHORT,
    );
  };

  const handleEditorDelete = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    hapticHeavy();
    const wasPinned = isNotePinned(noteId, pinnedIds);
    setDeletedNote(note);
    setDeletedNotePinned(wasPinned);
    await unpinNote(noteId);
    await deleteNote(noteId);
    await loadData();
    refreshWidgets();
    closeEditor();
    setUndoKey(k => k + 1);
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
    refreshWidgets();
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
    refreshWidgets();
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
    refreshWidgets();
  };

  const handlePermanentDelete = async (id: string) => {
    hapticHeavy();
    await permanentlyDeleteNote(id);
    await loadData();
    refreshWidgets();
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
    refreshWidgets();
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
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'stretch',
      borderWidth: 1.5,
      overflow: 'hidden',
      marginBottom: 10,
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
      borderRadius: 20,
      backgroundColor: 'rgba(30, 30, 40, 0.7)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    pinBtnActive: {
      backgroundColor: 'rgba(30, 30, 40, 0.85)',
    },
    pinBtnText: {
      fontSize: 13,
    },
    deleteBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(30, 30, 40, 0.7)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    deleteText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#EF4444',
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
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(30, 30, 40, 0.7)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    restoreText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#22C55E',
    },
    foreverBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(30, 30, 40, 0.7)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    foreverText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#EF4444',
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
  }), [colors, insets.bottom]);

  const renderDeletedItem = (item: Note) => {
    const deletedTextColor = getTextColor(item.color);
    return (
    <View style={[styles.card, { opacity: 0.7, backgroundColor: item.color, borderColor: getTextColor(item.color) === '#FFFFFF' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)' }]}>
      <View style={styles.cardContent}>
        <View style={styles.cardMiddle}>
          <Text style={[styles.cardText, { color: deletedTextColor + 'AA' }]} numberOfLines={2}>
            {item.icon ? `${item.icon} ` : ''}{item.text}
          </Text>
          <Text style={[styles.deletedAgo, { color: deletedTextColor + '80' }]}>
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
  };

  const renderActiveItem = (item: Note) => {
    const pinned = isNotePinned(item.id, pinnedIds);
    const cardFontColor = item.fontColor || getTextColor(item.color);
    const linkColor = getTextColor(item.color) === '#FFFFFF' ? '#48DBFB' : '#0066CC';
    const textStyle = [styles.cardText, cardFontColor ? { color: cardFontColor } : undefined];
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: item.color, borderColor: getTextColor(item.color) === '#FFFFFF' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)' }]}
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
        <View style={styles.cardContent}>
          <View style={styles.cardMiddle}>
            <View style={styles.cardTextRow}>
              {item.icon ? <Text style={styles.cardIcon}>{item.icon}</Text> : null}
              <Text style={textStyle} numberOfLines={3}>
                {renderLinkedText(item.text, textStyle, linkColor)}
              </Text>
            </View>
            <View style={styles.cardMeta}>
              <Text style={[styles.cardTime, { color: (cardFontColor || getTextColor(item.color)) + '99' }]}>{getRelativeTime(item.updatedAt)}</Text>
              {pinned && <Text style={styles.cardPin}>{'\u{1F4CC}'}</Text>}
              {(item.images?.length ?? 0) > 0 && (
                <Text style={[styles.cardTime, { color: (cardFontColor || getTextColor(item.color)) + '99' }]}>{'\u{1F4F7}'} {item.images!.length}</Text>
              )}
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

  return (
    <View style={styles.outerContainer}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bgUri ? (
          <>
            <Image source={{ uri: bgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBgUri(null)} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${bgOpacity})` }]} />
          </>
        ) : (
          <Image
            source={require('../../assets/fullscreenicon.png')}
            style={styles.watermark}
            resizeMode="cover"
          />
        )}
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

      <NoteEditorModal
        visible={editorVisible}
        note={editingNote}
        customBgColor={customBgColor}
        customFontColor={customFontColor}
        onSave={handleEditorSave}
        onDelete={handleEditorDelete}
        onClose={closeEditor}
        onCustomBgColorChange={(c) => { setCustomBgColor(c); AsyncStorage.setItem(CUSTOM_BG_COLOR_KEY, c); }}
        onCustomFontColorChange={(c) => { setCustomFontColor(c); AsyncStorage.setItem(CUSTOM_FONT_COLOR_KEY, c); }}
      />
    </View>
  );
}

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ToastAndroid,
  Image,
  AppState,
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
import { saveNoteImage, deleteNoteImage, cleanupTempDrawings } from '../services/noteImageStorage';
import { saveVoiceMemo, deleteVoiceMemo, deleteAllVoiceMemos } from '../services/noteVoiceMemoStorage';
import {
  getPinnedNotes,
  togglePinNote,
  unpinNote,
  pruneNotePins,
  isNotePinned,
  getPinnedVoiceMemos,
  togglePinVoiceMemo,
  unpinVoiceMemo,
  pruneVoiceMemoPins,
  isVoiceMemoPinned,
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
import type { VoiceMemo } from '../types/voiceMemo';
import * as VMStore from '../services/voiceMemoStorage';
import { deleteVoiceMemoFile } from '../services/voiceMemoFileStorage';
import VoiceMemoCard from '../components/VoiceMemoCard';
import { createAudioPlayer } from 'expo-audio';

const MAX_NOTE_PINS = 4;
const MAX_VOICE_MEMO_PINS = 4;
let welcomeNoteCreating = false;
type ListItem = { type: 'note'; data: Note } | { type: 'voiceMemo'; data: VoiceMemo };

const VOICE_EMPTY_MESSAGES = [
  'Nothing to hear here. Suspiciously quiet.',
  'No voice memos yet. Your thoughts are still trapped in your head.',
  'Silence. The sound of someone who keeps forgetting to record things.',
  "Your voice memo list is empty. Your head probably isn't.",
  'No recordings yet. All those brilliant shower thoughts, lost.',
];

const VOICE_DELETE_TOASTS = [
  "Memo deleted. Tap to undo before it's too late.",
  'Gone. But not forgotten. Yet. Tap undo.',
  'Deleted. Your voice echoes into the void. Undo?',
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

type Props = NativeStackScreenProps<RootStackParamList, 'Notepad'>;

export default function NotepadScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [voiceEmptyMsg] = useState(() => VOICE_EMPTY_MESSAGES[Math.floor(Math.random() * VOICE_EMPTY_MESSAGES.length)]);
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

  // Voice memo state
  const [voiceMemos, setVoiceMemos] = useState<VoiceMemo[]>([]);
  const [pinnedVoiceMemoIds, setPinnedVoiceMemoIds] = useState<string[]>([]);
  const [contentFilter, setContentFilter] = useState<'all' | 'notes' | 'voice'>('all');
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({});
  const [deletedVoiceMemo, setDeletedVoiceMemo] = useState<VoiceMemo | null>(null);
  const [showVoiceUndo, setShowVoiceUndo] = useState(false);
  const [voiceUndoKey, setVoiceUndoKey] = useState(0);

  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerListenerRef = useRef<{ remove: () => void } | null>(null);

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

  useEffect(() => {
    if (route.params?.initialFilter) {
      setContentFilter(route.params.initialFilter);
    }
  }, [route.params?.initialFilter]);

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

  const reloadVoiceMemos = useCallback(async () => {
    const memos = await VMStore.getAllVoiceMemos();
    setVoiceMemos(memos);
    const activeIds = memos.filter((m) => !m.deletedAt).map((m) => m.id);
    const pruned = await pruneVoiceMemoPins(activeIds);
    setPinnedVoiceMemoIds(pruned);
  }, []);

  const stopPlayback = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    if (playerListenerRef.current) {
      try { playerListenerRef.current.remove(); } catch { /* */ }
      playerListenerRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.release();
      } catch { /* */ }
      playerRef.current = null;
    }
    setPlayingMemoId(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      reloadVoiceMemos();
      loadBackground().then(setBgUri);
      getOverlayOpacity().then(setBgOpacity);
      return () => {
        stopPlayback();
      };
    }, [loadData, reloadVoiceMemos, stopPlayback]),
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
    cleanupTempDrawings();
  };

  const handleEditorSave = async (data: { text: string; color: string; fontColor: string | null; icon: string; isNew: boolean; noteId?: string; images: string[]; voiceMemos: string[] }) => {
    const now = new Date().toISOString();
    try {
      if (data.isNew) {
        const noteId = uuidv4();
        const savedUris: string[] = [];
        for (const uri of data.images) {
          try {
            const saved = await saveNoteImage(noteId, uri);
            savedUris.push(saved);
          } catch (e) {
            for (const copied of savedUris) { await deleteNoteImage(copied); }
            throw e;
          }
        }
        const savedMemoUris: string[] = [];
        for (const memoUri of data.voiceMemos) {
          try {
            const saved = await saveVoiceMemo(noteId, memoUri);
            savedMemoUris.push(saved);
          } catch (e) {
            for (const copied of savedMemoUris) { await deleteVoiceMemo(copied); }
            for (const copied of savedUris) { await deleteNoteImage(copied); }
            throw e;
          }
        }
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
            voiceMemos: savedMemoUris.length > 0 ? savedMemoUris : undefined,
          };
          await addNote(newNote);
        } catch (e) {
          for (const uri of savedUris) { await deleteNoteImage(uri); }
          for (const uri of savedMemoUris) { await deleteVoiceMemo(uri); }
          throw e;
        }
      } else if (data.noteId) {
        const existing = notes.find(n => n.id === data.noteId);
        if (existing) {
          const originalImages = existing.images || [];
          const keptImages = data.images.filter((uri) => originalImages.includes(uri));
          const newImageUris = data.images.filter((uri) => !originalImages.includes(uri));
          const removedImages = originalImages.filter((uri) => !data.images.includes(uri));
          const savedNewUris: string[] = [];
          for (const uri of newImageUris) {
            try {
              const saved = await saveNoteImage(data.noteId!, uri);
              savedNewUris.push(saved);
            } catch (e) {
              for (const copied of savedNewUris) { await deleteNoteImage(copied); }
              throw e;
            }
          }
          const originalMemos = existing.voiceMemos || [];
          const keptMemos = data.voiceMemos.filter((u) => originalMemos.includes(u));
          const newMemoUris = data.voiceMemos.filter((u) => !originalMemos.includes(u));
          const removedMemos = originalMemos.filter((u) => !data.voiceMemos.includes(u));
          const savedNewMemos: string[] = [];
          for (const memoUri of newMemoUris) {
            try {
              const saved = await saveVoiceMemo(data.noteId!, memoUri);
              savedNewMemos.push(saved);
            } catch (e) {
              for (const copied of savedNewMemos) { await deleteVoiceMemo(copied); }
              for (const copied of savedNewUris) { await deleteNoteImage(copied); }
              throw e;
            }
          }
          try {
            const finalImages = [...keptImages, ...savedNewUris];
            const finalMemos = [...keptMemos, ...savedNewMemos];
            await updateNote({
              ...existing,
              text: data.text,
              color: data.color,
              fontColor: data.fontColor,
              icon: data.icon,
              updatedAt: now,
              images: finalImages.length > 0 ? finalImages : undefined,
              voiceMemos: finalMemos.length > 0 ? finalMemos : undefined,
            });
          } catch (e) {
            for (const uri of savedNewUris) { await deleteNoteImage(uri); }
            for (const uri of savedNewMemos) { await deleteVoiceMemo(uri); }
            throw e;
          }
          for (const uri of removedImages) { await deleteNoteImage(uri); }
          for (const uri of removedMemos) { await deleteVoiceMemo(uri); }
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
    const targetNote = notes.find(n => n.id === id);
    if (targetNote?.voiceMemos?.length) {
      await deleteAllVoiceMemos(targetNote.voiceMemos);
    }
    await permanentlyDeleteNote(id);
    await loadData();
    refreshWidgets();
  };

  const handlePlayToggle = (memo: VoiceMemo) => {
    if (playingMemoId === memo.id) {
      stopPlayback();
      return;
    }
    stopPlayback();
    const p = createAudioPlayer({ uri: memo.uri });
    playerRef.current = p;
    setPlayingMemoId(memo.id);
    const sub = p.addListener('playbackStatusUpdate', (status: any) => {
      if (status.didJustFinish) {
        playerListenerRef.current = null;
        sub.remove();
        stopPlayback();
        setPlaybackProgress(prev => ({ ...prev, [memo.id]: 0 }));
      }
    });
    playerListenerRef.current = sub;
    playbackIntervalRef.current = setInterval(() => {
      const current = playerRef.current;
      if (!current) return;
      try {
        if (current.duration > 0) {
          setPlaybackProgress(prev => ({
            ...prev,
            [memo.id]: current.currentTime / current.duration,
          }));
        }
      } catch { /* player might be released */ }
    }, 500);
    p.play();
  };

  const handleDeleteVoiceMemo = async (id: string) => {
    hapticHeavy();
    const memo = voiceMemos.find(m => m.id === id);
    if (!memo) return;
    if (playingMemoId === id) stopPlayback();
    setDeletedVoiceMemo(memo);
    await unpinVoiceMemo(id);
    await VMStore.deleteVoiceMemo(id);
    await reloadVoiceMemos();
    refreshWidgets();
    setVoiceUndoKey(k => k + 1);
    setShowVoiceUndo(true);
  };

  const handleRestoreVoiceMemo = async (id: string) => {
    hapticLight();
    await VMStore.restoreVoiceMemo(id);
    await reloadVoiceMemos();
    refreshWidgets();
  };

  const handlePermanentDeleteVoiceMemo = async (id: string) => {
    hapticHeavy();
    const memo = voiceMemos.find(m => m.id === id);
    if (memo) {
      await deleteVoiceMemoFile(memo.uri);
    }
    await VMStore.permanentlyDeleteVoiceMemo(id);
    await reloadVoiceMemos();
    refreshWidgets();
  };

  const handleUndoDeleteVoiceMemo = async () => {
    setShowVoiceUndo(false);
    if (!deletedVoiceMemo) return;
    await VMStore.restoreVoiceMemo(deletedVoiceMemo.id);
    await reloadVoiceMemos();
    refreshWidgets();
    setDeletedVoiceMemo(null);
  };

  const handleVoiceUndoDismiss = () => {
    setShowVoiceUndo(false);
    setDeletedVoiceMemo(null);
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

  const handleToggleVoiceMemoPin = async (id: string) => {
    hapticMedium();
    const currentlyPinned = isVoiceMemoPinned(id, pinnedVoiceMemoIds);
    if (!currentlyPinned && pinnedVoiceMemoIds.length >= MAX_VOICE_MEMO_PINS) {
      ToastAndroid.show('Voice memo pins full \u2014 unpin one first', ToastAndroid.SHORT);
      return;
    }
    await togglePinVoiceMemo(id);
    const updated = await getPinnedVoiceMemos();
    setPinnedVoiceMemoIds(updated);
    refreshWidgets();
    ToastAndroid.show(
      currentlyPinned ? 'Unpinned' : 'Pinned to widget',
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

  const sortedVoiceMemos = useMemo(() => {
    if (filter === 'deleted') {
      return voiceMemos
        .filter((m) => !!m.deletedAt)
        .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
    }
    const active = voiceMemos.filter((m) => !m.deletedAt);
    const pinned = active.filter((m) => isVoiceMemoPinned(m.id, pinnedVoiceMemoIds));
    const unpinned = active.filter((m) => !isVoiceMemoPinned(m.id, pinnedVoiceMemoIds));
    pinned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    unpinned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return [...pinned, ...unpinned];
  }, [voiceMemos, pinnedVoiceMemoIds, filter]);

  const listData: ListItem[] = useMemo(() => {
    const noteItems: ListItem[] = sorted.map((n) => ({ type: 'note' as const, data: n }));
    const voiceItems: ListItem[] = sortedVoiceMemos.map((m) => ({ type: 'voiceMemo' as const, data: m }));
    if (contentFilter === 'notes') return noteItems;
    if (contentFilter === 'voice') return voiceItems;
    return [...noteItems, ...voiceItems].sort((a, b) =>
      new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime(),
    );
  }, [sorted, sortedVoiceMemos, contentFilter]);

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
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(30, 30, 50, 0.8)',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
      marginBottom: 8,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconCircleText: {
      fontSize: 16,
    },
    cardCenter: {
      flex: 1,
      marginHorizontal: 12,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    cardSubtitle: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.5)',
      marginTop: 2,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
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
      fontSize: 12,
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
      fontSize: 11,
      fontWeight: '600',
      color: '#EF4444',
    },
    deletedAgo: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
      fontStyle: 'italic',
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
    contentFilterRow: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    contentTab: {
      paddingHorizontal: 24,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: 'rgba(30, 30, 40, 0.7)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    contentTabActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    contentTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    contentTabTextActive: {
      fontWeight: '700',
    },
  }), [colors, insets.bottom, insets.top]);

  const renderDeletedItem = (item: Note) => (
    <View style={[styles.card, { borderLeftColor: item.color, opacity: 0.7 }]}>
      <View style={[styles.iconCircle, { backgroundColor: item.color, opacity: 0.6 }]}>
        <Text style={styles.iconCircleText}>{item.icon || '\u{1F4DD}'}</Text>
      </View>
      <View style={styles.cardCenter}>
        <Text style={[styles.cardTitle, { opacity: 0.7 }]} numberOfLines={2}>
          {item.text}
        </Text>
        <Text style={styles.deletedAgo}>
          {formatDeletedAgo(item.deletedAt!)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => handleRestore(item.id)} style={styles.restoreBtn} activeOpacity={0.7}>
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePermanentDelete(item.id)} style={styles.foreverBtn} activeOpacity={0.7}>
          <Text style={styles.foreverText}>Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeletedVoiceMemo = (memo: VoiceMemo) => (
    <View style={[styles.card, { borderLeftColor: '#A29BFE', opacity: 0.7 }]}>
      <View style={[styles.iconCircle, { backgroundColor: '#A29BFE', opacity: 0.6 }]}>
        <Text style={styles.iconCircleText}>{'\u{1F399}\uFE0F'}</Text>
      </View>
      <View style={styles.cardCenter}>
        <Text style={[styles.cardTitle, { opacity: 0.7 }]} numberOfLines={2}>
          {memo.title || 'Voice Memo'}
        </Text>
        <Text style={styles.deletedAgo}>
          {formatDeletedAgo(memo.deletedAt!)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => handleRestoreVoiceMemo(memo.id)} style={styles.restoreBtn} activeOpacity={0.7}>
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePermanentDeleteVoiceMemo(memo.id)} style={styles.foreverBtn} activeOpacity={0.7}>
          <Text style={styles.foreverText}>Forever</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActiveItem = (item: Note) => {
    const pinned = isNotePinned(item.id, pinnedIds);
    const firstLine = item.text.split('\n')[0];
    const truncated = firstLine.length > 50 ? firstLine.slice(0, 50) + '\u2026' : firstLine;
    return (
      <View style={[styles.card, { borderLeftColor: item.color }]}>
        <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
          <Text style={styles.iconCircleText}>{item.icon || '\u{1F4DD}'}</Text>
        </View>
        <TouchableOpacity
          style={styles.cardCenter}
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
          <Text style={styles.cardTitle} numberOfLines={1}>{truncated}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {getRelativeTime(item.updatedAt)}
            {pinned ? ' \u00B7 \u{1F4CC}' : ''}
            {(item.images?.length ?? 0) > 0 ? ` \u00B7 \u{1F4F7} ${item.images!.length}` : ''}
          </Text>
        </TouchableOpacity>
        <View style={styles.cardActions}>
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
    );
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'note') {
      if (item.data.deletedAt) return renderDeletedItem(item.data);
      return renderActiveItem(item.data);
    }
    const m = item.data;
    if (m.deletedAt) return renderDeletedVoiceMemo(m);
    return (
      <VoiceMemoCard
        memo={m}
        onPress={() => { hapticLight(); navigation.navigate('VoiceMemoDetail', { memoId: m.id }); }}
        onPlayToggle={() => handlePlayToggle(m)}
        isPlaying={playingMemoId === m.id}
        playbackProgress={playbackProgress[m.id] || 0}
        onPin={() => handleToggleVoiceMemoPin(m.id)}
        isPinned={isVoiceMemoPinned(m.id, pinnedVoiceMemoIds)}
        onDelete={() => handleDeleteVoiceMemo(m.id)}
      />
    );
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
    if (contentFilter === 'voice') {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'\u{1F399}\uFE0F'}</Text>
          <Text style={styles.emptyText}>{voiceEmptyMsg}</Text>
        </View>
      );
    }
    if (contentFilter === 'notes') {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'\u{1F4DD}'}</Text>
          <Text style={styles.emptyTitle}>No notes yet</Text>
          <Text style={styles.emptyText}>
            Tap the notepad to create one.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>{'\u{1F4DD}'}</Text>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptyText}>
          Record a voice memo or create a note to get started.
        </Text>
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

        <View style={styles.contentFilterRow}>
          {(['voice', 'all', 'notes'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.contentTab, contentFilter === tab && styles.contentTabActive]}
              onPress={() => { hapticLight(); setContentFilter(tab); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.contentTabText, contentFilter === tab && styles.contentTabTextActive]}>
                {tab === 'all' ? 'All' : tab === 'notes' ? 'Notes' : 'Voice'}
              </Text>
            </TouchableOpacity>
          ))}
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

        {listData.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) => `${item.type}-${item.data.id}`}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          style={[styles.fab, { left: 20 }]}
          onPress={() => { hapticLight(); navigation.navigate('VoiceRecord'); }}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>{'\u{1F399}\uFE0F'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, { right: 20 }]}
          onPress={() => { hapticLight(); openNewEditor(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>{'\u{1F4DD}'}</Text>
        </TouchableOpacity>

        <UndoToast
          key={undoKey}
          visible={showUndo}
          message="Note deleted"
          onUndo={handleUndoDelete}
          onDismiss={handleUndoDismiss}
        />
        <UndoToast
          key={`voice-${voiceUndoKey}`}
          visible={showVoiceUndo}
          message={VOICE_DELETE_TOASTS[Math.floor(Math.random() * VOICE_DELETE_TOASTS.length)]}
          onUndo={handleUndoDeleteVoiceMemo}
          onDismiss={handleVoiceUndoDismiss}
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

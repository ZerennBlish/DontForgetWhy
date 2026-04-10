import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ToastAndroid, AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useFocusEffect } from '@react-navigation/native';
import {
  getNotes,
  getAllNotes,
  addNote,
  updateNote,
  deleteNote,
  restoreNote,
  permanentlyDeleteNote,
  peekPendingNoteAction,
  clearPendingNoteAction,
} from '../services/noteStorage';
import { saveNoteImage, deleteNoteImage, cleanupTempDrawings } from '../services/noteImageStorage';
import { saveVoiceMemo, deleteVoiceMemo, deleteAllVoiceMemos } from '../services/noteVoiceMemoStorage';
import {
  getPinnedNotes,
  togglePinNote,
  unpinNote,
  pruneNotePins,
  isNotePinned,
} from '../services/widgetPins';
import { kvGet, kvSet } from '../services/database';
import { refreshWidgets } from '../widget/updateWidget';
import { loadBackground, getOverlayOpacity } from '../services/backgroundStorage';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';
import { CUSTOM_BG_COLOR_KEY, CUSTOM_FONT_COLOR_KEY } from '../types/note';
import type { Note } from '../types/note';

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

interface EditorSaveData {
  text: string;
  color: string;
  fontColor: string | null;
  icon: string;
  isNew: boolean;
  noteId?: string;
  images: string[];
  voiceMemos: string[];
}

interface UseNotepadParams {
  routeParams: { noteId?: string; newNote?: boolean } | undefined;
}

interface UseNotepadResult {
  notes: Note[];
  pinnedIds: string[];
  filter: 'active' | 'deleted';
  showFilter: boolean;
  editorVisible: boolean;
  editingNote: Note | null;
  customBgColor: string | null;
  customFontColor: string | null;
  showUndo: boolean;
  undoKey: number;
  bgUri: string | null;
  bgOpacity: number;
  sorted: Note[];
  editorDirtyRef: React.MutableRefObject<boolean>;
  setBgUri: React.Dispatch<React.SetStateAction<string | null>>;

  setFilter: (f: 'active' | 'deleted') => void;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;

  openNewEditor: () => void;
  openEditorWithNote: (note: Note) => void;
  closeEditor: () => void;
  handleEditorSave: (data: EditorSaveData) => Promise<void>;
  handleEditorDelete: (noteId: string) => Promise<void>;
  handleDeleteFromList: (id: string) => Promise<void>;
  handleUndoDelete: () => Promise<void>;
  handleUndoDismiss: () => void;
  handleRestore: (id: string) => Promise<void>;
  handlePermanentDelete: (id: string) => Promise<void>;
  handleTogglePin: (id: string) => Promise<void>;
  onCustomBgColorChange: (c: string) => void;
  onCustomFontColorChange: (c: string) => void;
}

export function useNotepad({ routeParams }: UseNotepadParams): UseNotepadResult {
  const [notes, setNotes] = useState<Note[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'active' | 'deleted'>('active');
  const [showFilter, setShowFilter] = useState(false);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [customBgColor, setCustomBgColor] = useState<string | null>(null);
  const [customFontColor, setCustomFontColor] = useState<string | null>(null);

  const [deletedNote, setDeletedNote] = useState<Note | null>(null);
  const [deletedNotePinned, setDeletedNotePinned] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoKey, setUndoKey] = useState(0);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);

  const handledActionRef = useRef('');
  // Tracks the routeParams object that handledActionRef was set against.
  // The routeParams effect re-runs whenever editorVisible flips (e.g.,
  // user dismisses the editor) — without this guard the stale params
  // would re-trigger and immediately reopen the editor, trapping the
  // user in an unclosable modal.
  const handledRouteParamsRef = useRef<typeof routeParams>(undefined);
  // NoteEditorModal writes to this whenever its content diverges from
  // the loaded baseline. Read it (not editorVisible alone) when deciding
  // whether a pending widget action is safe to preempt the editor.
  const editorDirtyRef = useRef(false);

  // Custom bg/font color migration
  useEffect(() => {
    const bg = kvGet(CUSTOM_BG_COLOR_KEY);
    const fc = kvGet(CUSTOM_FONT_COLOR_KEY);
    const validHex = /^#[0-9A-Fa-f]{6}$/;
    let resolvedBg = bg;
    let resolvedFc = fc;
    if (!bg) {
      const oldBg = kvGet('noteCustomBgColor');
      if (oldBg && validHex.test(oldBg)) {
        resolvedBg = oldBg;
        kvSet(CUSTOM_BG_COLOR_KEY, oldBg);
      }
    }
    if (!fc) {
      const oldFc = kvGet('noteCustomFontColor');
      if (oldFc && validHex.test(oldFc)) {
        resolvedFc = oldFc;
        kvSet(CUSTOM_FONT_COLOR_KEY, oldFc);
      }
    }
    if (resolvedBg && validHex.test(resolvedBg)) { setCustomBgColor(resolvedBg); }
    if (resolvedFc && validHex.test(resolvedFc)) { setCustomFontColor(resolvedFc); }
  }, []);

  const loadData = useCallback(async () => {
    let loaded = await getAllNotes(true);

    const onboarded = kvGet('notepadOnboarded');
    if (!onboarded && !welcomeNoteCreating && loaded.filter((n) => !n.deletedAt).length === 0) {
      welcomeNoteCreating = true;
      kvSet('notepadOnboarded', 'true');
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

  const openNewEditor = useCallback(() => {
    setEditingNote(null);
    setEditorVisible(true);
  }, []);

  const openEditorWithNote = useCallback((note: Note) => {
    setEditingNote(note);
    setEditorVisible(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorVisible(false);
    setEditingNote(null);
    // NOTE: do not reset handledActionRef here — the routeParams effect
    // re-runs when editorVisible flips, and a reset here would let stale
    // params reopen the editor immediately. The ref is now reset only
    // when routeParams actually changes (see effect below).
    cleanupTempDrawings();
  }, []);

  // Handle route params and pending actions
  useEffect(() => {
    const params = routeParams;

    // Reset the handled marker only when routeParams actually changes
    // (a fresh navigation), not when editorVisible flips.
    if (handledRouteParamsRef.current !== params) {
      handledRouteParamsRef.current = params;
      handledActionRef.current = '';
    }

    const actionKey = params?.noteId
      ? `edit:${params.noteId}`
      : params?.newNote
        ? 'new'
        : '';

    if (actionKey && actionKey === handledActionRef.current) return;

    const isInitial = handledActionRef.current === '';

    const handle = async () => {
      if (params?.newNote) {
        if (editorVisible && editorDirtyRef.current) {
          // Editor has unsaved work — don't interrupt
          return;
        }
        handledActionRef.current = 'new';
        openNewEditor();
        return;
      }
      if (params?.noteId) {
        if (editorVisible && editorDirtyRef.current) {
          // Editor has unsaved work — don't interrupt
          return;
        }
        handledActionRef.current = `edit:${params.noteId}`;
        const all = await getNotes();
        const found = all.find((n) => n.id === params.noteId);
        if (found) openEditorWithNote(found);
        return;
      }

      if (!isInitial) return;
      // Peek at the pending action — don't remove it yet. That way a
      // dirty editor can skip this check and the action survives for
      // the next foreground/mount pass.
      const action = peekPendingNoteAction();
      if (!action) return;
      if (editorVisible && editorDirtyRef.current) {
        // Leave the action in storage for the next check
        return;
      }
      handledActionRef.current = '__init__';
      clearPendingNoteAction();
      if (action.type === 'new') {
        openNewEditor();
      } else if ((action.type === 'edit' || action.type === 'open') && action.noteId) {
        const all = await getNotes();
        const found = all.find((n) => n.id === action.noteId);
        if (found) openEditorWithNote(found);
      }
    };

    handle();
  }, [routeParams, editorVisible, openNewEditor, openEditorWithNote]);

  // Check pending widget actions when app foregrounds while already mounted
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const action = peekPendingNoteAction();
      if (!action) return;
      if (editorVisible && editorDirtyRef.current) {
        // Editor has unsaved work — leave the action in storage
        return;
      }
      const actionKey =
        action.type === 'new'
          ? 'new'
          : action.type === 'edit' || action.type === 'open'
            ? `edit:${action.noteId}`
            : '';
      if (actionKey && actionKey === handledActionRef.current) {
        // Already handled; drop the stale pending entry so it doesn't
        // keep triggering dirty checks on subsequent resumes.
        clearPendingNoteAction();
        return;
      }
      clearPendingNoteAction();
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
  }, [editorVisible, openNewEditor, openEditorWithNote]);

  const handleEditorSave = async (data: EditorSaveData) => {
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

  const handleDeleteFromList = useCallback(async (id: string) => {
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
  }, [notes, pinnedIds, loadData]);

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

  const handleRestore = useCallback(async (id: string) => {
    hapticLight();
    await restoreNote(id);
    await loadData();
    refreshWidgets();
  }, [loadData]);

  const handlePermanentDelete = useCallback(async (id: string) => {
    hapticHeavy();
    const targetNote = notes.find(n => n.id === id);
    if (targetNote?.voiceMemos?.length) {
      await deleteAllVoiceMemos(targetNote.voiceMemos);
    }
    await permanentlyDeleteNote(id);
    await loadData();
    refreshWidgets();
  }, [notes, loadData]);

  const handleTogglePin = useCallback(async (id: string) => {
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
  }, [pinnedIds]);

  const onCustomBgColorChange = useCallback((c: string) => {
    setCustomBgColor(c);
    kvSet(CUSTOM_BG_COLOR_KEY, c);
  }, []);

  const onCustomFontColorChange = useCallback((c: string) => {
    setCustomFontColor(c);
    kvSet(CUSTOM_FONT_COLOR_KEY, c);
  }, []);

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

  return {
    notes,
    pinnedIds,
    filter,
    showFilter,
    editorVisible,
    editingNote,
    customBgColor,
    customFontColor,
    showUndo,
    undoKey,
    bgUri,
    bgOpacity,
    sorted,
    editorDirtyRef,
    setBgUri,

    setFilter,
    setShowFilter,

    openNewEditor,
    openEditorWithNote,
    closeEditor,
    handleEditorSave,
    handleEditorDelete,
    handleDeleteFromList,
    handleUndoDelete,
    handleUndoDismiss,
    handleRestore,
    handlePermanentDelete,
    handleTogglePin,
    onCustomBgColorChange,
    onCustomFontColorChange,
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Note } from '../types/note';

const NOTES_KEY = 'notes';
const PENDING_ACTION_KEY = 'pendingNoteAction';

export interface PendingNoteAction {
  type: 'open' | 'edit' | 'new';
  noteId?: string;
}

async function _loadAllNotes(): Promise<Note[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item: unknown): item is Record<string, unknown> =>
          item !== null &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>).id === 'string' &&
          typeof (item as Record<string, unknown>).text === 'string' &&
          typeof (item as Record<string, unknown>).createdAt === 'string',
      )
      .map((item): Note => ({
        id: item.id as string,
        text: item.text as string,
        createdAt: item.createdAt as string,
        color: typeof item.color === 'string' ? item.color : '#FFFFFF',
        icon: typeof item.icon === 'string' ? item.icon : '',
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : (item.createdAt as string),
        pinned: typeof item.pinned === 'boolean' ? item.pinned : false,
        fontColor: typeof item.fontColor === 'string' ? item.fontColor : null,
        deletedAt: typeof item.deletedAt === 'string' ? item.deletedAt : null,
      }));
  } catch {
    return [];
  }
}

export async function getNotes(): Promise<Note[]> {
  const all = await _loadAllNotes();
  return all.filter((n) => !n.deletedAt);
}

export async function getAllNotes(includeDeleted = false): Promise<Note[]> {
  const all = await _loadAllNotes();
  if (includeDeleted) return all;
  return all.filter((n) => !n.deletedAt);
}

async function _saveNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export async function addNote(note: Note): Promise<Note[]> {
  const notes = await _loadAllNotes();
  notes.push(note);
  await _saveNotes(notes);
  return notes.filter((n) => !n.deletedAt);
}

export async function updateNote(updated: Note): Promise<Note[]> {
  const notes = await _loadAllNotes();
  const idx = notes.findIndex((n) => n.id === updated.id);
  if (idx !== -1) {
    notes[idx] = updated;
    await _saveNotes(notes);
  }
  return notes.filter((n) => !n.deletedAt);
}

export async function deleteNote(id: string): Promise<Note[]> {
  const notes = await _loadAllNotes();
  const updated = notes.map((n) =>
    n.id === id ? { ...n, deletedAt: new Date().toISOString(), pinned: false } : n,
  );
  await _saveNotes(updated);
  return updated.filter((n) => !n.deletedAt);
}

export async function restoreNote(id: string): Promise<Note[]> {
  const notes = await _loadAllNotes();
  const updated = notes.map((n) =>
    n.id === id ? { ...n, deletedAt: null } : n,
  );
  await _saveNotes(updated);
  return updated.filter((n) => !n.deletedAt);
}

export async function permanentlyDeleteNote(id: string): Promise<Note[]> {
  const notes = await _loadAllNotes();
  const updated = notes.filter((n) => n.id !== id);
  await _saveNotes(updated);
  return updated.filter((n) => !n.deletedAt);
}

export async function purgeDeletedNotes(): Promise<void> {
  const notes = await _loadAllNotes();
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const kept = notes.filter(
    (n) => !n.deletedAt || new Date(n.deletedAt).getTime() > cutoff,
  );
  if (kept.length !== notes.length) {
    await _saveNotes(kept);
  }
}

export async function setPendingNoteAction(action: PendingNoteAction): Promise<void> {
  await AsyncStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
}

export async function getPendingNoteAction(): Promise<PendingNoteAction | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_ACTION_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(PENDING_ACTION_KEY);
    return JSON.parse(raw) as PendingNoteAction;
  } catch {
    return null;
  }
}

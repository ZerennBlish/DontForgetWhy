import { getDb } from './database';
import { kvGet, kvSet, kvRemove } from './database';
import type { Note } from '../types/note';
import { deleteAllNoteImages } from './noteImageStorage';
import { safeParse, safeParseArray } from '../utils/safeParse';

const PENDING_ACTION_KEY = 'pendingNoteAction';

export interface PendingNoteAction {
  type: 'open' | 'edit' | 'new';
  noteId?: string;
}

// ---------------------------------------------------------------------------
// Row type & conversion
// ---------------------------------------------------------------------------

interface NoteRow {
  id: string;
  title: string | null;
  text: string;
  color: string;
  icon: string;
  fontColor: string | null;
  pinned: number;
  images: string | null;
  voiceMemos: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title ?? '',
    text: row.text,
    color: row.color || '#FFFFFF',
    icon: row.icon || '',
    fontColor: row.fontColor,
    pinned: !!row.pinned,
    images: row.images ? safeParseArray<string>(row.images) : undefined,
    voiceMemos: row.voiceMemos ? safeParseArray<string>(row.voiceMemos) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getNotes(): Promise<Note[]> {
  const db = getDb();
  const rows = db.getAllSync<NoteRow>('SELECT * FROM notes WHERE deletedAt IS NULL');
  return rows.map(rowToNote);
}

export async function getAllNotes(includeDeleted = false): Promise<Note[]> {
  const db = getDb();
  const sql = includeDeleted
    ? 'SELECT * FROM notes'
    : 'SELECT * FROM notes WHERE deletedAt IS NULL';
  return db.getAllSync<NoteRow>(sql).map(rowToNote);
}

export function getNoteById(id: string): Note | null {
  const db = getDb();
  const row = db.getFirstSync<NoteRow>('SELECT * FROM notes WHERE id = ?', [id]);
  return row ? rowToNote(row) : null;
}

export async function addNote(note: Note): Promise<Note[]> {
  const db = getDb();
  db.runSync(
    `INSERT INTO notes (id, title, text, color, icon, fontColor, pinned, images, voiceMemos, createdAt, updatedAt, deletedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [note.id, note.title || '', note.text, note.color, note.icon || '', note.fontColor ?? null,
     note.pinned ? 1 : 0, note.images ? JSON.stringify(note.images) : null,
     note.voiceMemos ? JSON.stringify(note.voiceMemos) : null,
     note.createdAt, note.updatedAt || note.createdAt, note.deletedAt ?? null],
  );
  return getNotes();
}

export async function updateNote(updated: Note): Promise<Note[]> {
  const db = getDb();
  db.runSync(
    `UPDATE notes SET title=?, text=?, color=?, icon=?, fontColor=?, pinned=?, images=?, voiceMemos=?, updatedAt=?, deletedAt=?
     WHERE id=?`,
    [updated.title || '', updated.text, updated.color, updated.icon || '', updated.fontColor ?? null,
     updated.pinned ? 1 : 0, updated.images ? JSON.stringify(updated.images) : null,
     updated.voiceMemos ? JSON.stringify(updated.voiceMemos) : null,
     updated.updatedAt, updated.deletedAt ?? null, updated.id],
  );
  return getNotes();
}

export async function deleteNote(id: string): Promise<Note[]> {
  const db = getDb();
  db.runSync(
    'UPDATE notes SET deletedAt=?, pinned=0 WHERE id=?',
    [new Date().toISOString(), id],
  );
  return getNotes();
}

export async function restoreNote(id: string): Promise<Note[]> {
  const db = getDb();
  db.runSync('UPDATE notes SET deletedAt=NULL WHERE id=?', [id]);
  return getNotes();
}

export async function permanentlyDeleteNote(id: string): Promise<Note[]> {
  const db = getDb();
  const row = db.getFirstSync<NoteRow>('SELECT * FROM notes WHERE id=?', [id]);
  if (row?.images) {
    const imgs = safeParseArray<string>(row.images);
    await deleteAllNoteImages(imgs);
  }
  db.runSync('DELETE FROM notes WHERE id=?', [id]);
  return getNotes();
}

export async function purgeDeletedNotes(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const toPurge = db.getAllSync<NoteRow>(
    'SELECT * FROM notes WHERE deletedAt IS NOT NULL AND deletedAt <= ?',
    [cutoff],
  );
  for (const row of toPurge) {
    if (row.images) {
      const imgs = safeParseArray<string>(row.images);
      await deleteAllNoteImages(imgs);
    }
  }
  db.runSync(
    'DELETE FROM notes WHERE deletedAt IS NOT NULL AND deletedAt <= ?',
    [cutoff],
  );
}

// ---------------------------------------------------------------------------
// Pending note action (widget → screen)
// ---------------------------------------------------------------------------

export async function setPendingNoteAction(action: PendingNoteAction): Promise<void> {
  kvSet(PENDING_ACTION_KEY, JSON.stringify({ ...action, timestamp: Date.now() }));
}

export async function getPendingNoteAction(): Promise<PendingNoteAction | null> {
  try {
    const raw = kvGet(PENDING_ACTION_KEY);
    if (!raw) return null;
    kvRemove(PENDING_ACTION_KEY);
    const parsed = safeParse<(PendingNoteAction & { timestamp?: number }) | null>(raw, null);
    if (!parsed) return null;
    if (parsed.timestamp && Date.now() - parsed.timestamp > 30_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Read the pending note action WITHOUT removing it from storage.
 * Callers must explicitly call clearPendingNoteAction() once they've
 * successfully processed the action. This lets a caller skip processing
 * (e.g. editor is dirty) without losing the action for the next check.
 */
export function peekPendingNoteAction(): PendingNoteAction | null {
  try {
    const raw = kvGet(PENDING_ACTION_KEY);
    if (!raw) return null;
    const parsed = safeParse<(PendingNoteAction & { timestamp?: number }) | null>(raw, null);
    if (!parsed) return null;
    if (parsed.timestamp && Date.now() - parsed.timestamp > 30_000) {
      // Expired — remove it proactively so it doesn't linger in storage.
      kvRemove(PENDING_ACTION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingNoteAction(): void {
  try { kvRemove(PENDING_ACTION_KEY); } catch {}
}

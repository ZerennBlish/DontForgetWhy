import { getDb } from './database';
import { getClipSummaries, deleteAllClipsForMemo } from './voiceClipStorage';
import type { VoiceMemo } from '../types/voiceMemo';

// ---------------------------------------------------------------------------
// Row type & conversion
// ---------------------------------------------------------------------------

interface VoiceMemoRow {
  id: string;
  uri: string;
  title: string;
  note: string;
  duration: number;
  noteId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function rowToMemo(row: VoiceMemoRow): VoiceMemo {
  return {
    id: row.id,
    uri: row.uri,
    title: row.title,
    note: row.note || '',
    duration: row.duration || 0,
    noteId: row.noteId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getVoiceMemos(): Promise<VoiceMemo[]> {
  const db = getDb();
  const rows = db.getAllSync<VoiceMemoRow>('SELECT * FROM voice_memos WHERE deletedAt IS NULL');
  const memos = rows.map(rowToMemo);
  const ids = memos.map((m) => m.id);
  const summaries = getClipSummaries(ids);
  for (const memo of memos) {
    const summary = summaries.get(memo.id);
    memo.clipCount = summary?.clipCount ?? 0;
    memo.totalDuration = summary?.totalDuration ?? 0;
  }
  return memos;
}

export async function getAllVoiceMemos(): Promise<VoiceMemo[]> {
  const db = getDb();
  return db.getAllSync<VoiceMemoRow>('SELECT * FROM voice_memos').map(rowToMemo);
}

export function getVoiceMemoById(id: string): VoiceMemo | null {
  const db = getDb();
  const row = db.getFirstSync<VoiceMemoRow>('SELECT * FROM voice_memos WHERE id = ?', [id]);
  return row ? rowToMemo(row) : null;
}

export async function addVoiceMemo(memo: VoiceMemo): Promise<void> {
  const db = getDb();
  db.runSync(
    `INSERT INTO voice_memos (id, uri, title, note, duration, noteId, createdAt, updatedAt, deletedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [memo.id, memo.uri, memo.title, memo.note || '', memo.duration || 0,
     memo.noteId ?? null, memo.createdAt, memo.updatedAt, memo.deletedAt ?? null],
  );
}

export async function updateVoiceMemo(updated: VoiceMemo): Promise<void> {
  const db = getDb();
  db.runSync(
    `UPDATE voice_memos SET uri=?, title=?, note=?, duration=?, noteId=?, updatedAt=?, deletedAt=?
     WHERE id=?`,
    [updated.uri, updated.title, updated.note || '', updated.duration || 0,
     updated.noteId ?? null, updated.updatedAt, updated.deletedAt ?? null, updated.id],
  );
}

export async function deleteVoiceMemo(id: string): Promise<void> {
  const db = getDb();
  db.runSync(
    'UPDATE voice_memos SET deletedAt=? WHERE id=?',
    [new Date().toISOString(), id],
  );
}

export async function restoreVoiceMemo(id: string): Promise<void> {
  const db = getDb();
  db.runSync('UPDATE voice_memos SET deletedAt=NULL WHERE id=?', [id]);
}

export async function permanentlyDeleteVoiceMemo(id: string): Promise<void> {
  await deleteAllClipsForMemo(id);
  const db = getDb();
  db.runSync('DELETE FROM voice_memos WHERE id=?', [id]);
}

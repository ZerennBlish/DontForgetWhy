import { getDb } from './database';
import { deleteVoiceMemoFile } from './voiceMemoFileStorage';
import type { VoiceClip } from '../types/voiceClip';

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

interface VoiceClipRow {
  id: string;
  memoId: string;
  uri: string;
  duration: number;
  position: number;
  label: string | null;
  createdAt: string;
}

function rowToClip(row: VoiceClipRow): VoiceClip {
  return {
    id: row.id,
    memoId: row.memoId,
    uri: row.uri,
    duration: row.duration || 0,
    position: row.position || 0,
    label: row.label,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getClipsForMemo(memoId: string): VoiceClip[] {
  const db = getDb();
  return db
    .getAllSync<VoiceClipRow>(
      'SELECT * FROM voice_clips WHERE memoId = ? ORDER BY position ASC',
      [memoId],
    )
    .map(rowToClip);
}

export function getClipById(clipId: string): VoiceClip | null {
  const db = getDb();
  const row = db.getFirstSync<VoiceClipRow>(
    'SELECT * FROM voice_clips WHERE id = ?',
    [clipId],
  );
  return row ? rowToClip(row) : null;
}

export function getClipSummary(memoId: string): { clipCount: number; totalDuration: number } {
  const db = getDb();
  const row = db.getFirstSync<{ cnt: number; total: number }>(
    'SELECT COUNT(*) as cnt, COALESCE(SUM(duration), 0) as total FROM voice_clips WHERE memoId = ?',
    [memoId],
  );
  return { clipCount: row?.cnt ?? 0, totalDuration: row?.total ?? 0 };
}

export function getClipSummaries(memoIds: string[]): Map<string, { clipCount: number; totalDuration: number }> {
  if (memoIds.length === 0) return new Map();
  const db = getDb();
  const placeholders = memoIds.map(() => '?').join(',');
  const rows = db.getAllSync<{ memoId: string; cnt: number; total: number }>(
    `SELECT memoId, COUNT(*) as cnt, COALESCE(SUM(duration), 0) as total
     FROM voice_clips WHERE memoId IN (${placeholders}) GROUP BY memoId`,
    memoIds,
  );
  const map = new Map<string, { clipCount: number; totalDuration: number }>();
  for (const r of rows) {
    map.set(r.memoId, { clipCount: r.cnt, totalDuration: r.total });
  }
  for (const id of memoIds) {
    if (!map.has(id)) map.set(id, { clipCount: 0, totalDuration: 0 });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export function addClip(clip: VoiceClip): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO voice_clips (id, memoId, uri, duration, position, label, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [clip.id, clip.memoId, clip.uri, clip.duration, clip.position, clip.label, clip.createdAt],
  );
}

export function getNextClipPosition(memoId: string): number {
  const db = getDb();
  const row = db.getFirstSync<{ maxPos: number | null }>(
    'SELECT MAX(position) as maxPos FROM voice_clips WHERE memoId = ?',
    [memoId],
  );
  return (row?.maxPos ?? -1) + 1;
}

export function updateClipLabel(clipId: string, label: string | null): void {
  const db = getDb();
  db.runSync('UPDATE voice_clips SET label = ? WHERE id = ?', [label, clipId]);
}

export async function deleteClip(clipId: string): Promise<void> {
  const db = getDb();
  const row = db.getFirstSync<{ uri: string }>(
    'SELECT uri FROM voice_clips WHERE id = ?',
    [clipId],
  );
  if (row?.uri) {
    await deleteVoiceMemoFile(row.uri);
  }
  db.runSync('DELETE FROM voice_clips WHERE id = ?', [clipId]);
}

export async function deleteAllClipsForMemo(memoId: string): Promise<void> {
  const db = getDb();
  const rows = db.getAllSync<{ uri: string }>(
    'SELECT uri FROM voice_clips WHERE memoId = ?',
    [memoId],
  );
  for (const r of rows) {
    if (r.uri) await deleteVoiceMemoFile(r.uri).catch(() => {});
  }
  db.runSync('DELETE FROM voice_clips WHERE memoId = ?', [memoId]);
}

export function getAllClips(): VoiceClip[] {
  const db = getDb();
  return db.getAllSync<VoiceClipRow>('SELECT * FROM voice_clips').map(rowToClip);
}

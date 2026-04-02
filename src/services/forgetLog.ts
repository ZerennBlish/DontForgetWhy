import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';

export interface ForgetEntry {
  id: string;
  alarmNote: string;
  alarmNickname?: string;
  alarmIcon?: string;
  alarmCategory: string;
  result: 'loss' | 'skip';
  timestamp: string;
}

interface ForgetEntryRow {
  id: string;
  alarmNote: string;
  alarmNickname: string | null;
  alarmIcon: string | null;
  alarmCategory: string;
  result: string;
  timestamp: string;
}

function rowToEntry(row: ForgetEntryRow): ForgetEntry {
  return {
    id: row.id,
    alarmNote: row.alarmNote,
    alarmNickname: row.alarmNickname ?? undefined,
    alarmIcon: row.alarmIcon ?? undefined,
    alarmCategory: row.alarmCategory,
    result: row.result as 'loss' | 'skip',
    timestamp: row.timestamp,
  };
}

export async function loadForgetLog(): Promise<ForgetEntry[]> {
  const db = getDb();
  return db.getAllSync<ForgetEntryRow>('SELECT * FROM forget_log ORDER BY timestamp DESC').map(rowToEntry);
}

export async function addForgetEntry(
  entry: Omit<ForgetEntry, 'id' | 'timestamp'>,
): Promise<void> {
  const db = getDb();
  db.runSync(
    `INSERT INTO forget_log (id, alarmNote, alarmNickname, alarmIcon, alarmCategory, result, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), entry.alarmNote, entry.alarmNickname ?? null, entry.alarmIcon ?? null,
     entry.alarmCategory, entry.result, new Date().toISOString()],
  );
}

export async function clearForgetLog(): Promise<void> {
  const db = getDb();
  db.runSync('DELETE FROM forget_log');
}

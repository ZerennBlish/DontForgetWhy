import { File, Directory, Paths } from 'expo-file-system';
import {
  StorageAccessFramework,
  readAsStringAsync,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { zip, unzip } from 'react-native-zip-archive';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { defaultDatabaseDirectory } from 'expo-sqlite';
import { closeDb, reopenDb, kvGet, kvSet, setRestoreInProgress } from './database';
import { withLock } from '../utils/asyncMutex';
import { loadAlarms, updateSingleAlarm } from './storage';
import { getReminders, updateReminder } from './reminderStorage';
import { scheduleAlarm, scheduleReminderNotification, cancelAllAlarms } from './notifications';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKUP_VERSION = 1;
const MEDIA_FOLDERS = ['voice-memos', 'note-images', 'backgrounds', 'alarm-photos', 'voice-memo-images'];
const DB_FILENAME = 'dfw.db';
const META_FILENAME = 'backup-meta.json';
const LAST_BACKUP_KEY = 'lastBackupDate';
const AUTO_BACKUP_ENABLED_KEY = 'autoBackupEnabled';
const AUTO_BACKUP_FREQUENCY_KEY = 'autoBackupFrequency';
const LAST_AUTO_BACKUP_KEY = 'lastAutoBackupDate';
const AUTO_BACKUP_FOLDER_URI_KEY = 'autoBackupFolderUri';
const AUTO_BACKUP_FOLDER_NAME_KEY = 'autoBackupFolderName';

function uniqueCacheDir(prefix: string): Directory {
  const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Directory(Paths.cache, name);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackupMeta {
  appVersion: string;
  backupVersion: number;
  createdAt: string;
  contents: {
    database: boolean;
    voiceMemos: number;
    noteImages: number;
    alarmPhotos: number;
    backgrounds: number;
    voiceMemoImages?: number;
  };
}

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip file:// prefix to get a plain filesystem path for zip/unzip. */
function uriToPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice(7) : uri;
}

/** Get the directory where expo-sqlite stores the database files. */
function getDbDirectory(): Directory {
  return new Directory(`file://${defaultDatabaseDirectory}`);
}

/** Count files in a document-relative directory (returns 0 if dir doesn't exist). */
function countFilesInDir(folderName: string): number {
  try {
    const dir = new Directory(Paths.document, folderName);
    if (!dir.exists) return 0;
    return dir.list().length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getLastBackupDate(): string | null {
  return kvGet(LAST_BACKUP_KEY);
}

/**
 * Export all app data (database + media) into a single .dfw zip file.
 * Returns a file:// URI to the backup file, ready for sharing.
 */
async function exportBackup(): Promise<string> {
  return withLock('backup-operation', async () => {
    const appVersion = Constants.expoConfig?.version ?? 'unknown';

    // 1. Prepare staging directory
    const stagingDir = uniqueCacheDir('backup-staging');
    stagingDir.create();

    try {
      // 2. Close DB, copy database file, then reopen immediately
      //    so the app keeps working even if the user cancels sharing.
      closeDb();
      try {
        const dbDir = getDbDirectory();
        const srcDb = new File(dbDir, DB_FILENAME);
        srcDb.copy(stagingDir);
      } finally {
        reopenDb();
      }

      // 3. Copy each media folder that exists
      const includedFolders: string[] = [];
      for (const folder of MEDIA_FOLDERS) {
        const dir = new Directory(Paths.document, folder);
        if (dir.exists) {
          dir.copy(stagingDir);
          includedFolders.push(folder);
        }
      }

      // 4. Write backup metadata with content counts
      const meta: BackupMeta = {
        appVersion,
        backupVersion: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        contents: {
          database: true,
          voiceMemos: countFilesInDir('voice-memos'),
          noteImages: countFilesInDir('note-images'),
          alarmPhotos: countFilesInDir('alarm-photos'),
          backgrounds: countFilesInDir('backgrounds'),
          voiceMemoImages: countFilesInDir('voice-memo-images'),
        },
      };
      const metaFile = new File(stagingDir, META_FILENAME);
      metaFile.write(JSON.stringify(meta, null, 2));

      // 5. Zip staging directory → .dfw file
      const targetFile = new File(Paths.cache, 'dfw-backup.dfw');
      if (targetFile.exists) targetFile.delete();
      const zipPath = await zip(uriToPath(stagingDir.uri), uriToPath(targetFile.uri));

      // 6. Record last backup date
      kvSet(LAST_BACKUP_KEY, meta.createdAt);

      return `file://${zipPath}`;
    } finally {
      try {
        if (stagingDir.exists) stagingDir.delete();
      } catch { /* best-effort cleanup */ }
    }
  });
}

/**
 * Export backup and open the system share sheet.
 */
export async function shareBackup(): Promise<void> {
  const fileUri = await exportBackup();
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Export Memories',
    UTI: 'public.data',
  });
}

/**
 * Validate a .dfw backup file. Returns parsed metadata on success, throws on failure.
 */
export async function validateBackup(fileUri: string): Promise<BackupMeta> {
  const validateDir = uniqueCacheDir('backup-validate');
  try {
    if (validateDir.exists) validateDir.delete();
    validateDir.create();

    await unzip(uriToPath(fileUri), uriToPath(validateDir.uri));

    // Check metadata file
    const metaFile = new File(validateDir, META_FILENAME);
    if (!metaFile.exists) {
      throw new Error('Invalid backup: missing metadata file');
    }

    const raw = await metaFile.text();
    let meta: BackupMeta;
    try {
      meta = JSON.parse(raw);
    } catch {
      throw new Error('Invalid backup: corrupted metadata');
    }

    // Strict version check — must be exactly BACKUP_VERSION
    if (meta.backupVersion !== BACKUP_VERSION) {
      throw new Error(
        `Unsupported backup version: ${meta.backupVersion}. This app supports version ${BACKUP_VERSION}.`,
      );
    }

    // Must have the contents field
    if (!meta.contents || typeof meta.contents.database !== 'boolean') {
      throw new Error('Backup manifest is malformed \u2014 missing contents field.');
    }

    if (
      typeof meta.contents.database !== 'boolean' ||
      typeof meta.contents.voiceMemos !== 'number' ||
      typeof meta.contents.noteImages !== 'number' ||
      typeof meta.contents.alarmPhotos !== 'number' ||
      typeof meta.contents.backgrounds !== 'number' ||
      (meta.contents.voiceMemoImages !== undefined && typeof meta.contents.voiceMemoImages !== 'number')
    ) {
      throw new Error('Backup manifest has malformed contents \u2014 expected counts for all media types.');
    }

    // Check database file
    const dbFile = new File(validateDir, DB_FILENAME);
    if (!dbFile.exists) {
      throw new Error('Invalid backup: missing database file');
    }

    return meta;
  } finally {
    try {
      if (validateDir.exists) validateDir.delete();
    } catch { /* best-effort cleanup */ }
  }
}

/**
 * Import/restore from a .dfw backup file. Replaces all app data.
 * Uses a rollback pattern: live data is never deleted until the backup
 * is fully extracted and verified.
 */
export async function importBackup(fileUri: string): Promise<void> {
  return withLock('backup-operation', async () => {
    const meta = await validateBackup(fileUri);

    const tempDir = uniqueCacheDir('backup-restore-temp');
    const rollbackDir = uniqueCacheDir('backup-rollback');

    let liveDataMoved = false;

    try {
      setRestoreInProgress(true);
      closeDb();

      // Step 1: Unzip backup to temp
      tempDir.create();
      await unzip(uriToPath(fileUri), uriToPath(tempDir.uri));

      // Step 2: Verify temp has dfw.db
      const tempDb = new File(tempDir, DB_FILENAME);
      if (!tempDb.exists) {
        throw new Error('Backup is missing database file');
      }

      // Step 3: Move current live data to rollback
      rollbackDir.create();

      const dbDir = getDbDirectory();
      for (const name of [DB_FILENAME, `${DB_FILENAME}-wal`, `${DB_FILENAME}-shm`]) {
        const f = new File(dbDir, name);
        if (f.exists) f.move(rollbackDir);
      }
      for (const folder of MEDIA_FOLDERS) {
        const dir = new Directory(Paths.document, folder);
        if (dir.exists) dir.move(rollbackDir);
      }
      liveDataMoved = true;

      // Step 4: Move restored data from temp to document
      const restoredDb = new File(tempDir, DB_FILENAME);
      if (!dbDir.exists) dbDir.create({ intermediates: true });
      restoredDb.move(dbDir);

      for (const folder of MEDIA_FOLDERS) {
        const restoredFolder = new Directory(tempDir, folder);
        if (restoredFolder.exists) {
          restoredFolder.move(Paths.document);
        }
      }

      // Remove backup-meta.json if it landed in Paths.document
      try {
        const strayMeta = new File(Paths.document, META_FILENAME);
        if (strayMeta.exists) strayMeta.delete();
      } catch {}

      // Step 5: Files are in place. Clear the file-swap guard so reopenDb
      // and the reschedule loop can access the DB. This happens INSIDE try
      // so any failure during reschedule still lands in catch/finally.
      setRestoreInProgress(false);
      reopenDb();
      await cancelAllAlarms();
      await rescheduleAllNotifications();

      // Step 6: Update last backup date
      kvSet(LAST_BACKUP_KEY, meta.createdAt);
    } catch (e) {
      // ROLLBACK: if we moved live data away, put it back. File operations
      // only — no DB access required. Do NOT touch the restore flag here;
      // the finally block handles it so an unexpected throw can't leave
      // the flag stuck.
      if (liveDataMoved) {
        try {
          const dbDir = getDbDirectory();
          for (const name of [DB_FILENAME, `${DB_FILENAME}-wal`, `${DB_FILENAME}-shm`]) {
            const f = new File(dbDir, name);
            if (f.exists) f.delete();
          }
          for (const folder of MEDIA_FOLDERS) {
            const dir = new Directory(Paths.document, folder);
            if (dir.exists) dir.delete();
          }

          // Move rollback data back
          for (const entry of rollbackDir.list()) {
            if (entry instanceof Directory) {
              entry.move(Paths.document);
            } else {
              // DB files go back to the sqlite directory
              entry.move(dbDir);
            }
          }
        } catch (rollbackError) {
          console.error('[restore] Rollback also failed:', rollbackError);
        }
      }
      throw e;
    } finally {
      // Safety net: always clear the guard on every exit path (success,
      // handled exception, or unexpected throw). The next getDb() call
      // will transparently reopen a fresh connection if needed.
      setRestoreInProgress(false);
      try { if (tempDir.exists) tempDir.delete(); } catch {}
      try { if (rollbackDir.exists) rollbackDir.delete(); } catch {}
    }
  });
}

// ---------------------------------------------------------------------------
// Internal: reschedule notifications after restore
// ---------------------------------------------------------------------------

async function rescheduleAllNotifications(): Promise<void> {
  // Reschedule enabled alarms
  const alarms = await loadAlarms();
  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    try {
      const notificationIds = await scheduleAlarm(alarm);
      await updateSingleAlarm(alarm.id, (a) => ({ ...a, notificationIds }));
    } catch (e) {
      console.warn('[backup] Failed to reschedule alarm:', alarm.id, e);
    }
  }

  // Reschedule active reminders that have a due time
  const reminders = await getReminders();
  for (const reminder of reminders) {
    if (reminder.completed || !reminder.dueTime) continue;
    try {
      const notificationIds = await scheduleReminderNotification(reminder);
      await updateReminder({
        ...reminder,
        notificationId: notificationIds[0] || null,
        notificationIds,
      });
    } catch (e) {
      console.warn('[backup] Failed to reschedule reminder:', reminder.id, e);
    }
  }
}

// ---------------------------------------------------------------------------
// SAF Folder Picker
// ---------------------------------------------------------------------------

/**
 * Open SAF directory picker. Returns folder URI + display name, or null if cancelled.
 * The permission is automatically persisted by Android.
 */
export async function requestBackupFolder(): Promise<{ uri: string; name: string } | null> {
  const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!result.granted) return null;

  // Extract readable folder name from URI
  const segments = decodeURIComponent(result.directoryUri).split('/');
  const name = segments[segments.length - 1] || 'Selected folder';

  return { uri: result.directoryUri, name };
}

/** Save SAF folder settings to KV store. */
export function saveBackupFolder(uri: string, name: string): void {
  kvSet(AUTO_BACKUP_FOLDER_URI_KEY, uri);
  kvSet(AUTO_BACKUP_FOLDER_NAME_KEY, name);
}

/** Get saved SAF folder name for display. */
export function getBackupFolderName(): string | null {
  return kvGet(AUTO_BACKUP_FOLDER_NAME_KEY);
}

// ---------------------------------------------------------------------------
// Auto-Export — writes to SAF folder (Google Drive, Downloads, etc.)
// ---------------------------------------------------------------------------

export function getAutoBackupSettings(): {
  enabled: boolean;
  frequency: BackupFrequency;
  folderUri: string | null;
  folderName: string | null;
  lastAutoBackup: string | null;
} {
  return {
    enabled: kvGet(AUTO_BACKUP_ENABLED_KEY) === 'true',
    frequency: (kvGet(AUTO_BACKUP_FREQUENCY_KEY) as BackupFrequency) || 'weekly',
    folderUri: kvGet(AUTO_BACKUP_FOLDER_URI_KEY),
    folderName: kvGet(AUTO_BACKUP_FOLDER_NAME_KEY),
    lastAutoBackup: kvGet(LAST_AUTO_BACKUP_KEY),
  };
}

export function setAutoBackupEnabled(enabled: boolean): void {
  kvSet(AUTO_BACKUP_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function setAutoBackupFrequency(frequency: BackupFrequency): void {
  kvSet(AUTO_BACKUP_FREQUENCY_KEY, frequency);
}

/**
 * Run auto-export: create backup zip in cache, then write it to the SAF
 * folder via base64 read/write (SAF doesn't support direct file copy).
 */
export async function autoExportBackup(): Promise<boolean> {
  const settings = getAutoBackupSettings();
  if (!settings.enabled || !settings.folderUri) return false;

  try {
    // 1. Create the backup zip in cache (reuse exportBackup)
    const zipUri = await exportBackup();
    const zipPath = uriToPath(zipUri);

    // 2. Generate dated filename
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `DFW-Backup-${dateStr}.dfw`;

    // 3. Create file in SAF directory
    const safFileUri = await StorageAccessFramework.createFileAsync(
      settings.folderUri,
      fileName,
      'application/octet-stream',
    );

    // 4. Read zip as base64, write to SAF file
    const base64Content = await readAsStringAsync(
      zipUri,
      { encoding: EncodingType.Base64 },
    );
    await writeAsStringAsync(
      safFileUri,
      base64Content,
      { encoding: EncodingType.Base64 },
    );

    // 5. Update last auto backup date
    kvSet(LAST_AUTO_BACKUP_KEY, new Date().toISOString());

    // 6. Cleanup cache zip
    try {
      const cacheFile = new File(zipPath);
      if (cacheFile.exists) cacheFile.delete();
    } catch {}

    return true;
  } catch (e) {
    console.error('[autoBackup] Auto-export failed:', e);
    return false;
  }
}

export function shouldAutoBackup(): boolean {
  const settings = getAutoBackupSettings();
  if (!settings.enabled || !settings.folderUri) return false;

  const last = settings.lastAutoBackup;
  if (!last) return true;

  const daysSince = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);

  switch (settings.frequency) {
    case 'daily': return daysSince >= 1;
    case 'weekly': return daysSince >= 7;
    case 'monthly': return daysSince >= 30;
    default: return false;
  }
}

export function clearAutoBackupSettings(): void {
  kvSet(AUTO_BACKUP_ENABLED_KEY, 'false');
}

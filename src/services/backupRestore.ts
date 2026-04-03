import { File, Directory, Paths } from 'expo-file-system';
import { zip, unzip } from 'react-native-zip-archive';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { defaultDatabaseDirectory } from 'expo-sqlite';
import { closeDb, reopenDb, kvGet, kvSet } from './database';
import { loadAlarms, updateSingleAlarm } from './storage';
import { getReminders, updateReminder } from './reminderStorage';
import { scheduleAlarm, scheduleReminderNotification, cancelAllAlarms } from './notifications';
import { StorageAccessFramework, EncodingType } from 'expo-file-system/legacy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKUP_VERSION = 1;
const MEDIA_FOLDERS = ['voice-memos', 'note-images', 'backgrounds', 'alarm-photos'];
const DB_FILENAME = 'dfw.db';
const META_FILENAME = 'backup-meta.json';
const LAST_BACKUP_KEY = 'lastBackupDate';
const AUTO_BACKUP_ENABLED_KEY = 'autoBackupEnabled';
const AUTO_BACKUP_FOLDER_URI_KEY = 'autoBackupFolderUri';
const AUTO_BACKUP_FOLDER_NAME_KEY = 'autoBackupFolderName';
const AUTO_BACKUP_FREQUENCY_KEY = 'autoBackupFrequency';
const LAST_AUTO_BACKUP_KEY = 'lastAutoBackupDate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackupMeta {
  appVersion: string;
  backupVersion: number;
  createdAt: string;
  mediaFolders: string[];
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
export async function exportBackup(): Promise<string> {
  const appVersion = Constants.expoConfig?.version ?? 'unknown';

  // 1. Prepare staging directory
  const stagingDir = new Directory(Paths.cache, 'backup-staging');
  if (stagingDir.exists) stagingDir.delete();
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

    // 4. Write backup metadata
    const meta: BackupMeta = {
      appVersion,
      backupVersion: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      mediaFolders: includedFolders,
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
  const validateDir = new Directory(Paths.cache, 'backup-validate');
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

    if (typeof meta.backupVersion !== 'number' || meta.backupVersion > BACKUP_VERSION) {
      throw new Error(
        `Unsupported backup version: ${meta.backupVersion}. Please update the app.`,
      );
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
 */
export async function importBackup(fileUri: string): Promise<void> {
  const meta = await validateBackup(fileUri);

  // Cancel all existing notifications before replacing the database
  await cancelAllAlarms();
  closeDb();

  const restoreDir = new Directory(Paths.cache, 'backup-restore');

  try {
    // Unzip backup to a temp directory
    if (restoreDir.exists) restoreDir.delete();
    restoreDir.create();
    await unzip(uriToPath(fileUri), uriToPath(restoreDir.uri));

    // Delete existing database files (including WAL/SHM)
    const dbDir = getDbDirectory();
    for (const name of [DB_FILENAME, `${DB_FILENAME}-wal`, `${DB_FILENAME}-shm`]) {
      const f = new File(dbDir, name);
      if (f.exists) f.delete();
    }

    // Delete existing media folders
    for (const folder of MEDIA_FOLDERS) {
      const dir = new Directory(Paths.document, folder);
      if (dir.exists) dir.delete();
    }

    // Copy restored database to the correct SQLite directory
    const restoredDb = new File(restoreDir, DB_FILENAME);
    if (!dbDir.exists) dbDir.create({ intermediates: true });
    restoredDb.copy(dbDir);

    // Copy restored media folders to Paths.document
    for (const folder of MEDIA_FOLDERS) {
      const restoredFolder = new Directory(restoreDir, folder);
      if (restoredFolder.exists) {
        restoredFolder.copy(Paths.document);
      }
    }
  } finally {
    // Always reopen the database, even if restore partially failed
    reopenDb();
    try {
      if (restoreDir.exists) restoreDir.delete();
    } catch { /* best-effort cleanup */ }
  }

  // Reschedule all notifications (old IDs from backup are stale)
  await rescheduleAllNotifications();
  kvSet(LAST_BACKUP_KEY, meta.createdAt);
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
// Auto-Export
// ---------------------------------------------------------------------------

export function getAutoBackupSettings(): {
  enabled: boolean;
  folderUri: string | null;
  folderName: string | null;
  frequency: BackupFrequency;
  lastAutoBackup: string | null;
} {
  return {
    enabled: kvGet(AUTO_BACKUP_ENABLED_KEY) === 'true',
    folderUri: kvGet(AUTO_BACKUP_FOLDER_URI_KEY),
    folderName: kvGet(AUTO_BACKUP_FOLDER_NAME_KEY),
    frequency: (kvGet(AUTO_BACKUP_FREQUENCY_KEY) as BackupFrequency) || 'weekly',
    lastAutoBackup: kvGet(LAST_AUTO_BACKUP_KEY),
  };
}

export function setAutoBackupEnabled(enabled: boolean): void {
  kvSet(AUTO_BACKUP_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function setAutoBackupFolder(uri: string, name: string): void {
  kvSet(AUTO_BACKUP_FOLDER_URI_KEY, uri);
  kvSet(AUTO_BACKUP_FOLDER_NAME_KEY, name);
}

export function setAutoBackupFrequency(frequency: BackupFrequency): void {
  kvSet(AUTO_BACKUP_FREQUENCY_KEY, frequency);
}

export async function requestBackupFolder(): Promise<{ uri: string; name: string } | null> {
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return null;

  return {
    uri: permission.directoryUri,
    name: decodeURIComponent(permission.directoryUri.split('%2F').pop() || 'Selected folder'),
  };
}

/**
 * Run auto-export: create backup zip, then write it to the SAF folder.
 * Uses base64 bridge between new File API and legacy SAF writer.
 */
export async function autoExportBackup(): Promise<boolean> {
  const settings = getAutoBackupSettings();
  if (!settings.enabled || !settings.folderUri) return false;

  try {
    // 1. Create the backup zip in cache (reuse exportBackup)
    const zipUri = await exportBackup();

    // 2. Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `DFW-Backup-${dateStr}.dfw`;

    // 3. Create file in SAF folder
    const safFileUri = await StorageAccessFramework.createFileAsync(
      settings.folderUri,
      fileName,
      'application/octet-stream',
    );

    // 4. Read zip as base64 via new File API, write to SAF via legacy API
    const zipFile = new File(zipUri);
    const base64 = await zipFile.base64();
    await StorageAccessFramework.writeAsStringAsync(safFileUri, base64, {
      encoding: EncodingType.Base64,
    });

    // 5. Update last auto backup date
    kvSet(LAST_AUTO_BACKUP_KEY, new Date().toISOString());

    // 6. Clean up cache zip
    try {
      if (zipFile.exists) zipFile.delete();
    } catch { /* best-effort */ }

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

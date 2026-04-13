// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const kvStore: Record<string, string> = {};
const mockFileState: Record<string, { exists: boolean; content?: string }> = {};

jest.mock('../src/services/database', () => ({
  kvGet: jest.fn((key: string) => kvStore[key] ?? null),
  kvSet: jest.fn((key: string, value: string) => { kvStore[key] = value; }),
  kvRemove: jest.fn((key: string) => { delete kvStore[key]; }),
  getDb: jest.fn(),
  closeDb: jest.fn(),
  reopenDb: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((_parent: any, name?: string) => ({
    exists: mockFileState[name ?? '']?.exists ?? false,
    text: jest.fn(async () => mockFileState[name ?? '']?.content ?? ''),
    delete: jest.fn(),
    copy: jest.fn(),
    move: jest.fn(),
    write: jest.fn(),
  })),
  Directory: jest.fn().mockImplementation(() => ({
    uri: 'file:///mock/cache/backup-validate',
    exists: false,
    delete: jest.fn(),
    create: jest.fn(),
    list: jest.fn(() => []),
  })),
  Paths: { document: '/mock/document/', cache: '/mock/cache/' },
}));

jest.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
  },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('react-native-zip-archive', () => ({
  zip: jest.fn(),
  unzip: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.11.0' } },
}));

jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: '/mock/sqlite/',
}));

jest.mock('../src/services/storage', () => ({
  loadAlarms: jest.fn(async () => []),
  updateSingleAlarm: jest.fn(),
}));

jest.mock('../src/services/reminderStorage', () => ({
  getReminders: jest.fn(async () => []),
  updateReminder: jest.fn(),
}));

jest.mock('../src/services/notifications', () => ({
  scheduleAlarm: jest.fn(async () => []),
  scheduleReminderNotification: jest.fn(async () => []),
  cancelAllAlarms: jest.fn(async () => {}),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  shouldAutoBackup,
  getAutoBackupSettings,
  getLastBackupDate,
  setAutoBackupEnabled,
  setAutoBackupFrequency,
  saveBackupFolder,
  getBackupFolderName,
  clearAutoBackupSettings,
  validateBackup,
} from '../src/services/backupRestore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearKvStore() {
  for (const key of Object.keys(kvStore)) {
    delete kvStore[key];
  }
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  clearKvStore();
  for (const key of Object.keys(mockFileState)) {
    delete mockFileState[key];
  }
});

describe('shouldAutoBackup', () => {
  it('returns false when auto-backup is disabled', () => {
    expect(shouldAutoBackup()).toBe(false);
  });

  it('returns false when enabled but no folder URI is set', () => {
    kvStore['autoBackupEnabled'] = 'true';
    expect(shouldAutoBackup()).toBe(false);
  });

  it('returns true when enabled with folder and never backed up', () => {
    kvStore['autoBackupEnabled'] = 'true';
    kvStore['autoBackupFolderUri'] = 'content://mock/folder';
    expect(shouldAutoBackup()).toBe(true);
  });

  it('returns true when daily frequency and last backup was 25 hours ago', () => {
    kvStore['autoBackupEnabled'] = 'true';
    kvStore['autoBackupFolderUri'] = 'content://mock/folder';
    kvStore['autoBackupFrequency'] = 'daily';
    kvStore['lastAutoBackupDate'] = hoursAgo(25);
    expect(shouldAutoBackup()).toBe(true);
  });

  it('returns false when daily frequency and last backup was 1 hour ago', () => {
    kvStore['autoBackupEnabled'] = 'true';
    kvStore['autoBackupFolderUri'] = 'content://mock/folder';
    kvStore['autoBackupFrequency'] = 'daily';
    kvStore['lastAutoBackupDate'] = hoursAgo(1);
    expect(shouldAutoBackup()).toBe(false);
  });

  it('returns true when weekly frequency and last backup was 8 days ago', () => {
    kvStore['autoBackupEnabled'] = 'true';
    kvStore['autoBackupFolderUri'] = 'content://mock/folder';
    kvStore['autoBackupFrequency'] = 'weekly';
    kvStore['lastAutoBackupDate'] = daysAgo(8);
    expect(shouldAutoBackup()).toBe(true);
  });

  it('returns false when weekly frequency and last backup was 3 days ago', () => {
    kvStore['autoBackupEnabled'] = 'true';
    kvStore['autoBackupFolderUri'] = 'content://mock/folder';
    kvStore['autoBackupFrequency'] = 'weekly';
    kvStore['lastAutoBackupDate'] = daysAgo(3);
    expect(shouldAutoBackup()).toBe(false);
  });

  it('returns true when monthly frequency and last backup was 31 days ago', () => {
    kvStore['autoBackupEnabled'] = 'true';
    kvStore['autoBackupFolderUri'] = 'content://mock/folder';
    kvStore['autoBackupFrequency'] = 'monthly';
    kvStore['lastAutoBackupDate'] = daysAgo(31);
    expect(shouldAutoBackup()).toBe(true);
  });

  it('returns false when monthly frequency and last backup was 15 days ago', () => {
    kvStore['autoBackupEnabled'] = 'true';
    kvStore['autoBackupFolderUri'] = 'content://mock/folder';
    kvStore['autoBackupFrequency'] = 'monthly';
    kvStore['lastAutoBackupDate'] = daysAgo(15);
    expect(shouldAutoBackup()).toBe(false);
  });
});

describe('getAutoBackupSettings', () => {
  it('returns correct defaults when no settings stored', () => {
    const settings = getAutoBackupSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.frequency).toBe('weekly');
    expect(settings.folderUri).toBeNull();
    expect(settings.folderName).toBeNull();
    expect(settings.lastAutoBackup).toBeNull();
  });

  it('returns stored values when settings exist', () => {
    kvStore['autoBackupEnabled'] = 'true';
    kvStore['autoBackupFrequency'] = 'daily';
    kvStore['autoBackupFolderUri'] = 'content://mock/drive';
    kvStore['autoBackupFolderName'] = 'Google Drive';
    kvStore['lastAutoBackupDate'] = '2026-04-01T12:00:00.000Z';

    const settings = getAutoBackupSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.frequency).toBe('daily');
    expect(settings.folderUri).toBe('content://mock/drive');
    expect(settings.folderName).toBe('Google Drive');
    expect(settings.lastAutoBackup).toBe('2026-04-01T12:00:00.000Z');
  });
});

describe('getLastBackupDate', () => {
  it('returns null when no backup has been made', () => {
    expect(getLastBackupDate()).toBeNull();
  });

  it('returns the stored ISO string when a backup exists', () => {
    kvStore['lastBackupDate'] = '2026-04-03T10:00:00.000Z';
    expect(getLastBackupDate()).toBe('2026-04-03T10:00:00.000Z');
  });
});

describe('setAutoBackupEnabled', () => {
  it('writes true to kv_store', () => {
    setAutoBackupEnabled(true);
    expect(kvStore['autoBackupEnabled']).toBe('true');
  });

  it('writes false to kv_store', () => {
    setAutoBackupEnabled(false);
    expect(kvStore['autoBackupEnabled']).toBe('false');
  });
});

describe('setAutoBackupFrequency', () => {
  it('writes frequency to kv_store', () => {
    setAutoBackupFrequency('daily');
    expect(kvStore['autoBackupFrequency']).toBe('daily');
  });

  it('writes monthly to kv_store', () => {
    setAutoBackupFrequency('monthly');
    expect(kvStore['autoBackupFrequency']).toBe('monthly');
  });
});

describe('saveBackupFolder', () => {
  it('writes folder URI and name to kv_store', () => {
    saveBackupFolder('content://com.android.externalstorage/tree/primary%3ABackups', 'Backups');
    expect(kvStore['autoBackupFolderUri']).toBe('content://com.android.externalstorage/tree/primary%3ABackups');
    expect(kvStore['autoBackupFolderName']).toBe('Backups');
  });
});

describe('getBackupFolderName', () => {
  it('returns null when no folder is set', () => {
    expect(getBackupFolderName()).toBeNull();
  });

  it('returns stored folder name', () => {
    kvStore['autoBackupFolderName'] = 'Downloads';
    expect(getBackupFolderName()).toBe('Downloads');
  });
});

describe('clearAutoBackupSettings', () => {
  it('sets enabled to false', () => {
    kvStore['autoBackupEnabled'] = 'true';
    clearAutoBackupSettings();
    expect(kvStore['autoBackupEnabled']).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// validateBackup — tests manifest parsing and rejection logic
// ---------------------------------------------------------------------------

const VALID_META = {
  appVersion: '1.11.0',
  backupVersion: 1,
  createdAt: '2026-04-03T10:00:00.000Z',
  contents: {
    database: true,
    voiceMemos: 3,
    noteImages: 5,
    alarmPhotos: 1,
    backgrounds: 2,
    voiceMemoImages: 4,
  },
};

function setupValidBackup(metaOverride?: object) {
  const meta = metaOverride ?? VALID_META;
  mockFileState['backup-meta.json'] = { exists: true, content: JSON.stringify(meta) };
  mockFileState['dfw.db'] = { exists: true };
}

describe('validateBackup', () => {
  it('rejects backup with missing backup-meta.json', async () => {
    // backup-meta.json does not exist, dfw.db does
    mockFileState['dfw.db'] = { exists: true };
    await expect(validateBackup('file:///mock/test.dfw'))
      .rejects.toThrow('Invalid backup: missing metadata file');
  });

  it('rejects backup with backupVersion 0', async () => {
    setupValidBackup({ ...VALID_META, backupVersion: 0 });
    await expect(validateBackup('file:///mock/test.dfw'))
      .rejects.toThrow('Unsupported backup version: 0');
  });

  it('rejects backup with backupVersion 2', async () => {
    setupValidBackup({ ...VALID_META, backupVersion: 2 });
    await expect(validateBackup('file:///mock/test.dfw'))
      .rejects.toThrow('Unsupported backup version: 2');
  });

  it('rejects backup with missing contents object', async () => {
    const { contents: _, ...noContents } = VALID_META;
    setupValidBackup(noContents);
    await expect(validateBackup('file:///mock/test.dfw'))
      .rejects.toThrow('missing contents field');
  });

  it('rejects backup with malformed contents — voiceMemos is a string', async () => {
    setupValidBackup({
      ...VALID_META,
      contents: { ...VALID_META.contents, voiceMemos: 'three' },
    });
    await expect(validateBackup('file:///mock/test.dfw'))
      .rejects.toThrow('expected counts for all media types');
  });

  it('rejects backup with malformed contents — missing noteImages', async () => {
    const { noteImages: _, ...partial } = VALID_META.contents;
    setupValidBackup({
      ...VALID_META,
      contents: partial,
    });
    await expect(validateBackup('file:///mock/test.dfw'))
      .rejects.toThrow('expected counts for all media types');
  });

  it('rejects backup with malformed contents — backgrounds is boolean', async () => {
    setupValidBackup({
      ...VALID_META,
      contents: { ...VALID_META.contents, backgrounds: true },
    });
    await expect(validateBackup('file:///mock/test.dfw'))
      .rejects.toThrow('expected counts for all media types');
  });

  it('rejects backup with missing dfw.db', async () => {
    // meta exists and is valid, but dfw.db does not exist
    mockFileState['backup-meta.json'] = { exists: true, content: JSON.stringify(VALID_META) };
    await expect(validateBackup('file:///mock/test.dfw'))
      .rejects.toThrow('Invalid backup: missing database file');
  });

  it('accepts a valid backup and returns parsed metadata', async () => {
    setupValidBackup();
    const meta = await validateBackup('file:///mock/test.dfw');
    expect(meta.appVersion).toBe('1.11.0');
    expect(meta.backupVersion).toBe(1);
    expect(meta.contents.database).toBe(true);
    expect(meta.contents.voiceMemos).toBe(3);
    expect(meta.contents.noteImages).toBe(5);
    expect(meta.contents.alarmPhotos).toBe(1);
    expect(meta.contents.backgrounds).toBe(2);
    expect(meta.contents.voiceMemoImages).toBe(4);
  });
});

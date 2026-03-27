import { File, Directory, Paths } from 'expo-file-system';

function ensurePhotoDir(): Directory {
  const dir = new Directory(Paths.document, 'alarm-photos/');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export async function saveAlarmPhoto(alarmId: string, sourceUri: string): Promise<string> {
  try {
    const dir = ensurePhotoDir();
    const filename = `alarm_${alarmId}_${Date.now()}.jpg`;
    const destFile = new File(dir, filename);
    const sourceFile = new File(sourceUri);
    sourceFile.copy(destFile);
    return destFile.uri;
  } catch (error) {
    console.error('[alarmPhotoStorage] saveAlarmPhoto failed:', error);
    throw error;
  }
}

export async function deleteAlarmPhoto(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // best-effort
  }
}

export function alarmPhotoExists(uri: string): boolean {
  try {
    const file = new File(uri);
    return file.exists;
  } catch {
    return false;
  }
}

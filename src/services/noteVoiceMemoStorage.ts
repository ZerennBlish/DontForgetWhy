import { File, Directory, Paths } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

function ensureVoiceMemoDir(): Directory {
  const dir = new Directory(Paths.document, 'voice-memos/');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export async function saveVoiceMemo(noteId: string, sourceUri: string): Promise<string> {
  const voiceDir = ensureVoiceMemoDir();
  const shortId = uuidv4().split('-')[0];
  const filename = `${noteId}_${Date.now()}_${shortId}.m4a`;
  const destFile = new File(voiceDir, filename);
  const sourceFile = new File(sourceUri);
  sourceFile.copy(destFile);

  // Clean up source if it's in a temp/cache directory
  if (sourceUri.includes(Paths.cache.uri)) {
    try {
      if (sourceFile.exists) sourceFile.delete();
    } catch { /* best-effort */ }
  }

  return destFile.uri;
}

export async function deleteVoiceMemo(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('[noteVoiceMemoStorage] deleteVoiceMemo failed:', error);
  }
}

export async function deleteAllVoiceMemos(uris: string[]): Promise<void> {
  await Promise.allSettled(uris.map((uri) => deleteVoiceMemo(uri)));
}

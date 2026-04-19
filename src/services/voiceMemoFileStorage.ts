import { File, Directory, Paths } from 'expo-file-system';

function ensureVoiceMemoDir(): Directory {
  const dir = new Directory(Paths.document, 'voice-memos/');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export async function saveVoiceClipFile(clipId: string, sourceUri: string): Promise<string> {
  const voiceDir = ensureVoiceMemoDir();
  const filename = `${clipId}_${Date.now()}.m4a`;
  const destFile = new File(voiceDir, filename);
  const sourceFile = new File(sourceUri);
  sourceFile.copy(destFile);

  if (sourceUri.includes(Paths.cache.uri)) {
    try {
      if (sourceFile.exists) sourceFile.delete();
    } catch { /* best-effort */ }
  }

  return destFile.uri;
}

export async function deleteVoiceMemoFile(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('[voiceMemoFileStorage] deleteVoiceMemoFile failed:', error);
  }
}

async function deleteAllVoiceMemoFiles(uris: string[]): Promise<void> {
  await Promise.allSettled(uris.map((uri) => deleteVoiceMemoFile(uri)));
}

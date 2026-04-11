import { File, Directory, Paths } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

function ensureImageDir(): Directory {
  const dir = new Directory(Paths.document, 'voice-memo-images/');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export async function saveVoiceMemoImage(memoId: string, sourceUri: string): Promise<string> {
  try {
    const imageDir = ensureImageDir();
    const shortId = uuidv4().split('-')[0];
    const ext = sourceUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const filename = `${memoId}_${Date.now()}_${shortId}.${ext}`;
    const destFile = new File(imageDir, filename);
    const sourceFile = new File(sourceUri);
    sourceFile.copy(destFile);
    return destFile.uri;
  } catch (error) {
    console.error('[voiceMemoImageStorage] saveVoiceMemoImage failed:', error);
    throw error;
  }
}

export async function deleteVoiceMemoImage(imageUri: string): Promise<void> {
  try {
    const file = new File(imageUri);
    if (file.exists) file.delete();
  } catch (error) {
    console.error('[voiceMemoImageStorage] deleteVoiceMemoImage failed:', error);
  }
}

export async function deleteAllVoiceMemoImages(imageUris: string[]): Promise<void> {
  await Promise.allSettled(imageUris.map((uri) => deleteVoiceMemoImage(uri)));
}

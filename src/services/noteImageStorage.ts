import { File, Directory, Paths } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

function ensureImageDir(): Directory {
  const dir = new Directory(Paths.document, 'note-images/');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

export async function saveNoteImage(noteId: string, sourceUri: string): Promise<string> {
  try {
    const imageDir = ensureImageDir();
    const shortId = uuidv4().split('-')[0];
    const filename = `${noteId}_${Date.now()}_${shortId}.jpg`;
    const destFile = new File(imageDir, filename);
    const sourceFile = new File(sourceUri);
    sourceFile.copy(destFile);
    return destFile.uri;
  } catch (error) {
    console.error('[noteImageStorage] saveNoteImage failed:', error);
    throw error;
  }
}

export async function deleteNoteImage(imageUri: string): Promise<void> {
  try {
    const file = new File(imageUri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('[noteImageStorage] deleteNoteImage failed:', error);
  }
}

export async function deleteAllNoteImages(imageUris: string[]): Promise<void> {
  await Promise.allSettled(imageUris.map((uri) => deleteNoteImage(uri)));
}

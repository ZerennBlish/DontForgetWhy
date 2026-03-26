import { File, Directory, Paths } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import type { StrokeData } from '../components/DrawingCanvas';

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
    const isPng = sourceUri.toLowerCase().endsWith('.png');
    const ext = isPng ? 'png' : 'jpg';
    const filename = `${noteId}_${Date.now()}_${shortId}.${ext}`;
    const destFile = new File(imageDir, filename);
    const sourceFile = new File(sourceUri);
    sourceFile.copy(destFile);

    // Copy companion drawing JSON if it exists
    if (isPng) {
      try {
        const srcFilename = sourceUri.split('/').pop();
        if (srcFilename) {
          const srcJsonFilename = srcFilename.replace(/\.png$/i, '.json');
          const sourceJson = new File(imageDir, srcJsonFilename);
          if (sourceJson.exists) {
            const destJsonFilename = filename.replace(/\.png$/i, '.json');
            const destJson = new File(imageDir, destJsonFilename);
            sourceJson.copy(destJson);
          }
        }
      } catch { /* best-effort */ }
    }

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
    // Also delete companion drawing JSON if it exists
    if (imageUri.toLowerCase().endsWith('.png')) {
      try {
        const imageDir = ensureImageDir();
        const pngFilename = imageUri.split('/').pop();
        if (pngFilename) {
          const jsonFilename = pngFilename.replace(/\.png$/i, '.json');
          const jsonFile = new File(imageDir, jsonFilename);
          if (jsonFile.exists) {
            jsonFile.delete();
          }
        }
      } catch { /* best-effort */ }
    }
  } catch (error) {
    console.error('[noteImageStorage] deleteNoteImage failed:', error);
  }
}

export async function deleteAllNoteImages(imageUris: string[]): Promise<void> {
  await Promise.allSettled(imageUris.map((uri) => deleteNoteImage(uri)));
}

export function getDrawingJsonUri(imageUri: string): string {
  return imageUri.replace(/\.png$/i, '.json');
}

export async function loadDrawingData(
  imageUri: string,
): Promise<{ strokes: StrokeData[]; bgColor: string } | null> {
  if (!imageUri.toLowerCase().endsWith('.png')) return null;
  try {
    // Use directory-based constructor — extract filename from URI
    const imageDir = ensureImageDir();
    const pngFilename = imageUri.split('/').pop();
    if (!pngFilename) return null;
    const jsonFilename = pngFilename.replace(/\.png$/i, '.json');
    const jsonFile = new File(imageDir, jsonFilename);
    if (!jsonFile.exists) return null;
    const raw = await jsonFile.text();
    const data = JSON.parse(raw);
    if (Array.isArray(data.strokes)) {
      return { strokes: data.strokes, bgColor: data.bgColor || '#FFFFFF' };
    }
    return null;
  } catch {
    return null;
  }
}

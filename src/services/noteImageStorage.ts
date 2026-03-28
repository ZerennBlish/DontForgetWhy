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
        const srcJsonUri = sourceUri.replace(/\.png$/i, '.json');
        const sourceJson = new File(srcJsonUri);
        if (sourceJson.exists) {
          const destJsonFilename = filename.replace(/\.png$/i, '.json');
          const destJson = new File(imageDir, destJsonFilename);
          sourceJson.copy(destJson);
        }
      } catch { /* best-effort */ }
    }

    // Clean up temp source if from drawing-temp/
    if (sourceUri.includes('drawing-temp/')) {
      try {
        const srcFile = new File(sourceUri);
        if (srcFile.exists) srcFile.delete();
        if (isPng) {
          const srcJsonUri = sourceUri.replace(/\.png$/i, '.json');
          const srcJson = new File(srcJsonUri);
          if (srcJson.exists) srcJson.delete();
        }
      } catch { /* best-effort */ }
    }

    // Copy source photo from drawing-temp/ if referenced in companion JSON
    if (isPng) {
      try {
        const destJsonFilename = filename.replace(/\.png$/i, '.json');
        const destJson = new File(imageDir, destJsonFilename);
        if (destJson.exists) {
          const raw = await destJson.text();
          const data = JSON.parse(raw);
          if (data.sourceImageUri && data.sourceImageUri.includes('drawing-temp/')) {
            const srcPhoto = new File(data.sourceImageUri);
            if (srcPhoto.exists) {
              const srcPhotoName = data.sourceImageUri.split('/').pop()!;
              const destPhoto = new File(imageDir, srcPhotoName);
              srcPhoto.copy(destPhoto);
              data.sourceImageUri = destPhoto.uri;
              destJson.write(JSON.stringify(data));
              try { srcPhoto.delete(); } catch { /* best-effort */ }
            }
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
): Promise<{ strokes: StrokeData[]; bgColor: string; sourceImageUri?: string | null } | null> {
  if (!imageUri.toLowerCase().endsWith('.png')) return null;
  try {
    const jsonUri = imageUri.replace(/\.png$/i, '.json');
    const jsonFile = new File(jsonUri);
    if (!jsonFile.exists) return null;
    const raw = await jsonFile.text();
    const data = JSON.parse(raw);
    if (Array.isArray(data.strokes)) {
      return {
        strokes: data.strokes,
        bgColor: data.bgColor || '#FFFFFF',
        sourceImageUri: data.sourceImageUri || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function cleanupTempDrawings(): void {
  try {
    const tempDir = new Directory(Paths.cache, 'drawing-temp/');
    if (tempDir.exists) {
      tempDir.delete();
    }
  } catch { /* best-effort */ }
}

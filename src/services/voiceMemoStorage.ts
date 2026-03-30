import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VoiceMemo } from '../types/voiceMemo';

const STORAGE_KEY = 'voiceMemos';

async function _loadAll(): Promise<VoiceMemo[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is VoiceMemo =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).uri === 'string' &&
        typeof (item as Record<string, unknown>).title === 'string' &&
        typeof (item as Record<string, unknown>).createdAt === 'string',
    );
  } catch (e) {
    console.error('[voiceMemoStorage] _loadAll failed:', e);
    return [];
  }
}

async function _saveAll(memos: VoiceMemo[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

export async function getVoiceMemos(): Promise<VoiceMemo[]> {
  const all = await _loadAll();
  return all.filter((m) => !m.deletedAt);
}

export async function getAllVoiceMemos(): Promise<VoiceMemo[]> {
  return _loadAll();
}

export async function addVoiceMemo(memo: VoiceMemo): Promise<void> {
  try {
    const memos = await _loadAll();
    memos.push(memo);
    await _saveAll(memos);
  } catch (e) {
    console.error('[voiceMemoStorage] addVoiceMemo failed:', e);
    throw e;
  }
}

export async function updateVoiceMemo(updated: VoiceMemo): Promise<void> {
  try {
    const memos = await _loadAll();
    const index = memos.findIndex((m) => m.id === updated.id);
    if (index >= 0) {
      memos[index] = updated;
      await _saveAll(memos);
    }
  } catch (e) {
    console.error('[voiceMemoStorage] updateVoiceMemo failed:', e);
    throw e;
  }
}

export async function deleteVoiceMemo(id: string): Promise<void> {
  try {
    const memos = await _loadAll();
    const updated = memos.map((m) =>
      m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m,
    );
    await _saveAll(updated);
  } catch (e) {
    console.error('[voiceMemoStorage] deleteVoiceMemo failed:', e);
    throw e;
  }
}

export async function restoreVoiceMemo(id: string): Promise<void> {
  try {
    const memos = await _loadAll();
    const updated = memos.map((m) =>
      m.id === id ? { ...m, deletedAt: null } : m,
    );
    await _saveAll(updated);
  } catch (e) {
    console.error('[voiceMemoStorage] restoreVoiceMemo failed:', e);
    throw e;
  }
}

export async function permanentlyDeleteVoiceMemo(id: string): Promise<void> {
  try {
    const memos = await _loadAll();
    const filtered = memos.filter((m) => m.id !== id);
    await _saveAll(filtered);
  } catch (e) {
    console.error('[voiceMemoStorage] permanentlyDeleteVoiceMemo failed:', e);
    throw e;
  }
}

/**
 * Simple async mutex that serializes operations per key.
 * Prevents read-modify-write races on kv_store values.
 */
const locks = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = locks.get(key);

  let resolve: () => void;
  const next = new Promise<void>(r => { resolve = r; });
  locks.set(key, next);

  if (existing) {
    await existing;
  }

  try {
    return await fn();
  } finally {
    resolve!();
    if (locks.get(key) === next) {
      locks.delete(key);
    }
  }
}

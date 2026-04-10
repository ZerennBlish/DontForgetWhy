/**
 * Safely parse JSON with a fallback default.
 * Returns defaultValue if parsing fails or result is null/undefined.
 */
export function safeParse<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    const parsed = JSON.parse(json);
    return parsed ?? defaultValue;
  } catch {
    console.warn('safeParse failed for:', json.substring(0, 100));
    return defaultValue;
  }
}

/**
 * Safely parse a JSON array with type guard.
 * Returns empty array if parsing fails or result is not an array.
 */
export function safeParseArray<T>(json: string | null | undefined): T[] {
  const parsed = safeParse(json, []);
  return Array.isArray(parsed) ? parsed : [];
}

import { safeParse, safeParseArray } from '../src/utils/safeParse';

describe('safeParse', () => {
  it('parses valid JSON', () => {
    expect(safeParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('returns default for null', () => {
    expect(safeParse(null, 'fallback')).toBe('fallback');
  });

  it('returns default for undefined', () => {
    expect(safeParse(undefined, 42)).toBe(42);
  });

  it('returns default for invalid JSON', () => {
    expect(safeParse('{broken', [])).toEqual([]);
  });

  it('returns default for empty string', () => {
    expect(safeParse('', false)).toBe(false);
  });
});

describe('safeParseArray', () => {
  it('parses valid arrays', () => {
    expect(safeParseArray<string>('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns empty array for non-array JSON', () => {
    expect(safeParseArray('{"not":"array"}')).toEqual([]);
  });

  it('returns empty array for null', () => {
    expect(safeParseArray(null)).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    expect(safeParseArray('{bad')).toEqual([]);
  });
});

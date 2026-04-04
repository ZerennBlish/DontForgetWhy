import { getRelativeTime, formatDeletedAgo } from '../src/utils/time';

// Fixed reference: April 4, 2026 12:00:00 UTC
const NOW = new Date('2026-04-04T12:00:00Z').getTime();

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('getRelativeTime', () => {
  it('returns "Just now" for < 1 minute ago', () => {
    const date = new Date(NOW - 30 * 1000).toISOString();
    expect(getRelativeTime(date)).toBe('Just now');
  });

  it('returns minutes ago for < 60 minutes', () => {
    const date5m = new Date(NOW - 5 * 60 * 1000).toISOString();
    expect(getRelativeTime(date5m)).toBe('5m ago');

    const date59m = new Date(NOW - 59 * 60 * 1000).toISOString();
    expect(getRelativeTime(date59m)).toBe('59m ago');
  });

  it('returns hours ago for < 24 hours', () => {
    const date1h = new Date(NOW - 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(date1h)).toBe('1h ago');

    const date23h = new Date(NOW - 23 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(date23h)).toBe('23h ago');
  });

  it('returns "Yesterday" for 24-47 hours ago', () => {
    const date = new Date(NOW - 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(date)).toBe('Yesterday');

    const date47h = new Date(NOW - 47 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(date47h)).toBe('Yesterday');
  });

  it('returns days ago for 2-6 days', () => {
    const date3d = new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(date3d)).toBe('3d ago');

    const date6d = new Date(NOW - 6 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(date6d)).toBe('6d ago');
  });

  it('returns "Mon D" format for 7+ days ago', () => {
    // 10 days before April 4 = March 25
    const date = new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRelativeTime(date)).toBe('Mar 25');
  });

  it('returns correct month format for old dates', () => {
    const dec25 = new Date('2025-12-25T10:00:00Z').toISOString();
    expect(getRelativeTime(dec25)).toBe('Dec 25');
  });
});

describe('formatDeletedAgo', () => {
  it('returns "Deleted today" for < 24 hours ago', () => {
    const date = new Date(NOW - 6 * 60 * 60 * 1000).toISOString();
    expect(formatDeletedAgo(date)).toBe('Deleted today');
  });

  it('returns "Deleted yesterday" for 24-47 hours ago', () => {
    const date = new Date(NOW - 36 * 60 * 60 * 1000).toISOString();
    expect(formatDeletedAgo(date)).toBe('Deleted yesterday');
  });

  it('returns "Deleted X days ago" for 2-29 days', () => {
    const date5d = new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatDeletedAgo(date5d)).toBe('Deleted 5 days ago');

    const date29d = new Date(NOW - 29 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatDeletedAgo(date29d)).toBe('Deleted 29 days ago');
  });

  it('returns "Deleted Xmo ago" for 30+ days', () => {
    const date60d = new Date(NOW - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatDeletedAgo(date60d)).toBe('Deleted 2mo ago');

    const date90d = new Date(NOW - 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatDeletedAgo(date90d)).toBe('Deleted 3mo ago');
  });
});

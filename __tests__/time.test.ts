import { formatTime } from '../src/utils/time';

describe('formatTime', () => {
  describe('12h format (default)', () => {
    it('formats midnight as 12:00 AM', () => {
      expect(formatTime('0:00')).toBe('12:00 AM');
    });

    it('formats noon as 12:00 PM', () => {
      expect(formatTime('12:00')).toBe('12:00 PM');
    });

    it('formats afternoon time', () => {
      expect(formatTime('14:30')).toBe('2:30 PM');
    });

    it('formats morning time with leading zero minutes', () => {
      expect(formatTime('9:05')).toBe('9:05 AM');
    });

    it('formats 23:59', () => {
      expect(formatTime('23:59')).toBe('11:59 PM');
    });

    it('formats 1:00 AM', () => {
      expect(formatTime('1:00')).toBe('1:00 AM');
    });
  });

  describe('24h format', () => {
    it('formats midnight as 00:00', () => {
      expect(formatTime('0:00', '24h')).toBe('00:00');
    });

    it('formats noon as 12:00', () => {
      expect(formatTime('12:00', '24h')).toBe('12:00');
    });

    it('formats afternoon time as 14:30', () => {
      expect(formatTime('14:30', '24h')).toBe('14:30');
    });

    it('formats morning time with leading zero', () => {
      expect(formatTime('9:05', '24h')).toBe('09:05');
    });

    it('formats 23:59', () => {
      expect(formatTime('23:59', '24h')).toBe('23:59');
    });
  });
});

import { getTextColor } from '../src/utils/noteColors';

describe('getTextColor', () => {
  it('returns light text for black background', () => {
    expect(getTextColor('#000000')).toBe('#FFFFFF');
  });

  it('returns dark text for white background', () => {
    expect(getTextColor('#FFFFFF')).toBe('#1A1A2E');
  });

  it('returns dark text for bright yellow', () => {
    expect(getTextColor('#FFFF00')).toBe('#1A1A2E');
  });

  it('returns light text for dark blue', () => {
    expect(getTextColor('#000080')).toBe('#FFFFFF');
  });

  it('returns light text for dark red', () => {
    expect(getTextColor('#800000')).toBe('#FFFFFF');
  });

  it('returns a string for medium gray', () => {
    const result = getTextColor('#808080');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^#/);
  });

  it('returns white for invalid hex input', () => {
    expect(getTextColor('not-a-color')).toBe('#FFFFFF');
  });

  it('returns white for empty string', () => {
    expect(getTextColor('')).toBe('#FFFFFF');
  });
});

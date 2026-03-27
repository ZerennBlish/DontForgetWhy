/**
 * Determines whether text on a given background color should be light or dark.
 */
export function getTextColor(bgHex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(bgHex)) return '#FFFFFF';
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#1A1A2E' : '#FFFFFF';
}

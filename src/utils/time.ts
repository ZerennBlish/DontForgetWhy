export function formatTime(time: string, format: '12h' | '24h' = '12h'): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (format === '24h') {
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}
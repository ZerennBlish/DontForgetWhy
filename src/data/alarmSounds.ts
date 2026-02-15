export interface AlarmSound {
  id: string;
  label: string;
  icon: string;
  channelId: string;
  description: string;
}

export const ALARM_SOUNDS: AlarmSound[] = [
  { id: 'default', label: 'Default', icon: '\u{1F514}', channelId: 'alarms_v2', description: 'Standard alarm tone' },
  { id: 'gentle', label: 'Gentle', icon: '\u{1F305}', channelId: 'alarms_gentle', description: 'Soft wake-up chime' },
  { id: 'urgent', label: 'Urgent', icon: '\u{1F6A8}', channelId: 'alarms_urgent', description: "Can't ignore this one" },
  { id: 'classic', label: 'Classic', icon: '\u23F0', channelId: 'alarms_classic', description: 'Old school alarm clock' },
  { id: 'digital', label: 'Digital', icon: '\u{1F4DF}', channelId: 'alarms_digital', description: 'Modern digital beep' },
  { id: 'silent', label: 'Silent', icon: '\u{1F507}', channelId: 'alarms_silent', description: 'Vibration only, no sound' },
];

export function getAlarmSoundById(id: string): AlarmSound {
  return ALARM_SOUNDS.find((s) => s.id === id) || ALARM_SOUNDS[0];
}

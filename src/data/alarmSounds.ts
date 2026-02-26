export interface AlarmSound {
  id: string;
  label: string;
  icon: string;
  channelId: string;
  description: string;
}

export const ALARM_SOUNDS: AlarmSound[] = [
  { id: 'default', label: 'Default', icon: '\u{1F514}', channelId: 'alarms_v5', description: 'Standard alarm tone' },
  { id: 'gentle', label: 'Gentle', icon: '\u{1F305}', channelId: 'alarms_gentle_v4', description: 'Soft wake-up chime' },
  { id: 'urgent', label: 'Urgent', icon: '\u{1F6A8}', channelId: 'alarms_urgent_v4', description: "Can't ignore this one" },
  { id: 'classic', label: 'Classic', icon: '\u23F0', channelId: 'alarms_classic_v4', description: 'Old school alarm clock' },
  { id: 'digital', label: 'Digital', icon: '\u{1F4DF}', channelId: 'alarms_digital_v4', description: 'Modern digital beep' },
  { id: 'silent', label: 'Silent', icon: '\u{1F507}', channelId: 'alarms_silent_v4', description: 'Vibration only, no sound' },
];

export function getAlarmSoundById(id: string): AlarmSound {
  return ALARM_SOUNDS.find((s) => s.id === id) || ALARM_SOUNDS[0];
}

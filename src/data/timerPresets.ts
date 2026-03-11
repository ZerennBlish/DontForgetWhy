import type { TimerPreset } from '../types/timer';

const defaultPresets: TimerPreset[] = [
  { id: 'custom', icon: '\u2795', label: 'Custom', seconds: 0 },
  { id: 'pizza', icon: '\u{1F355}', label: 'Pizza', seconds: 720 },
  { id: 'laundry', icon: '\u{1F455}', label: 'Laundry', seconds: 2700 },
  { id: 'stove', icon: '\u{1F525}', label: 'Stove', seconds: 1200 },
  { id: 'break', icon: '\u2615', label: 'Break', seconds: 900 },
  { id: 'lunch', icon: '\u{1F37D}\uFE0F', label: 'Meal', seconds: 3600 },
  { id: 'nap', icon: '\u{1F634}', label: 'Nap', seconds: 1800 },
  { id: 'workout', icon: '\u{1F3CB}\uFE0F', label: 'Workout', seconds: 2700 },
  { id: 'meds', icon: '\u{1F48A}', label: 'Meds', seconds: 300 },
  { id: 'tea', icon: '\u{1FAD6}', label: 'Tea', seconds: 240 },
  { id: 'eggs', icon: '\u{1F95A}', label: 'Eggs', seconds: 600 },
  { id: 'microwave', icon: '\u2668\uFE0F', label: 'Microwave', seconds: 120 },
  { id: 'parking', icon: '\u{1F17F}\uFE0F', label: 'Parking', seconds: 3600 },
  { id: 'meeting', icon: '\u{1F465}', label: 'Meeting', seconds: 1800 },
  { id: 'work', icon: '\u{1F4BC}', label: 'Work', seconds: 3600 },
  { id: 'cleaning', icon: '\u{1F9F9}', label: 'Cleaning', seconds: 1800 },
  { id: 'grill', icon: '\u{1F969}', label: 'Grill', seconds: 900 },
  { id: 'pet', icon: '\u{1F43E}', label: 'Pet', seconds: 900 },
  { id: 'kids', icon: '\u{1F476}', label: 'Kids', seconds: 1800 },
];

export { defaultPresets };

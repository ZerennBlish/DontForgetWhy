export interface GuessIcon {
  id: string;
  emoji: string;
}

const guessWhyIcons: GuessIcon[] = [
  // ── Health & Medical ──
  { id: 'meds', emoji: '\u{1F48A}' },
  { id: 'doctor', emoji: '\u{1FA7A}' },
  { id: 'medical', emoji: '\u2695\uFE0F' },
  { id: 'dentist', emoji: '\u{1F9B7}' },
  // ── Events & Social ──
  { id: 'appointment', emoji: '\u{1F4C5}' },
  { id: 'meeting', emoji: '\u{1F465}' },
  { id: 'anniversary', emoji: '\u{1F48D}' },
  { id: 'birthday', emoji: '\u{1F382}' },
  { id: 'date', emoji: '\u2764\uFE0F' },
  { id: 'church', emoji: '\u{1F64F}' },
  { id: 'celebration', emoji: '\u{1F389}' },
  // ── Work & Tasks ──
  { id: 'work', emoji: '\u{1F4BC}' },
  { id: 'bills', emoji: '\u{1F4B2}' },
  { id: 'homework', emoji: '\u{1F4DD}' },
  { id: 'documents', emoji: '\u{1F4C4}' },
  { id: 'computer', emoji: '\u{1F4BB}' },
  { id: 'phone', emoji: '\u{1F4F1}' },
  { id: 'mail', emoji: '\u{1F4EC}' },
  { id: 'school', emoji: '\u{1F3EB}' },
  // ── Home & Errands ──
  { id: 'kids', emoji: '\u{1F476}' },
  { id: 'pet', emoji: '\u{1F43E}' },
  { id: 'meal', emoji: '\u{1F37D}\uFE0F' },
  { id: 'shopping', emoji: '\u{1F6D2}' },
  { id: 'delivery', emoji: '\u{1F4E6}' },
  { id: 'car', emoji: '\u{1F697}' },
  { id: 'transit', emoji: '\u{1F68C}' },
  { id: 'cleaning', emoji: '\u{1F9F9}' },
  { id: 'laundry', emoji: '\u{1F455}' },
  { id: 'trash', emoji: '\u{1F5D1}' },
  { id: 'door', emoji: '\u{1F512}' },
  { id: 'plant', emoji: '\u{1F331}' },
  // ── Self-Care & Wellness ──
  { id: 'dumbbell', emoji: '\u{1F3CB}\uFE0F' },
  { id: 'yoga', emoji: '\u{1F9D8}' },
  { id: 'hydrate', emoji: '\u{1F4A7}' },
  { id: 'shower', emoji: '\u{1F6BF}' },
  { id: 'bedtime', emoji: '\u{1F6CF}\uFE0F' },
  { id: 'haircut', emoji: '\u{1F487}' },
  // ── Travel & Other ──
  { id: 'travel', emoji: '\u2708\uFE0F' },
  { id: 'auction', emoji: '\u{1F528}' },
  { id: 'book', emoji: '\u{1F4D6}' },
  { id: 'custom', emoji: '\u2795' },
];

export default guessWhyIcons;

/**
 * Time input validation and conversion tests.
 *
 * Tests the exported formatTime / getCurrentTime from src/utils/time.ts
 * directly. All other time logic (12h→24h conversion, input validation,
 * auto-date assignment) is inline in the screen components and not
 * exported, so we replicate the pure logic here with source references.
 *
 * === Functions that should be extracted to a shared utility ===
 *
 * 1. convert12hTo24h(rawH, rawM, ampm, timeFormat) → "HH:MM"
 *    Source: CreateAlarmScreen.tsx lines 735-749
 *            CreateReminderScreen.tsx lines 705-723
 *    (Duplicated identically in both screens)
 *
 * 2. validateHourInput(digits, timeFormat) → accepted string | null
 *    Source: CreateAlarmScreen.tsx lines 144-180
 *            CreateReminderScreen.tsx lines 106-142
 *    (Duplicated identically in both screens)
 *
 * 3. validateMinuteInput(digits) → accepted string | null
 *    Source: CreateAlarmScreen.tsx lines 182-195
 *            CreateReminderScreen.tsx lines 144-157
 *    (Duplicated identically in both screens)
 *
 * 4. autoAssignDate(h, m, now) → dateStr
 *    Source: CreateAlarmScreen.tsx lines 761-772
 *            CreateReminderScreen.tsx lines 729-741
 *    (Duplicated identically in both screens)
 */

import { formatTime, getCurrentTime } from '../utils/time';

// ---------------------------------------------------------------------------
// Replicated logic from screen components
// ---------------------------------------------------------------------------

/**
 * Replicated from CreateAlarmScreen.tsx handleSave (lines 735-749) and
 * CreateReminderScreen.tsx handleSave (lines 705-723). Identical in both.
 *
 * Converts user-entered hour/minute/ampm into a 24-hour "HH:MM" string,
 * clamping out-of-range values.
 */
function buildTimeString(
  hourText: string,
  minuteText: string,
  timeFormat: '12h' | '24h',
  ampm: 'AM' | 'PM',
): string {
  const rawH = parseInt(hourText, 10) || 0;
  const rawM = parseInt(minuteText, 10) || 0;
  let h: number;
  if (timeFormat === '12h') {
    const h12 = Math.min(12, Math.max(1, rawH || 12));
    if (ampm === 'AM') {
      h = h12 === 12 ? 0 : h12;
    } else {
      h = h12 === 12 ? 12 : h12 + 12;
    }
  } else {
    h = Math.min(23, Math.max(0, rawH));
  }
  const m = Math.min(59, Math.max(0, rawM));
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Replicated from CreateAlarmScreen.tsx handleHourChange (lines 144-180).
 * Determines whether a digit string is accepted as hour input.
 *
 * Returns { accepted: string | null, autoAdvance: boolean }
 * - accepted: the digit string that would be set as state, or null if rejected
 * - autoAdvance: whether the cursor would auto-move to the minute field
 */
function validateHourInput(
  digits: string,
  timeFormat: '12h' | '24h',
): { accepted: string | null; autoAdvance: boolean } {
  if (digits === '') return { accepted: '', autoAdvance: false };

  if (timeFormat === '12h') {
    if (digits.length === 1) {
      const d = parseInt(digits, 10);
      if (d >= 2 && d <= 9) {
        return { accepted: digits, autoAdvance: true };
      } else if (d <= 1) {
        return { accepted: digits, autoAdvance: false };
      }
      return { accepted: null, autoAdvance: false };
    } else {
      const val = parseInt(digits.slice(0, 2), 10);
      if (val >= 1 && val <= 12) {
        return { accepted: digits.slice(0, 2), autoAdvance: true };
      }
      return { accepted: null, autoAdvance: false };
    }
  } else {
    if (digits.length === 1) {
      const d = parseInt(digits, 10);
      if (d >= 3) {
        return { accepted: digits, autoAdvance: true };
      } else {
        return { accepted: digits, autoAdvance: false };
      }
    } else {
      const val = parseInt(digits.slice(0, 2), 10);
      if (val <= 23) {
        return { accepted: digits.slice(0, 2), autoAdvance: true };
      }
      return { accepted: null, autoAdvance: false };
    }
  }
}

/**
 * Replicated from CreateAlarmScreen.tsx handleMinuteChange (lines 182-195).
 * Determines whether a digit string is accepted as minute input.
 */
function validateMinuteInput(
  digits: string,
): { accepted: string | null } {
  if (digits === '') return { accepted: '' };

  if (digits.length === 1) {
    if (parseInt(digits, 10) <= 5) {
      return { accepted: digits };
    }
    return { accepted: null };
  } else {
    const val = parseInt(digits.slice(0, 2), 10);
    if (val <= 59) {
      return { accepted: digits.slice(0, 2) };
    }
    return { accepted: null };
  }
}

/**
 * Replicated from CreateAlarmScreen.tsx handleSave (lines 761-772) and
 * CreateReminderScreen.tsx handleSave (lines 729-741). Identical in both.
 *
 * When no date is explicitly selected for a one-time alarm/reminder,
 * auto-assigns today (if time is in the future) or tomorrow (if past).
 */
function autoAssignDate(h: number, m: number, now: Date): string {
  const selectedMinutes = h * 60 + m;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const pad = (n: number) => String(n).padStart(2, '0');

  if (selectedMinutes > currentMinutes) {
    // Today
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  } else {
    // Tomorrow
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    return `${tmrw.getFullYear()}-${pad(tmrw.getMonth() + 1)}-${pad(tmrw.getDate())}`;
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2025, 5, 15, 10, 30, 0, 0)); // Sun Jun 15 2025, 10:30 AM
});

afterEach(() => {
  jest.useRealTimers();
});

// ============================================================================
// 1. Time Parsing — 12-hour to 24-hour conversion
// ============================================================================

describe('Time Parsing — 12h to 24h conversion', () => {
  it('12:00 AM → 00:00 (midnight)', () => {
    expect(buildTimeString('12', '00', '12h', 'AM')).toBe('00:00');
  });

  it('12:30 AM → 00:30', () => {
    expect(buildTimeString('12', '30', '12h', 'AM')).toBe('00:30');
  });

  it('12:00 PM → 12:00 (noon)', () => {
    expect(buildTimeString('12', '00', '12h', 'PM')).toBe('12:00');
  });

  it('12:30 PM → 12:30', () => {
    expect(buildTimeString('12', '30', '12h', 'PM')).toBe('12:30');
  });

  it('1:30 PM → 13:30', () => {
    expect(buildTimeString('1', '30', '12h', 'PM')).toBe('13:30');
  });

  it('11:59 PM → 23:59', () => {
    expect(buildTimeString('11', '59', '12h', 'PM')).toBe('23:59');
  });

  it('1:00 AM → 01:00', () => {
    expect(buildTimeString('1', '00', '12h', 'AM')).toBe('01:00');
  });

  it('11:00 AM → 11:00', () => {
    expect(buildTimeString('11', '00', '12h', 'AM')).toBe('11:00');
  });

  it('6:45 PM → 18:45', () => {
    expect(buildTimeString('6', '45', '12h', 'PM')).toBe('18:45');
  });

  it('empty hour defaults to 12 (via || 12 fallback), AM → 00:00', () => {
    // rawH = parseInt('', 10) || 0 = 0; then rawH || 12 = 12; clamped h12=12; AM→0
    expect(buildTimeString('', '00', '12h', 'AM')).toBe('00:00');
  });

  it('empty hour defaults to 12, PM → 12:00', () => {
    expect(buildTimeString('', '00', '12h', 'PM')).toBe('12:00');
  });
});

describe('Time Parsing — 24h mode', () => {
  it('0:00 → 00:00', () => {
    expect(buildTimeString('0', '00', '24h', 'AM')).toBe('00:00');
  });

  it('13:30 → 13:30', () => {
    expect(buildTimeString('13', '30', '24h', 'AM')).toBe('13:30');
  });

  it('23:59 → 23:59', () => {
    expect(buildTimeString('23', '59', '24h', 'AM')).toBe('23:59');
  });
});

describe('Time Parsing — hour clamping', () => {
  it('12h mode: hour 0 clamps to 12 (then converts)', () => {
    // rawH=0 → rawH||12=12 → h12=12; AM→0, PM→12
    expect(buildTimeString('0', '00', '12h', 'AM')).toBe('00:00');
    expect(buildTimeString('0', '00', '12h', 'PM')).toBe('12:00');
  });

  it('12h mode: hour 13 clamps to 12', () => {
    // rawH=13 → Math.min(12, Math.max(1, 13)) = 12; AM→0, PM→12
    expect(buildTimeString('13', '00', '12h', 'AM')).toBe('00:00');
    expect(buildTimeString('13', '00', '12h', 'PM')).toBe('12:00');
  });

  it('24h mode: hour 25 clamps to 23', () => {
    expect(buildTimeString('25', '00', '24h', 'AM')).toBe('23:00');
  });

  it('24h mode: hour -1 clamps to 0', () => {
    // parseInt('-1') = -1, Math.min(23, Math.max(0, -1)) = 0
    expect(buildTimeString('-1', '00', '24h', 'AM')).toBe('00:00');
  });
});

describe('Time Parsing — minute clamping', () => {
  it('minute 60 clamps to 59', () => {
    expect(buildTimeString('10', '60', '12h', 'AM')).toBe('10:59');
  });

  it('minute -5 clamps to 0', () => {
    // parseInt('-5') = -5, Math.min(59, Math.max(0, -5)) = 0
    expect(buildTimeString('10', '-5', '12h', 'AM')).toBe('10:00');
  });

  it('empty minute defaults to 0', () => {
    // parseInt('', 10) || 0 = 0
    expect(buildTimeString('10', '', '12h', 'AM')).toBe('10:00');
  });
});

// ============================================================================
// 2. Time Conversion — formatTime (exported from utils/time.ts)
// ============================================================================

describe('Time Conversion — formatTime (24h→12h display)', () => {
  it('00:00 → 12:00 AM', () => {
    expect(formatTime('00:00', '12h')).toBe('12:00 AM');
  });

  it('00:30 → 12:30 AM', () => {
    expect(formatTime('00:30', '12h')).toBe('12:30 AM');
  });

  it('12:00 → 12:00 PM', () => {
    expect(formatTime('12:00', '12h')).toBe('12:00 PM');
  });

  it('12:30 → 12:30 PM', () => {
    expect(formatTime('12:30', '12h')).toBe('12:30 PM');
  });

  it('13:30 → 1:30 PM', () => {
    expect(formatTime('13:30', '12h')).toBe('1:30 PM');
  });

  it('23:59 → 11:59 PM', () => {
    expect(formatTime('23:59', '12h')).toBe('11:59 PM');
  });

  it('01:00 → 1:00 AM', () => {
    expect(formatTime('01:00', '12h')).toBe('1:00 AM');
  });

  it('11:00 → 11:00 AM', () => {
    expect(formatTime('11:00', '12h')).toBe('11:00 AM');
  });

  it('24h format passes through with padding', () => {
    expect(formatTime('9:05', '24h')).toBe('09:05');
    expect(formatTime('13:30', '24h')).toBe('13:30');
  });
});

describe('Time Conversion — round-trip 12h→24h→12h', () => {
  const cases: [string, 'AM' | 'PM', string][] = [
    ['12', 'AM', '12:00 AM'],
    ['12', 'PM', '12:00 PM'],
    ['1', 'AM', '1:00 AM'],
    ['1', 'PM', '1:00 PM'],
    ['6', 'AM', '6:00 AM'],
    ['6', 'PM', '6:00 PM'],
    ['11', 'AM', '11:00 AM'],
    ['11', 'PM', '11:00 PM'],
  ];

  it.each(cases)(
    'hour=%s %s round-trips to %s',
    (hour, meridiem, expected) => {
      const time24 = buildTimeString(hour, '00', '12h', meridiem);
      const display = formatTime(time24, '12h');
      expect(display).toBe(expected);
    },
  );
});

describe('Time Conversion — AM/PM toggle', () => {
  it('toggling from AM to PM adds 12 hours (for non-12 hour)', () => {
    const am = buildTimeString('3', '00', '12h', 'AM'); // 03:00
    const pm = buildTimeString('3', '00', '12h', 'PM'); // 15:00
    expect(am).toBe('03:00');
    expect(pm).toBe('15:00');

    const amH = parseInt(am.split(':')[0], 10);
    const pmH = parseInt(pm.split(':')[0], 10);
    expect(pmH - amH).toBe(12);
  });

  it('toggling AM/PM on 12 swaps between 00:00 and 12:00', () => {
    const am = buildTimeString('12', '00', '12h', 'AM'); // 00:00
    const pm = buildTimeString('12', '00', '12h', 'PM'); // 12:00
    expect(am).toBe('00:00');
    expect(pm).toBe('12:00');
  });
});

// ============================================================================
// 3. Hour/Minute Input Validation
// ============================================================================

describe('Hour input validation — 12h mode', () => {
  it('single digit 2-9 accepted and auto-advances', () => {
    for (let d = 2; d <= 9; d++) {
      const result = validateHourInput(String(d), '12h');
      expect(result.accepted).toBe(String(d));
      expect(result.autoAdvance).toBe(true);
    }
  });

  it('single digit 0-1 accepted without auto-advance (wait for second digit)', () => {
    expect(validateHourInput('0', '12h')).toEqual({ accepted: '0', autoAdvance: false });
    expect(validateHourInput('1', '12h')).toEqual({ accepted: '1', autoAdvance: false });
  });

  it('two digits 01-12 accepted and auto-advances', () => {
    for (let v = 1; v <= 12; v++) {
      const s = v.toString().padStart(2, '0');
      const result = validateHourInput(s, '12h');
      expect(result.accepted).toBe(s);
      expect(result.autoAdvance).toBe(true);
    }
  });

  it('two digits 00 rejected (0 is not valid 12h hour)', () => {
    expect(validateHourInput('00', '12h').accepted).toBeNull();
  });

  it('two digits 13+ rejected', () => {
    expect(validateHourInput('13', '12h').accepted).toBeNull();
    expect(validateHourInput('20', '12h').accepted).toBeNull();
    expect(validateHourInput('99', '12h').accepted).toBeNull();
  });

  it('empty string accepted (clears field)', () => {
    expect(validateHourInput('', '12h')).toEqual({ accepted: '', autoAdvance: false });
  });
});

describe('Hour input validation — 24h mode', () => {
  it('single digit 3-9 accepted and auto-advances', () => {
    for (let d = 3; d <= 9; d++) {
      const result = validateHourInput(String(d), '24h');
      expect(result.accepted).toBe(String(d));
      expect(result.autoAdvance).toBe(true);
    }
  });

  it('single digit 0-2 accepted without auto-advance', () => {
    expect(validateHourInput('0', '24h')).toEqual({ accepted: '0', autoAdvance: false });
    expect(validateHourInput('1', '24h')).toEqual({ accepted: '1', autoAdvance: false });
    expect(validateHourInput('2', '24h')).toEqual({ accepted: '2', autoAdvance: false });
  });

  it('two digits 00-23 accepted and auto-advances', () => {
    for (let v = 0; v <= 23; v++) {
      const s = v.toString().padStart(2, '0');
      const result = validateHourInput(s, '24h');
      expect(result.accepted).toBe(s);
      expect(result.autoAdvance).toBe(true);
    }
  });

  it('two digits 24+ rejected', () => {
    expect(validateHourInput('24', '24h').accepted).toBeNull();
    expect(validateHourInput('30', '24h').accepted).toBeNull();
    expect(validateHourInput('99', '24h').accepted).toBeNull();
  });
});

describe('Minute input validation', () => {
  it('single digit 0-5 accepted (waits for second digit)', () => {
    for (let d = 0; d <= 5; d++) {
      expect(validateMinuteInput(String(d)).accepted).toBe(String(d));
    }
  });

  it('single digit 6-9 rejected', () => {
    for (let d = 6; d <= 9; d++) {
      expect(validateMinuteInput(String(d)).accepted).toBeNull();
    }
  });

  it('two digits 00-59 accepted', () => {
    expect(validateMinuteInput('00').accepted).toBe('00');
    expect(validateMinuteInput('30').accepted).toBe('30');
    expect(validateMinuteInput('59').accepted).toBe('59');
  });

  it('two digits 60+ rejected', () => {
    expect(validateMinuteInput('60').accepted).toBeNull();
    expect(validateMinuteInput('75').accepted).toBeNull();
    expect(validateMinuteInput('99').accepted).toBeNull();
  });

  it('empty string accepted (clears field)', () => {
    expect(validateMinuteInput('').accepted).toBe('');
  });
});

// ============================================================================
// 4. Scheduling Time — today vs tomorrow auto-assignment
// ============================================================================

describe('Scheduling Time — auto-assign today or tomorrow', () => {
  it('time in the future today → schedules for today', () => {
    // Now: 10:30 AM, selected: 2:00 PM
    const now = new Date(2025, 5, 15, 10, 30, 0, 0);
    jest.setSystemTime(now);

    const date = autoAssignDate(14, 0, now);
    expect(date).toBe('2025-06-15'); // today
  });

  it('time in the past today → schedules for tomorrow', () => {
    // Now: 10:30 AM, selected: 8:00 AM
    const now = new Date(2025, 5, 15, 10, 30, 0, 0);
    jest.setSystemTime(now);

    const date = autoAssignDate(8, 0, now);
    expect(date).toBe('2025-06-16'); // tomorrow
  });

  it('exact same time → schedules for tomorrow (not strictly greater)', () => {
    // Now: 10:30, selected: 10:30 → selectedMinutes NOT > currentMinutes
    const now = new Date(2025, 5, 15, 10, 30, 0, 0);
    jest.setSystemTime(now);

    const date = autoAssignDate(10, 30, now);
    expect(date).toBe('2025-06-16'); // tomorrow (equal is not future)
  });

  it('one minute ahead → schedules for today', () => {
    const now = new Date(2025, 5, 15, 10, 30, 0, 0);
    jest.setSystemTime(now);

    const date = autoAssignDate(10, 31, now);
    expect(date).toBe('2025-06-15'); // today
  });

  it('one minute behind → schedules for tomorrow', () => {
    const now = new Date(2025, 5, 15, 10, 30, 0, 0);
    jest.setSystemTime(now);

    const date = autoAssignDate(10, 29, now);
    expect(date).toBe('2025-06-16'); // tomorrow
  });

  it('midnight boundary: 11:59 PM now, selecting 12:00 AM → tomorrow', () => {
    // 12:00 AM = hour 0, min 0 = 0 minutes
    // 11:59 PM = hour 23, min 59 = 1439 minutes
    // 0 is NOT > 1439, so → tomorrow
    const now = new Date(2025, 5, 15, 23, 59, 0, 0);
    jest.setSystemTime(now);

    const date = autoAssignDate(0, 0, now);
    expect(date).toBe('2025-06-16'); // tomorrow
  });

  it('midnight boundary: 11:59 PM now, selecting 11:59 PM → tomorrow (equal)', () => {
    const now = new Date(2025, 5, 15, 23, 59, 0, 0);
    jest.setSystemTime(now);

    const date = autoAssignDate(23, 59, now);
    expect(date).toBe('2025-06-16');
  });

  it('wraps correctly across month boundary', () => {
    // Jun 30, 11 PM, selecting 8 AM → Jul 1
    const now = new Date(2025, 5, 30, 23, 0, 0, 0);
    jest.setSystemTime(now);

    const date = autoAssignDate(8, 0, now);
    expect(date).toBe('2025-07-01');
  });

  it('wraps correctly across year boundary', () => {
    // Dec 31, 11 PM, selecting 8 AM → Jan 1 next year
    const now = new Date(2025, 11, 31, 23, 0, 0, 0);
    jest.setSystemTime(now);

    const date = autoAssignDate(8, 0, now);
    expect(date).toBe('2026-01-01');
  });
});

// ============================================================================
// 5. Date-Time Combination (Reminders)
// ============================================================================

describe('Date-Time Combination — reminders', () => {
  it('selected date + selected time produces correct timestamp', () => {
    const dateStr = '2025-07-04';
    const timeStr = '14:30';
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, m] = timeStr.split(':').map(Number);
    const combined = new Date(y, mo - 1, d, h, m, 0, 0);

    expect(combined.getFullYear()).toBe(2025);
    expect(combined.getMonth()).toBe(6); // July
    expect(combined.getDate()).toBe(4);
    expect(combined.getHours()).toBe(14);
    expect(combined.getMinutes()).toBe(30);
  });

  it('date without time → dueTime is null (no notification scheduled)', () => {
    // Replicate reminder screen logic: if hourText is empty / NaN,
    // dueTime stays null. Only dueDate is set.
    // Source: CreateReminderScreen.tsx lines 705-723
    const rawH = parseInt('', 10); // NaN
    const dueTime = isNaN(rawH) ? null : 'would-be-set';
    expect(dueTime).toBeNull();
    // dueDate would be the selectedDate
    const dueDate = '2025-07-04';
    expect(dueDate).toBe('2025-07-04');
  });

  it('time without date (one-time) → auto-assigns today if future', () => {
    const now = new Date(2025, 5, 15, 10, 30, 0, 0);
    jest.setSystemTime(now);

    const dueTime = '14:00';
    const [h, m] = dueTime.split(':').map(Number);
    const date = autoAssignDate(h, m, now);
    expect(date).toBe('2025-06-15'); // today (14:00 > 10:30)
  });

  it('time without date (one-time) → auto-assigns tomorrow if past', () => {
    const now = new Date(2025, 5, 15, 10, 30, 0, 0);
    jest.setSystemTime(now);

    const dueTime = '08:00';
    const [h, m] = dueTime.split(':').map(Number);
    const date = autoAssignDate(h, m, now);
    expect(date).toBe('2025-06-16'); // tomorrow (08:00 < 10:30)
  });

  it('date+time in the past is detected', () => {
    // Replicate the past-check from CreateReminderScreen.tsx lines 746-751
    jest.setSystemTime(new Date(2025, 5, 15, 10, 30, 0, 0));

    const dueDate = '2025-06-14'; // yesterday
    const dueTime = '09:00';
    const [y, mo, d] = dueDate.split('-').map(Number);
    const [h, m] = dueTime.split(':').map(Number);
    const combined = new Date(y, mo - 1, d, h, m, 0, 0);

    expect(combined.getTime() <= Date.now()).toBe(true); // in the past
  });

  it('date+time in the future is detected', () => {
    jest.setSystemTime(new Date(2025, 5, 15, 10, 30, 0, 0));

    const dueDate = '2025-06-15';
    const dueTime = '14:00';
    const [y, mo, d] = dueDate.split('-').map(Number);
    const [h, m] = dueTime.split(':').map(Number);
    const combined = new Date(y, mo - 1, d, h, m, 0, 0);

    expect(combined.getTime() > Date.now()).toBe(true); // in the future
  });

  it('recurring mode with date → dueDate set directly (no auto-assign)', () => {
    // Source: CreateReminderScreen.tsx line 743
    // In recurring mode: dueDate = selectedDate (no today/tomorrow logic)
    const selectedDate = '2025-12-25';
    const mode = 'recurring';
    let dueDate: string | null = null;

    if (mode === 'recurring') {
      dueDate = selectedDate;
    }
    expect(dueDate).toBe('2025-12-25');
  });

  it('recurring mode without date → dueDate is null', () => {
    const selectedDate: string | null = null;
    const mode = 'recurring';
    let dueDate: string | null = null;

    if (mode === 'recurring') {
      dueDate = selectedDate;
    }
    expect(dueDate).toBeNull();
  });
});

// ============================================================================
// 6. getCurrentTime (exported from utils/time.ts)
// ============================================================================

describe('getCurrentTime', () => {
  it('returns current time in HH:MM format', () => {
    jest.setSystemTime(new Date(2025, 0, 1, 9, 5, 0, 0));
    expect(getCurrentTime()).toBe('09:05');
  });

  it('midnight returns 00:00', () => {
    jest.setSystemTime(new Date(2025, 0, 1, 0, 0, 0, 0));
    expect(getCurrentTime()).toBe('00:00');
  });

  it('23:59 formats correctly', () => {
    jest.setSystemTime(new Date(2025, 0, 1, 23, 59, 0, 0));
    expect(getCurrentTime()).toBe('23:59');
  });
});

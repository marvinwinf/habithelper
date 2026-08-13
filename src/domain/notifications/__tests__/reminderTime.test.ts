import {
  DEFAULT_REMINDER_TIME,
  formatReminderTime,
  normalizeReminderTime,
  parseReminderTime,
} from '../reminderTime';

describe('parseReminderTime', () => {
  it('parses a valid HH:mm value', () => {
    expect(parseReminderTime('07:05')).toEqual({ hour: 7, minute: 5 });
    expect(parseReminderTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseReminderTime('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseReminderTime(' 08:30 ')).toEqual({ hour: 8, minute: 30 });
  });

  it('rejects out-of-range times', () => {
    expect(parseReminderTime('24:00')).toBeNull();
    expect(parseReminderTime('12:60')).toBeNull();
  });

  it('rejects malformed values', () => {
    // The column is plain TEXT and backups are readable, hand-editable JSON,
    // so anything can arrive here.
    expect(parseReminderTime('')).toBeNull();
    expect(parseReminderTime('8:30')).toBeNull();
    expect(parseReminderTime('0830')).toBeNull();
    expect(parseReminderTime('morgens')).toBeNull();
  });
});

describe('formatReminderTime', () => {
  it('pads both components back to HH:mm', () => {
    expect(formatReminderTime({ hour: 7, minute: 5 })).toBe('07:05');
    expect(formatReminderTime({ hour: 21, minute: 30 })).toBe('21:30');
  });

  it('round-trips with parseReminderTime', () => {
    expect(formatReminderTime(parseReminderTime('06:45')!)).toBe('06:45');
  });
});

describe('normalizeReminderTime', () => {
  it('keeps a valid value', () => {
    expect(normalizeReminderTime('21:15')).toBe('21:15');
  });

  it('falls back to the default for anything unusable', () => {
    expect(normalizeReminderTime('99:99')).toBe(DEFAULT_REMINDER_TIME);
    expect(normalizeReminderTime('')).toBe(DEFAULT_REMINDER_TIME);
  });
});

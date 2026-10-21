import { describe, expect, it } from 'vitest';
import {
  applyCalendarDate,
  applyPickerValue,
  applyTimeOfDay,
  formatDateForDisplay,
  formatDateInputForDisplay,
  formatTimeForDisplay,
  formatTimeInputForDisplay,
  getDefaultEndDate,
  getDurationFromNow,
  getRelativeEndDate,
  isBeyond24Hours,
  isInPast,
  parseDateInput,
  parseTimeInput,
  validateEndDate,
} from './working-hours';

/** Local time, so the tests do not depend on the time zone of the machine. */
const local = (day: number, hours: number, minutes = 0) =>
  new Date(2026, 8, day, hours, minutes, 0, 0);

const NOW = local(21, 12, 0);
const hoursFrom = (date: Date, hours: number) => new Date(date.getTime() + hours * 3_600_000);

describe('isInPast / isBeyond24Hours', () => {
  it('treats now itself as past', () => {
    expect(isInPast(NOW, NOW)).toBe(true);
    expect(isInPast(hoursFrom(NOW, 0.001), NOW)).toBe(false);
  });

  it('allows exactly 24 hours but not a millisecond more', () => {
    expect(isBeyond24Hours(hoursFrom(NOW, 24), NOW)).toBe(false);
    expect(isBeyond24Hours(new Date(hoursFrom(NOW, 24).getTime() + 1), NOW)).toBe(true);
  });
});

describe('validateEndDate', () => {
  it('accepts an end date inside the window', () => {
    expect(validateEndDate(hoursFrom(NOW, 8), NOW)).toEqual({ valid: true });
  });

  it('rejects a moment in the past', () => {
    expect(validateEndDate(hoursFrom(NOW, -1), NOW)).toEqual({ valid: false, error: 'inPast' });
    expect(validateEndDate(NOW, NOW)).toEqual({ valid: false, error: 'inPast' });
  });

  it('rejects a moment more than 24 hours away', () => {
    expect(validateEndDate(hoursFrom(NOW, 25), NOW)).toEqual({ valid: false, error: 'beyond24' });
  });

  it('rejects an invalid date', () => {
    expect(validateEndDate(new Date('nonsense'), NOW)).toEqual({ valid: false, error: 'inPast' });
  });
});

describe('parseTimeInput', () => {
  it.each([
    ['14:30', 14, 30],
    ['9:05', 9, 5],
    ['9:5', 9, 5],
    ['1430', 14, 30],
    ['930', 9, 30],
    ['30', 0, 30],
    ['0', 0, 0],
    ['23:59', 23, 59],
    ['00:00', 0, 0],
    [' 14 : 30 ', 14, 30],
    ['14h30', 14, 30],
    [':30', 0, 30],
    ['7:', 7, 0],
  ])('parses %j as %i:%i', (input, hours, minutes) => {
    expect(parseTimeInput(input)).toEqual({ hours, minutes });
  });

  it.each([['24:00'], ['12:60'], ['2460'], ['12345'], ['abc'], ['']])('rejects %j', (input) => {
    expect(parseTimeInput(input)).toBeNull();
  });
});

describe('relative dates', () => {
  it('adds hours to now', () => {
    expect(getRelativeEndDate(2, NOW)).toEqual(local(21, 14));
  });

  it('proposes a nine hour shift by default (8h work + 1h break)', () => {
    expect(getDefaultEndDate(NOW)).toEqual(local(21, 21));
  });
});

describe('getDurationFromNow', () => {
  it('splits the time left in hours and minutes, rounding down', () => {
    expect(
      getDurationFromNow(new Date(NOW.getTime() + (3 * 60 + 25) * 60_000 + 59_000), NOW),
    ).toEqual({
      hours: 3,
      minutes: 25,
    });
  });

  it('never goes negative', () => {
    expect(getDurationFromNow(hoursFrom(NOW, -5), NOW)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('applyTimeOfDay', () => {
  it('uses today when the time is still to come', () => {
    expect(applyTimeOfDay(null, 18, 30, NOW)).toEqual(local(21, 18, 30));
  });

  it('uses tomorrow when the time has passed', () => {
    expect(applyTimeOfDay(null, 8, 0, NOW)).toEqual(local(22, 8, 0));
  });

  it('moves a time that equals now to tomorrow', () => {
    expect(applyTimeOfDay(null, 12, 0, NOW)).toEqual(local(22, 12, 0));
  });

  it('keeps the date of the earlier end date', () => {
    expect(applyTimeOfDay(local(22, 9, 0), 10, 15, NOW)).toEqual(local(22, 10, 15));
  });

  it('does not change the date it was given', () => {
    const base = local(22, 9, 0);
    applyTimeOfDay(base, 10, 15, NOW);
    expect(base).toEqual(local(22, 9, 0));
  });
});

describe('applyCalendarDate', () => {
  it('sets day, month and year and keeps the time of day', () => {
    expect(applyCalendarDate(local(21, 17, 45), 22, 9, 2026, NOW)).toEqual(local(22, 17, 45));
  });

  it('counts months from 1', () => {
    expect(applyCalendarDate(null, 1, 1, 2027, NOW)).toEqual(new Date(2027, 0, 1, 12, 0, 0, 0));
  });
});

describe('applyPickerValue', () => {
  it('a picked date keeps the time of day of the earlier end date', () => {
    const result = applyPickerValue(local(21, 17, 45), local(22, 3, 0), 'date', NOW);
    expect(result).toEqual(local(22, 17, 45));
  });

  it('a picked time keeps the date of the earlier end date', () => {
    const result = applyPickerValue(local(22, 9, 0), local(21, 14, 20), 'time', NOW);
    expect(result).toEqual(local(22, 14, 20));
  });

  it('moves a result in the past to the next day', () => {
    expect(applyPickerValue(null, local(21, 8, 0), 'time', NOW)).toEqual(local(22, 8, 0));
  });

  it('uses the year of the picked date (the old app kept the year of the earlier date)', () => {
    const december = new Date(2026, 11, 31, 23, 0, 0, 0);
    const picked = new Date(2027, 0, 1, 0, 0, 0, 0);
    expect(applyPickerValue(december, picked, 'date', december).getFullYear()).toBe(2027);
  });
});

describe('date and time field formatting', () => {
  it('shows a calendar date as DD / MM / YYYY', () => {
    expect(formatDateForDisplay(local(21, 12))).toBe('21 / 09 / 2026');
    expect(formatDateForDisplay(null)).toBe('');
  });

  it('inserts separators while the berger types a date', () => {
    expect(formatDateInputForDisplay('17')).toBe('17');
    expect(formatDateInputForDisplay('1706')).toBe('17 / 06');
    expect(formatDateInputForDisplay('17062026')).toBe('17 / 06 / 2026');
    expect(formatDateInputForDisplay('17 / 06 / 202699')).toBe('17 / 06 / 2026');
  });

  it('parses a complete real calendar day', () => {
    expect(parseDateInput('21 / 09 / 2026')).toEqual({ day: 21, month: 9, year: 2026 });
  });

  it('rejects an incomplete or impossible date', () => {
    expect(parseDateInput('21 / 09')).toBeNull();
    expect(parseDateInput('31 / 02 / 2026')).toBeNull();
    expect(parseDateInput('00 / 13 / 2026')).toBeNull();
  });

  it('shows a time of day as HH:MM', () => {
    expect(formatTimeForDisplay(local(21, 8, 5))).toBe('08:05');
    expect(formatTimeForDisplay(null)).toBe('');
  });

  it('inserts a colon while the berger types a time', () => {
    expect(formatTimeInputForDisplay('14')).toBe('14');
    expect(formatTimeInputForDisplay('1430')).toBe('14:30');
    expect(formatTimeInputForDisplay('14:3099')).toBe('14:30');
  });
});

import { describe, expect, it } from 'vitest';
import {
  availabilityFallbackKey,
  availabilityTone,
  filterAvailabilityOptions,
  isAvailabilityEditable,
  WORKER_AVAILABILITY,
  type AvailabilityOption,
} from './availability';

const options: AvailabilityOption[] = [
  { value: WORKER_AVAILABILITY.AVAILABLE, text: 'Beschikbaar' },
  { value: WORKER_AVAILABILITY.UNAVAILABLE, text: 'Niet beschikbaar' },
  { value: WORKER_AVAILABILITY.BREAK, text: 'Pauze' },
  { value: WORKER_AVAILABILITY.BUSY, text: 'Bezig met opdracht(en)' },
  { value: WORKER_AVAILABILITY.TRAINING, text: 'Training/Opleiding' },
];

describe('isAvailabilityEditable', () => {
  it('blocks changing status while the berger is busy with assignments', () => {
    expect(isAvailabilityEditable(WORKER_AVAILABILITY.BUSY)).toBe(false);
  });

  it('allows changing any other known status', () => {
    expect(isAvailabilityEditable(WORKER_AVAILABILITY.AVAILABLE)).toBe(true);
    expect(isAvailabilityEditable(WORKER_AVAILABILITY.BREAK)).toBe(true);
  });

  it('allows tapping when the status is still unknown', () => {
    expect(isAvailabilityEditable(undefined)).toBe(true);
    expect(isAvailabilityEditable(null)).toBe(true);
  });
});

describe('availabilityTone', () => {
  it('marks available and on-call as success', () => {
    expect(availabilityTone(WORKER_AVAILABILITY.AVAILABLE)).toBe('success');
    expect(availabilityTone(WORKER_AVAILABILITY.AVAILABLE_ON_CALL)).toBe('success');
  });

  it('marks unavailable-like statuses as danger', () => {
    expect(availabilityTone(WORKER_AVAILABILITY.UNAVAILABLE)).toBe('danger');
    expect(availabilityTone(WORKER_AVAILABILITY.NOT_ON_DUTY)).toBe('danger');
    expect(availabilityTone(WORKER_AVAILABILITY.MEETING)).toBe('danger');
    expect(availabilityTone(WORKER_AVAILABILITY.BUSY)).toBe('danger');
  });

  it('marks break, training, backup and unknown as warning', () => {
    expect(availabilityTone(WORKER_AVAILABILITY.BREAK)).toBe('warning');
    expect(availabilityTone(WORKER_AVAILABILITY.TRAINING)).toBe('warning');
    expect(availabilityTone(WORKER_AVAILABILITY.BACKUP)).toBe('warning');
    expect(availabilityTone(undefined)).toBe('warning');
    expect(availabilityTone(999)).toBe('warning');
  });
});

describe('filterAvailabilityOptions', () => {
  it('keeps only available and unavailable for an external berger', () => {
    expect(filterAvailabilityOptions(options, 'external')).toEqual([
      { value: WORKER_AVAILABILITY.AVAILABLE, text: 'Beschikbaar' },
      { value: WORKER_AVAILABILITY.UNAVAILABLE, text: 'Niet beschikbaar' },
    ]);
  });

  it('drops busy for an internal berger and keeps the rest', () => {
    expect(filterAvailabilityOptions(options, 'internal')).toEqual([
      { value: WORKER_AVAILABILITY.AVAILABLE, text: 'Beschikbaar' },
      { value: WORKER_AVAILABILITY.UNAVAILABLE, text: 'Niet beschikbaar' },
      { value: WORKER_AVAILABILITY.BREAK, text: 'Pauze' },
      { value: WORKER_AVAILABILITY.TRAINING, text: 'Training/Opleiding' },
    ]);
  });
});

describe('availabilityFallbackKey', () => {
  it('maps every known CRM code to an i18n suffix', () => {
    expect(availabilityFallbackKey(WORKER_AVAILABILITY.AVAILABLE)).toBe('available');
    expect(availabilityFallbackKey(WORKER_AVAILABILITY.BUSY)).toBe('busy');
  });

  it('returns null for an unknown or missing code', () => {
    expect(availabilityFallbackKey(999)).toBeNull();
    expect(availabilityFallbackKey(undefined)).toBeNull();
    expect(availabilityFallbackKey(null)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { classifyAllocation, INCIDENT_STATUS, isIncidentFinished } from './status';

describe('classifyAllocation', () => {
  it('shows an allocation waiting for acceptance as pending', () => {
    expect(classifyAllocation({ statuscode: 1, statecode: 0 })).toBe('pending');
  });

  it.each([875920000, 875920001, 875920002, 875920016])(
    'shows status %i as active',
    (statuscode) => {
      expect(classifyAllocation({ statuscode, statecode: 0 })).toBe('active');
    },
  );

  it('hides allocations that are closed at the CRM', () => {
    expect(classifyAllocation({ statuscode: 875920000, statecode: 1 })).toBe('hidden');
    expect(classifyAllocation({ statuscode: 1, statecode: 1 })).toBe('hidden');
  });

  it('keeps a reassign-pending allocation visible although it is closed', () => {
    expect(classifyAllocation({ statuscode: 875920007, statecode: 1 })).toBe('active');
  });

  it('hides allocations with a status the app does not know', () => {
    expect(classifyAllocation({ statuscode: 42, statecode: 0 })).toBe('hidden');
  });
});

describe('isIncidentFinished', () => {
  it('is true only after the last departure', () => {
    expect(isIncidentFinished(INCIDENT_STATUS.LAST_DEPARTURE)).toBe(true);
    expect(isIncidentFinished(INCIDENT_STATUS.IN_PROGRESS)).toBe(false);
    expect(isIncidentFinished(INCIDENT_STATUS.CLOSED)).toBe(false);
    expect(isIncidentFinished(undefined)).toBe(false);
  });
});

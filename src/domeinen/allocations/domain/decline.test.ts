import { describe, expect, it } from 'vitest';
import { SERVICE_STATUS } from '@/domeinen/services';
import { canDeclineAllocation, filterDeclineReasons, type DeclineReason } from './decline';
import { ALLOCATION_DONE_STATUS } from './status';

const ALL_REASONS: DeclineReason[] = [
  { value: 875920000, text: 'Aanrijdend' },
  { value: 875920001, text: 'Ter plaatse' },
  { value: 875920002, text: 'Vervoer' },
  { value: 875920003, text: 'Reeds voldoende aansturing op incident' },
  { value: 1, text: 'Aangestuurd' },
  { value: 875920006, text: 'Medewerker niet beschikbaar' },
  { value: 875920012, text: 'Zelf met pech/schade gestrand' },
  { value: ALLOCATION_DONE_STATUS, text: 'Klaar met opdracht' },
];

describe('filterDeclineReasons', () => {
  it('drops the codes that describe an in-progress state, not a reason', () => {
    const result = filterDeclineReasons(ALL_REASONS, { allowDone: true });
    expect(result.map((r) => r.value)).toEqual([875920006, 875920012, ALLOCATION_DONE_STATUS]);
  });

  it('also drops "done" when it is not allowed here', () => {
    const result = filterDeclineReasons(ALL_REASONS, { allowDone: false });
    expect(result.map((r) => r.value)).toEqual([875920006, 875920012]);
  });

  it('returns nothing for an empty list', () => {
    expect(filterDeclineReasons([], { allowDone: true })).toEqual([]);
  });
});

describe('canDeclineAllocation', () => {
  it('allows declining when nothing is actively being worked on', () => {
    expect(canDeclineAllocation([{ statuscode: SERVICE_STATUS.NOG_AANSTUREN }])).toBe(true);
    expect(canDeclineAllocation([])).toBe(true);
    expect(canDeclineAllocation(null)).toBe(true);
  });

  it('blocks declining while a service is actively being worked on', () => {
    expect(canDeclineAllocation([{ statuscode: SERVICE_STATUS.IN_UITVOERING }])).toBe(false);
  });
});

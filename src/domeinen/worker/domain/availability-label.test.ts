import { describe, expect, it } from 'vitest';
import { WORKER_AVAILABILITY } from './availability';
import { resolveAvailabilityLabel } from './availability-label';

describe('resolveAvailabilityLabel', () => {
  it('prefers the reference-data label when the code is in the list', () => {
    expect(
      resolveAvailabilityLabel(WORKER_AVAILABILITY.AVAILABLE, [
        { value: WORKER_AVAILABILITY.AVAILABLE, text: 'Uit sync' },
      ]),
    ).toEqual({ kind: 'text', text: 'Uit sync' });
  });

  it('falls back to an i18n key when the code is known but not in the list', () => {
    expect(resolveAvailabilityLabel(WORKER_AVAILABILITY.BREAK, [])).toEqual({
      kind: 'fallback',
      key: 'break',
    });
  });

  it('marks a missing or unknown code as unknown', () => {
    expect(resolveAvailabilityLabel(undefined, [])).toEqual({ kind: 'unknown' });
    expect(resolveAvailabilityLabel(999, [])).toEqual({ kind: 'unknown' });
  });
});

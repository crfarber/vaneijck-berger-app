import { describe, expect, it } from 'vitest';
import { resolveOpenServiceRoute } from './open-service';
import { SERVICE_STATUS } from './status';

describe('resolveOpenServiceRoute', () => {
  it.each([SERVICE_STATUS.GEFACTUREERD, SERVICE_STATUS.NACONTROLE, 999, undefined] as const)(
    'returns blocked for non-submittable status %s',
    (statuscode) => {
      expect(resolveOpenServiceRoute(statuscode)).toBe('blocked');
    },
  );

  it('returns finish when the service is already HULPVERLENING_AFGEROND', () => {
    expect(resolveOpenServiceRoute(SERVICE_STATUS.HULPVERLENING_AFGEROND)).toBe('finish');
  });

  it.each([
    SERVICE_STATUS.IN_UITVOERING,
    SERVICE_STATUS.HULPVERLENING_AKKOORD,
    SERVICE_STATUS.NOG_AANSTUREN,
    SERVICE_STATUS.LAATSTE_BERICHT,
  ] as const)('returns form for submittable status %s', (statuscode) => {
    expect(resolveOpenServiceRoute(statuscode)).toBe('form');
  });
});

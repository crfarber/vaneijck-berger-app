import { describe, expect, it } from 'vitest';
import { PERMISSION_STATUS } from '@/domeinen/settings';
import { GPS_STATUS, gpsButtonVariant, resolveGpsStatus } from './gps-status';

describe('resolveGpsStatus', () => {
  it('asks when permission is still undetermined', () => {
    expect(
      resolveGpsStatus({ status: PERMISSION_STATUS.undetermined, canAskAgain: true }, null),
    ).toBe(GPS_STATUS.ask);
  });

  it('opens settings when permission was refused and cannot be asked again', () => {
    expect(resolveGpsStatus({ status: PERMISSION_STATUS.denied, canAskAgain: false }, null)).toBe(
      GPS_STATUS.openSettings,
    );
  });

  it('is active when permission is granted and there is a usable fix', () => {
    expect(
      resolveGpsStatus(
        { status: PERMISSION_STATUS.granted, canAskAgain: true },
        { isValid: true, latitude: 52.1, longitude: 5.1 },
      ),
    ).toBe(GPS_STATUS.active);
  });

  it('is no-fix when permission is granted but the position is missing', () => {
    expect(
      resolveGpsStatus(
        { status: PERMISSION_STATUS.granted, canAskAgain: true },
        { isValid: false },
      ),
    ).toBe(GPS_STATUS.noFix);
  });
});

describe('gpsButtonVariant', () => {
  it('is green whenever permission is granted, red otherwise', () => {
    expect(gpsButtonVariant(GPS_STATUS.active)).toBe('success');
    expect(gpsButtonVariant(GPS_STATUS.noFix)).toBe('success');
    expect(gpsButtonVariant(GPS_STATUS.ask)).toBe('alert');
    expect(gpsButtonVariant(GPS_STATUS.openSettings)).toBe('alert');
  });
});

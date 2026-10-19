import { describe, expect, it } from 'vitest';
import { parseNotification } from '@/domeinen/notifications';
import { fakeStandbyLocationMessage } from './fake-standby-notification';

describe('fakeStandbyLocationMessage', () => {
  it('parses as StandbyLocationAdvice with Diemen coordinates by default', () => {
    const parsed = parseNotification(fakeStandbyLocationMessage(1_700_000_000_000));
    expect(parsed.token).toBe('StandbyLocationAdvice');
    expect(parsed.id).toBe('debug-standby-1700000000000');
    expect(parsed.standbyAdvice).toMatchObject({
      standbyLocationId: 'debug-mock-standby',
      latitude: 52.34151,
      longitude: 4.95544,
      street: 'Diemerkade',
      houseNo: '12',
      city: 'DIEMEN',
    });
  });

  it('uses a custom resolved address when provided', () => {
    const parsed = parseNotification(
      fakeStandbyLocationMessage(1, {
        standbyLocationId: 'debug-postal-1234AB-1',
        name: 'Voorbeeld',
        street: 'Dorpsstraat',
        houseNo: '1',
        city: 'Voorbeeld',
        postalCode: '1234AB',
        latitude: 52.1,
        longitude: 5.1,
      }),
    );
    expect(parsed.standbyAdvice).toMatchObject({
      standbyLocationId: 'debug-postal-1234AB-1',
      street: 'Dorpsstraat',
      houseNo: '1',
      city: 'Voorbeeld',
      latitude: 52.1,
      longitude: 5.1,
    });
  });
});

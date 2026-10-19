import type { RemoteMessage } from '@/domeinen/notifications';

export type FakeStandbyAddress = {
  readonly standbyLocationId?: string;
  readonly name?: string;
  readonly street: string;
  readonly houseNo: string;
  readonly city: string;
  readonly postalCode: string;
  readonly latitude: number;
  readonly longitude: number;
};

/** Default Diemen mock — same coordinates as the old app's debug standby. */
export const DEFAULT_FAKE_STANDBY_ADDRESS: FakeStandbyAddress = {
  standbyLocationId: 'debug-mock-standby',
  name: 'Testlocatie',
  street: 'Diemerkade',
  houseNo: '12',
  city: 'DIEMEN',
  postalCode: '1111AB',
  latitude: 52.34151,
  longitude: 4.95544,
};

/**
 * Builds a `StandbyLocationAdvice` FCM-shaped message for the debug inject path.
 */
export function fakeStandbyLocationMessage(
  nowMs: number,
  address: FakeStandbyAddress = DEFAULT_FAKE_STANDBY_ADDRESS,
): RemoteMessage {
  const body = `${address.street} ${address.houseNo}, ${address.city}`;
  return {
    messageId: `debug-standby-${nowMs}`,
    notification: {
      title: 'Standby locatie advies',
      body,
    },
    data: {
      type: 'StandbyLocationAdvice',
      standbyLocationId: address.standbyLocationId ?? 'debug-mock-standby',
      name: address.name ?? address.city,
      street: address.street,
      houseNo: address.houseNo,
      city: address.city,
      postalCode: address.postalCode.replace(/\s+/g, ''),
      latitude: String(address.latitude),
      longitude: String(address.longitude),
    },
  };
}

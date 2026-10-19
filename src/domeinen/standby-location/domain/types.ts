/** Lifecycle of a standby advice held on the device. */
export type StandbyAdviceStatus = 'active' | 'expired';

/**
 * Fields from a `StandbyLocationAdvice` push. Coordinates are required; address parts are optional.
 * `receivedAt` is set when the app accepts the advice (ISO), not from the payload.
 */
export type StandbyLocationAdvice = {
  readonly standbyLocationId: string;
  readonly name?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly street?: string;
  readonly houseNo?: string;
  readonly city?: string;
  readonly postalCode?: string;
  readonly receivedAt: string;
};

/** Payload fields before the service stamps `receivedAt`. */
export type StandbyLocationAdviceFields = Omit<StandbyLocationAdvice, 'receivedAt'>;

export type StandbyLocationState = {
  readonly pendingAdvice: StandbyLocationAdvice | null;
  readonly status: StandbyAdviceStatus | null;
  readonly hydrated: boolean;
};

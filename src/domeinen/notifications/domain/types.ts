/** The kinds of push message the backend sends. */
export const NOTIFICATION_TOKENS = [
  'NewIncident',
  'ChangedIncident',
  'AcceptService',
  'DissolvedIncident',
  'AllocationDissolved',
  'WorkerStatus',
  'VehicleDeliverance',
  'NewTms',
  'StandbyLocationAdvice',
] as const;

export type NotificationToken = (typeof NOTIFICATION_TOKENS)[number];

/**
 * - `default`: show a banner in the foreground, handle the message, open the allocation on tap.
 * - `hiddenBanner`: only handle the message. The backend must send it as data-only.
 * - `disabled`: ignore it completely.
 */
export type NotificationDisplayMode = 'default' | 'hiddenBanner' | 'disabled';

export const NOTIFICATION_DISPLAY_MODE: Readonly<
  Record<NotificationToken, NotificationDisplayMode>
> = {
  NewIncident: 'default',
  ChangedIncident: 'default',
  AcceptService: 'default',
  DissolvedIncident: 'default',
  AllocationDissolved: 'default',
  VehicleDeliverance: 'default',
  NewTms: 'default',
  WorkerStatus: 'hiddenBanner',
  StandbyLocationAdvice: 'disabled',
};

/** Where a message came from. Taps (`opened`, `initial`, `notifee-press`) may navigate. */
export type NotificationSource =
  'foreground' | 'background' | 'opened' | 'initial' | 'notifee-press';

/** The part of a Firebase message the domain needs. The device adapter maps the real one to this. */
export type RemoteMessage = {
  messageId?: string | null;
  data?: Readonly<Record<string, unknown>> | null;
  notification?: { title?: string | null; body?: string | null } | null;
};

export type ParsedNotification = {
  /** Identifies the message, for de-duplication. Null when the message carries no id. */
  id: string | null;
  /** Null when the type is missing or unknown. */
  token: NotificationToken | null;
  /** Whether the message named its type at all (as opposed to naming one we do not know). */
  hasExplicitType: boolean;
  allocationId?: string;
  incidentId?: string;
  serviceId?: string;
  title: string;
  body: string;
};

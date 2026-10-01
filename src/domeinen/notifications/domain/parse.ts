import type { NotificationToken, ParsedNotification, RemoteMessage } from './types';

type Payload = Record<string, unknown>;

const isObject = (value: unknown): value is Payload =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Firebase data values are strings, so nested objects arrive as JSON text. */
function asObject(value: unknown): Payload | null {
  if (isObject(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The backend puts the payload in one of three places: at the top of `data`, in `data.body`
 * (object or JSON text), or in `data.body.Data`. They are merged, the innermost winning.
 */
export function extractPayload(message: RemoteMessage): Payload {
  const root: Payload = { ...message.data };
  const body = asObject(root.body);
  const nested = asObject(body?.Data);
  return { ...root, ...body, ...nested };
}

/** The keys the backend has used for the type of a message, in order of preference. */
const TYPE_KEYS = ['Type', 'type', 'Event', 'event', 'EventType', 'eventType', 'action', 'Action'];

/** The first non-empty type field. Numbers are accepted as text; no numeric codes are known (see open questions). */
export function getNotificationType(payload: Payload): string | null {
  for (const key of TYPE_KEYS) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return null;
}

const TOKEN_BY_TYPE: Readonly<Record<string, NotificationToken>> = {
  newincident: 'NewIncident',
  changedincident: 'ChangedIncident',
  changed: 'ChangedIncident',
  acceptservice: 'AcceptService',
  dissolvedincident: 'DissolvedIncident',
  allocationdissolved: 'AllocationDissolved',
  workerstatus: 'WorkerStatus',
  vehicledeliverance: 'VehicleDeliverance',
  newtms: 'NewTms',
  tms: 'NewTms',
  standbylocationadvice: 'StandbyLocationAdvice',
};

export function resolveToken(type: string | null): NotificationToken | null {
  return type === null ? null : (TOKEN_BY_TYPE[type.toLowerCase()] ?? null);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** The id under which the same message can be recognised when it arrives more than once. */
export function getNotificationId(message: RemoteMessage): string | null {
  return (
    text(message.messageId) ??
    text(message.data?.messageId) ??
    text(message.data?.['google.message_id']) ??
    null
  );
}

export function parseNotification(message: RemoteMessage): ParsedNotification {
  const payload = extractPayload(message);
  const type = getNotificationType(payload);

  return {
    id: getNotificationId(message),
    token: resolveToken(type),
    hasExplicitType: type !== null,
    allocationId: text(payload.allocationId),
    incidentId: text(payload.incidentId),
    serviceId: text(payload.serviceid) ?? text(payload.serviceId),
    title: message.notification?.title ?? '',
    body: message.notification?.body ?? '',
  };
}

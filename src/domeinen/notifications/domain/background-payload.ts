import type { RemoteMessage } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * Maps the background-task envelope to the message the rest of the app understands.
 * A tap (it carries `actionIdentifier`) is left to the response listener, so it is not handled twice.
 */
export function remoteFromBackgroundPayload(data: unknown): RemoteMessage | null {
  if (!isRecord(data) || 'actionIdentifier' in data) {
    return null;
  }
  const inner = isRecord(data.data) ? data.data : {};
  let nested: Record<string, unknown> = {};
  if (typeof inner.dataString === 'string') {
    try {
      const parsed: unknown = JSON.parse(inner.dataString);
      if (isRecord(parsed)) {
        nested = parsed;
      }
    } catch {
      nested = {};
    }
  }
  const merged = { ...inner, ...nested };
  return {
    messageId: text(merged.messageId) ?? text(merged['google.message_id']),
    data: merged,
    notification: null,
  };
}

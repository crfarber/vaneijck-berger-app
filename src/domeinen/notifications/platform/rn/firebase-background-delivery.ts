import type { RemoteMessage } from '../../domain/types';

const MAX_PENDING = 20;
const pending: RemoteMessage[] = [];
let deliver: ((message: RemoteMessage) => void) | null = null;

function enqueue(message: RemoteMessage): void {
  if (deliver !== null) {
    deliver(message);
    return;
  }
  pending.push(message);
  if (pending.length > MAX_PENDING) {
    pending.shift();
  }
}

export function deliverFirebaseBackgroundMessage(message: RemoteMessage): void {
  enqueue(message);
}

/** Attaches the signed-in app to messages received before the runtime was listening. */
export function setFirebaseBackgroundDelivery(
  listener: ((message: RemoteMessage) => void) | null,
): void {
  deliver = listener;
  if (listener === null) {
    pending.length = 0;
    return;
  }
  const queued = pending.splice(0, pending.length);
  for (const message of queued) {
    listener(message);
  }
}

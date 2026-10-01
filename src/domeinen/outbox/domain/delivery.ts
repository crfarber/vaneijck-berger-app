import { HttpError, isRetryable } from '@/shared/api/errors';

export const OUTBOX_KIND = {
  finishAllocation: 'finish-allocation',
  declineAllocation: 'decline-allocation',
  acceptAllocation: 'accept-allocation',
  acceptService: 'accept-service',
  declineService: 'decline-service',
} as const;

export type OutboxKind = (typeof OUTBOX_KIND)[keyof typeof OUTBOX_KIND];

export type OutboxCommand =
  | { kind: typeof OUTBOX_KIND.finishAllocation; allocationId: string }
  | { kind: typeof OUTBOX_KIND.declineAllocation; allocationId: string; statuscode: number }
  | { kind: typeof OUTBOX_KIND.acceptAllocation; allocationId: string }
  | { kind: typeof OUTBOX_KIND.acceptService; serviceId: string }
  | { kind: typeof OUTBOX_KIND.declineService; serviceId: string; statuscode: number };

export const OUTBOX_STATUS = {
  queued: 'queued',
  failed: 'failed',
} as const;

export type OutboxStatus = (typeof OUTBOX_STATUS)[keyof typeof OUTBOX_STATUS];

export type OutboxItem = {
  id: string;
  createdAt: number;
  attempts: number;
  status: OutboxStatus;
  command: OutboxCommand;
};

export type Delivery = 'sent' | 'retry' | 'failed';

/**
 * A temporary failure stays at the head of the queue. A hard 4xx is a conflict: that item is
 * marked failed and the next one may go out. Order of the remaining queued items is kept.
 */
export function deliveryFor(error: unknown): Delivery {
  if (isRetryable(error)) {
    return 'retry';
  }
  if (error instanceof HttpError) {
    return 'failed';
  }
  return 'retry';
}

/** Only a temporary failure is worth keeping for later. A bug or a hard rejection is not. */
export function shouldQueueMutation(error: unknown): boolean {
  return isRetryable(error);
}

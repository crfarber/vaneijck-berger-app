import { describe, expect, it } from 'vitest';
import { HttpError, NetworkError } from '@/shared/api/errors';
import { deliveryFor, shouldQueueMutation } from './delivery';

describe('deliveryFor', () => {
  it('retries a lost connection and keeps the item at the head', () => {
    expect(deliveryFor(new NetworkError())).toBe('retry');
    expect(deliveryFor(new HttpError(503, null, ''))).toBe('retry');
  });

  it('marks a hard rejection as failed so the next item can leave', () => {
    expect(deliveryFor(new HttpError(409, null, 'conflict'))).toBe('failed');
    expect(deliveryFor(new HttpError(400, null, 'bad'))).toBe('failed');
  });
});

describe('shouldQueueMutation', () => {
  it('queues only a temporary failure', () => {
    expect(shouldQueueMutation(new NetworkError())).toBe(true);
    expect(shouldQueueMutation(new HttpError(500, null, ''))).toBe(true);
    expect(shouldQueueMutation(new HttpError(400, null, ''))).toBe(false);
    expect(shouldQueueMutation(new Error('boom'))).toBe(false);
  });
});

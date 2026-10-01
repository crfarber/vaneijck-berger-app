import { describe, expect, it } from 'vitest';
import { canForwardAllocations } from './status';
import type { Worker } from './types';

const worker = (canForward: boolean): Worker => ({
  dn_workerid: 'w1',
  dn_name: 'Jan',
  dn_canforwardallocationcode: canForward,
});

describe('canForwardAllocations', () => {
  it('allows forwarding when the worker record says so', () => {
    expect(canForwardAllocations(worker(true))).toBe(true);
  });

  it('blocks forwarding when the worker record says no', () => {
    expect(canForwardAllocations(worker(false))).toBe(false);
  });

  it('blocks forwarding when there is no worker record at all', () => {
    expect(canForwardAllocations(null)).toBe(false);
  });
});

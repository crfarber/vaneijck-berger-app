import { describe, expect, it, vi } from 'vitest';
import { deferred } from '@/test/fakes';
import type { AcceptResult } from '../service/allocation-actions-service';
import { createAllocationAcceptFlow, type AcceptFlowAllocation } from './allocation-accept-flow';

const pending: AcceptFlowAllocation = { dn_allocationid: 'alloc-1', statuscode: 1, statecode: 0 };

function setup() {
  const loadAllocations = vi.fn(async (): Promise<readonly AcceptFlowAllocation[]> => [pending]);
  const accept = vi.fn(async (): Promise<AcceptResult> => ({ kind: 'accepted' }));
  const flow = createAllocationAcceptFlow({ loadAllocations, actionsService: { accept } });
  return { flow, loadAllocations, accept };
}

describe('allocation accept continuation', () => {
  it('waits for successful unit completion before accepting the original assignment', async () => {
    const { flow, accept } = setup();
    const token = flow.getState().start('alloc-1');
    expect(accept).not.toHaveBeenCalled();
    expect(await flow.getState().complete(token)).toEqual({ kind: 'accepted' });
    expect(accept).toHaveBeenCalledExactlyOnceWith('alloc-1', false, expect.any(Function));
    expect(flow.getState().pending).toBeNull();
  });

  it('ignores duplicate completion and competing acceptance intents', async () => {
    const { flow, loadAllocations, accept } = setup();
    const waiting = deferred<readonly AcceptFlowAllocation[]>();
    loadAllocations.mockReturnValue(waiting.promise);
    const token = flow.getState().start('alloc-1');
    const completing = flow.getState().complete(token);
    expect(flow.getState().start('alloc-2')).toBeNull();
    expect(await flow.getState().complete(token)).toBeNull();
    waiting.resolve([pending]);
    await completing;
    expect(await flow.getState().complete(token)).toBeNull();
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('does not accept when registration is cancelled', async () => {
    const { flow, accept } = setup();
    const token = flow.getState().start('alloc-1');
    flow.getState().cancel(token);
    expect(await flow.getState().complete(token)).toBeNull();
    expect(accept).not.toHaveBeenCalled();
  });

  it('discards a late completion after cancellation or sign-out', async () => {
    const { flow, loadAllocations, accept } = setup();
    const waiting = deferred<readonly AcceptFlowAllocation[]>();
    loadAllocations.mockReturnValue(waiting.promise);
    const token = flow.getState().start('alloc-1');
    const completing = flow.getState().complete(token);
    flow.getState().cancel();
    waiting.resolve([pending]);
    expect(await completing).toBeNull();
    expect(accept).not.toHaveBeenCalled();
  });

  it('keeps a newer intent when an older route cancels or completes', async () => {
    const { flow, loadAllocations } = setup();
    const waiting = deferred<readonly AcceptFlowAllocation[]>();
    loadAllocations.mockReturnValueOnce(waiting.promise);
    const first = flow.getState().start('alloc-1');
    const completing = flow.getState().complete(first);
    flow.getState().cancel(first);
    const second = flow.getState().start('alloc-2');
    flow.getState().cancel(first);
    waiting.resolve([pending]);
    await completing;
    expect(flow.getState().pending?.token).toBe(second);
  });

  it.each([
    { allocations: [] },
    { allocations: [{ ...pending, statuscode: 875920000 }] },
    { allocations: [{ ...pending, statecode: 1 }] },
  ])('does not accept an assignment that is no longer pending', async ({ allocations }) => {
    const { flow, loadAllocations, accept } = setup();
    loadAllocations.mockResolvedValue(allocations);
    const token = flow.getState().start('alloc-1');
    expect(await flow.getState().complete(token)).toBeNull();
    expect(accept).not.toHaveBeenCalled();
  });

  it('rechecks the unit with the current active assignments', async () => {
    const { flow, loadAllocations, accept } = setup();
    loadAllocations.mockResolvedValue([
      pending,
      { ...pending, dn_allocationid: 'other', statuscode: 875920000 },
    ]);
    const token = flow.getState().start('alloc-1');
    await flow.getState().complete(token);
    expect(accept).toHaveBeenCalledExactlyOnceWith('alloc-1', true, expect.any(Function));
  });

  it.each<AcceptResult>([
    { kind: 'failed' },
    { kind: 'queued' },
    { kind: 'blocked' },
    { kind: 'reregister-required', reason: 'expired' },
  ])('returns the accept outcome without submitting again', async (result) => {
    const { flow, accept } = setup();
    accept.mockResolvedValue(result);
    const token = flow.getState().start('alloc-1');
    expect(await flow.getState().complete(token)).toEqual(result);
    expect(await flow.getState().complete(token)).toBeNull();
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('reports a failed refresh without accepting or retaining the intent', async () => {
    const { flow, loadAllocations, accept } = setup();
    loadAllocations.mockRejectedValue(new Error('offline'));
    const token = flow.getState().start('alloc-1');
    expect(await flow.getState().complete(token)).toEqual({ kind: 'failed' });
    expect(flow.getState().pending).toBeNull();
    expect(accept).not.toHaveBeenCalled();
  });

  it('rejects starting an intent outside a signed-in session', () => {
    const flow = createAllocationAcceptFlow({
      loadAllocations: async () => [],
      actionsService: { accept: async () => ({ kind: 'accepted' }) },
      canStart: () => false,
    });
    expect(flow.getState().start('alloc-1')).toBeNull();
    expect(flow.getState().pending).toBeNull();
  });

  it('marks a completed intent current until its route is dismissed', async () => {
    const { flow } = setup();
    const token = flow.getState().start('alloc-1');
    if (token === null) {
      throw new Error('Expected an acceptance intent');
    }
    await flow.getState().complete(token);
    expect(flow.getState().isCurrent(token)).toBe(true);
    flow.getState().cancel();
    expect(flow.getState().isCurrent(token)).toBe(false);
  });

  it('does not report a late refresh failure after cancellation', async () => {
    const { flow, loadAllocations } = setup();
    const waiting = deferred<readonly AcceptFlowAllocation[]>();
    loadAllocations.mockReturnValue(waiting.promise);
    const token = flow.getState().start('alloc-1');
    const completing = flow.getState().complete(token);
    flow.getState().cancel(token);
    waiting.reject(new Error('offline'));
    expect(await completing).toBeNull();
  });
});

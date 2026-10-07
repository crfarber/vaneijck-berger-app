import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';
import { createAllocationUnitManagement } from './allocation-unit-management';

describe('createAllocationUnitManagement', () => {
  it('blocks cancellation when an active assignment exists', async () => {
    const cancelCurrentUnit = vi.fn(async () => ok(undefined));
    const management = createAllocationUnitManagement({
      hasActiveWork: async () => true,
      cancelCurrentUnit,
    });

    expect(await management.cancelUnit()).toEqual({ ok: false, error: 'active-work' });
    expect(cancelCurrentUnit).not.toHaveBeenCalled();
  });

  it('cancels the current unit when no active assignment exists', async () => {
    const cancelCurrentUnit = vi.fn(async () => ok(undefined));
    const management = createAllocationUnitManagement({
      hasActiveWork: async () => false,
      cancelCurrentUnit,
    });

    expect(await management.cancelUnit()).toEqual({ ok: true, value: undefined });
    expect(cancelCurrentUnit).toHaveBeenCalledOnce();
  });

  it('reports an error when cancellation fails', async () => {
    const management = createAllocationUnitManagement({
      hasActiveWork: async () => false,
      cancelCurrentUnit: async () => err('cancel-failed'),
    });

    expect(await management.cancelUnit()).toEqual({ ok: false, error: 'cancel-failed' });
  });
});

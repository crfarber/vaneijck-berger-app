import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';
import { createSignOutGuard } from './sign-out-guard';

describe('createSignOutGuard', () => {
  it('blocks sign-out when there is active work', async () => {
    const signOut = vi.fn(async () => undefined);
    const cancelCurrentUnit = vi.fn(async () => ok(undefined));
    const guard = createSignOutGuard({
      hasActiveWork: async () => true,
      cancelCurrentUnit,
      signOut,
    });

    expect(await guard.signOut()).toEqual({ ok: false, error: 'active-work' });
    expect(cancelCurrentUnit).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('cancels the unit then signs out when nothing is in progress', async () => {
    const signOut = vi.fn(async () => undefined);
    const cancelCurrentUnit = vi.fn(async () => ok(undefined));
    const guard = createSignOutGuard({
      hasActiveWork: async () => false,
      cancelCurrentUnit,
      signOut,
    });

    expect(await guard.signOut()).toEqual({ ok: true, value: undefined });
    expect(cancelCurrentUnit).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('blocks sign-out when cancelling the unit fails', async () => {
    const signOut = vi.fn(async () => undefined);
    const cancelCurrentUnit = vi.fn(async () => err('cancel-failed'));
    const guard = createSignOutGuard({
      hasActiveWork: async () => false,
      cancelCurrentUnit,
      signOut,
    });

    expect(await guard.signOut()).toEqual({ ok: false, error: 'cancel-failed' });
    expect(signOut).not.toHaveBeenCalled();
  });
});

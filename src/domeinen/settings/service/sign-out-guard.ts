import { err, ok, type Result } from '@/shared/result';

export type SignOutFailure = 'active-work' | 'cancel-failed';

export type SignOutGuard = {
  /**
   * Signs out unless an active assignment is still open, or cancelling the unit fails.
   * Pending work does not block. Cancels the allocation unit first (token still valid).
   */
  signOut(): Promise<Result<void, SignOutFailure>>;
};

export type SignOutGuardDeps = {
  /**
   * Fresh check (with cache fallback) whether an assignment is in progress.
   * Wired in the container from `allocationsApi` + query cache — settings stays free of that domain.
   */
  hasActiveWork: () => Promise<boolean>;
  /**
   * Ends the current allocation unit on the server. No unit is fine; failure must block logout.
   */
  cancelCurrentUnit: () => Promise<Result<void, unknown>>;
  signOut: () => Promise<void>;
};

/**
 * Blocks voluntary sign-out while an assignment is in progress — same rule as the old
 * Settings `useLogout` (`AlertCompleteIncidents`). Cancels the unit before clearing the session
 * (old `postApiAllocationUnitsIdCancel`); a cancel failure keeps the session.
 */
export function createSignOutGuard(deps: SignOutGuardDeps): SignOutGuard {
  const { hasActiveWork, cancelCurrentUnit, signOut } = deps;

  return {
    async signOut() {
      if (await hasActiveWork()) {
        return err('active-work');
      }
      const cancelled = await cancelCurrentUnit();
      if (!cancelled.ok) {
        return err('cancel-failed');
      }
      await signOut();
      return ok(undefined);
    },
  };
}

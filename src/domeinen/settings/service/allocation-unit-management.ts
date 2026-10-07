import { err, ok, type Result } from '@/shared/result';

export type AllocationUnitManagementFailure = 'active-work' | 'cancel-failed';

export type AllocationUnitManagement = {
  cancelUnit(): Promise<Result<void, AllocationUnitManagementFailure>>;
};

export type AllocationUnitManagementDeps = {
  hasActiveWork: () => Promise<boolean>;
  cancelCurrentUnit: () => Promise<Result<void, unknown>>;
};

export function createAllocationUnitManagement(
  deps: AllocationUnitManagementDeps,
): AllocationUnitManagement {
  const { hasActiveWork, cancelCurrentUnit } = deps;

  return {
    async cancelUnit() {
      if (await hasActiveWork()) {
        return err('active-work');
      }
      const cancelled = await cancelCurrentUnit();
      return cancelled.ok ? ok(undefined) : err('cancel-failed');
    },
  };
}

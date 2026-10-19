import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnboardingGate } from './use-onboarding-gate';

const fakes = vi.hoisted(() => ({
  isSuccess: true,
  isFetching: false,
  activeCount: 0,
  data: { kind: 'required', reason: 'no-unit' },
  queryOptions: vi.fn(),
  allocationOptions: vi.fn(),
}));

vi.mock('react', () => ({
  useState: () => [false, vi.fn()],
  useCallback: <Callback extends (...args: never[]) => unknown>(callback: Callback) => callback,
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => {
    fakes.queryOptions(options);
    return { data: fakes.data, refetch: vi.fn() };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/domeinen/auth/ui', () => ({ useSession: () => 'external' }));
vi.mock('@/domeinen/allocation-unit/ui', () => ({
  useAllocationUnitService: () => ({ checkReregister: vi.fn() }),
}));
vi.mock('@/domeinen/allocations/ui', () => ({
  useAllocations: (options: unknown) => {
    fakes.allocationOptions(options);
    return {
      sections: [{ type: 'active', count: fakes.activeCount, data: [] }],
      isSuccess: fakes.isSuccess,
      isFetching: fakes.isFetching,
    };
  },
}));

describe('onboarding assignment safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakes.isSuccess = true;
    fakes.isFetching = false;
    fakes.activeCount = 0;
  });

  it.each(['loading', 'failed', 'refreshing'] as const)(
    'does not offer registration with %s assignments',
    (status) => {
      fakes.isSuccess = status === 'refreshing';
      fakes.isFetching = status !== 'failed';
      expect(useOnboardingGate()).toMatchObject({
        status: 'ready',
        step: 'allocations',
        notice: 'none',
      });
      expect(fakes.queryOptions).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    },
  );

  it('refreshes assignments even when a cached empty list is still fresh', () => {
    useOnboardingGate();
    expect(fakes.allocationOptions).toHaveBeenCalledWith({ refetchOnMount: 'always' });
  });

  it('offers registration only after successful assignment loading without active work', () => {
    expect(useOnboardingGate()).toMatchObject({ notice: 'register-unit' });
  });

  it('overrides a stale unit check when active work exists', () => {
    fakes.activeCount = 1;
    expect(useOnboardingGate()).toMatchObject({
      step: 'allocations',
      notice: 'no-valid-unit-continue',
    });
  });
});

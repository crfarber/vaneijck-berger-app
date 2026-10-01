import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  allocationKeys,
  vehicleReleaseKeys,
  type Allocation,
  type AllocationsApi,
} from '@/domeinen/allocations';
import { workerQueryKey } from '@/domeinen/notifications';
import { HttpError } from '@/shared/api/errors';
import { createQueryNotificationActions } from './notification-actions';

const allocation = (id: string, incidentId: string): Allocation => ({
  dn_allocationid: id,
  statuscode: 1,
  statecode: 0,
  incident: { dn_incidentid: incidentId, statuscode: 1 },
  services: null,
});

function setup(get: AllocationsApi['get'] = async () => allocation('a1', 'i1')) {
  const queryClient = new QueryClient();
  const allocations = { get } as unknown as AllocationsApi;
  return {
    queryClient,
    actions: createQueryNotificationActions({ queryClient, allocations }),
  };
}

describe('createQueryNotificationActions', () => {
  it('puts the fetched allocation into the list, replacing one that was already there', async () => {
    const fresh = setup(async () => allocation('a1', 'i1'));
    await expect(fresh.actions.fetchAllocation('a1')).resolves.toBe(true);
    expect(fresh.queryClient.getQueryData<Allocation[]>(allocationKeys.list())).toHaveLength(1);

    const { queryClient, actions } = setup(async () => allocation('a1', 'i1'));
    queryClient.setQueryData(allocationKeys.list(), [
      allocation('a1', 'old'),
      allocation('a2', 'i2'),
    ]);

    await expect(actions.fetchAllocation('a1')).resolves.toBe(true);

    expect(
      queryClient
        .getQueryData<Allocation[]>(allocationKeys.list())
        ?.map((item) => item.incident.dn_incidentid),
    ).toEqual(['i1', 'i2']);
  });

  it('reports a missing allocation without throwing, and rethrows any other failure', async () => {
    const missing = setup(async () => {
      throw new HttpError(404, null);
    });
    await expect(missing.actions.fetchAllocation('gone')).resolves.toBe(false);

    const broken = setup(async () => {
      throw new HttpError(500, null);
    });
    await expect(broken.actions.fetchAllocation('a1')).rejects.toBeInstanceOf(HttpError);
  });

  it('removes an allocation by its own id or by its incident', () => {
    const { queryClient, actions } = setup();
    actions.removeAllocation({ allocationId: 'missing' });
    queryClient.setQueryData(allocationKeys.list(), [
      allocation('a1', 'i1'),
      allocation('a2', 'i2'),
    ]);

    actions.removeAllocation({ allocationId: 'a1' });
    actions.removeAllocation({ incidentId: 'i2' });

    expect(queryClient.getQueryData<Allocation[]>(allocationKeys.list())).toEqual([]);
  });

  it('invalidates the list, the worker and the vehicle releases', async () => {
    const { queryClient, actions } = setup();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await actions.refreshAllocations();
    await actions.reloadWorker();
    await actions.reloadVehicleReleases();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: allocationKeys.list() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: workerQueryKey });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: vehicleReleaseKeys.list() });
  });
});

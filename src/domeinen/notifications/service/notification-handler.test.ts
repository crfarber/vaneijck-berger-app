import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '@/shared/logging/logger';
import { createFakeClock } from '@/test/fakes';
import type { ParsedNotification } from '../domain/types';
import { createNotificationHandler, type NotificationActions } from './notification-handler';

const parsed = (overrides: Partial<ParsedNotification>): ParsedNotification => ({
  id: null,
  token: null,
  hasExplicitType: false,
  title: '',
  body: '',
  ...overrides,
});

function setup() {
  const actions: NotificationActions = {
    fetchAllocation: vi.fn(async () => true),
    refreshAllocations: vi.fn(async () => undefined),
    removeAllocation: vi.fn(async () => undefined),
    reloadWorker: vi.fn(async () => undefined),
    reloadVehicleReleases: vi.fn(async () => undefined),
    applyStandbyAdvice: vi.fn(),
    expireStandbyAdvice: vi.fn(),
  };
  const logger = createLogger({ clock: createFakeClock() });
  return { actions, logger, handler: createNotificationHandler(actions, logger) };
}

describe('createNotificationHandler', () => {
  it('fetches the allocation of a new incident', async () => {
    const { handler, actions } = setup();

    const outcome = await handler.handle(parsed({ token: 'NewIncident', allocationId: 'a1' }));

    expect(actions.fetchAllocation).toHaveBeenCalledWith('a1');
    expect(actions.refreshAllocations).not.toHaveBeenCalled();
    expect(outcome).toEqual({ allocationId: 'a1', resolved: true });
  });

  it('refreshes everything when the allocation cannot be found by id', async () => {
    const { handler, actions, logger } = setup();
    vi.mocked(actions.fetchAllocation).mockResolvedValueOnce(false);

    const outcome = await handler.handle(parsed({ token: 'ChangedIncident', allocationId: 'a1' }));

    expect(actions.refreshAllocations).toHaveBeenCalledTimes(1);
    expect(outcome.resolved).toBe(true);
    expect(logger.entries().some((entry) => entry.level === 'warn')).toBe(true);
  });

  it('refreshes everything when fetching the allocation fails', async () => {
    const { handler, actions } = setup();
    vi.mocked(actions.fetchAllocation).mockRejectedValueOnce(new Error('offline'));

    const outcome = await handler.handle(parsed({ token: 'ChangedIncident', allocationId: 'a1' }));

    expect(actions.refreshAllocations).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ allocationId: 'a1', resolved: true });
  });

  it('reports unresolved when the fallback refresh fails as well', async () => {
    const { handler, actions, logger } = setup();
    vi.mocked(actions.fetchAllocation).mockResolvedValueOnce(false);
    vi.mocked(actions.refreshAllocations).mockRejectedValueOnce(new Error('offline'));

    const outcome = await handler.handle(parsed({ token: 'NewIncident', allocationId: 'a1' }));

    expect(outcome.resolved).toBe(false);
    expect(logger.entries().some((entry) => entry.level === 'error')).toBe(true);
  });

  it('removes a dissolved allocation', async () => {
    const { handler, actions } = setup();

    await handler.handle(
      parsed({ token: 'AllocationDissolved', allocationId: 'a1', incidentId: 'i1' }),
    );

    expect(actions.removeAllocation).toHaveBeenCalledWith({ allocationId: 'a1', incidentId: 'i1' });
  });

  it('reloads the worker for a status message', async () => {
    const { handler, actions } = setup();

    const outcome = await handler.handle(parsed({ token: 'WorkerStatus' }));

    expect(actions.reloadWorker).toHaveBeenCalledTimes(1);
    expect(outcome.resolved).toBe(true);
  });

  it('does not count a failing worker reload against the allocation', async () => {
    const { handler, actions } = setup();
    vi.mocked(actions.reloadWorker).mockRejectedValueOnce(new Error('offline'));

    expect((await handler.handle(parsed({ token: 'WorkerStatus' }))).resolved).toBe(true);
  });

  it('reloads the vehicle releases and then fetches the allocation', async () => {
    const { handler, actions } = setup();

    await handler.handle(parsed({ token: 'VehicleDeliverance', allocationId: 'a1' }));

    expect(actions.reloadVehicleReleases).toHaveBeenCalledTimes(1);
    expect(actions.fetchAllocation).toHaveBeenCalledWith('a1');
  });

  it('carries on with the other effects when one fails', async () => {
    const { handler, actions } = setup();
    vi.mocked(actions.reloadVehicleReleases).mockRejectedValueOnce(new Error('boom'));

    const outcome = await handler.handle(
      parsed({ token: 'VehicleDeliverance', allocationId: 'a1' }),
    );

    expect(actions.fetchAllocation).toHaveBeenCalledWith('a1');
    expect(outcome.resolved).toBe(false);
  });

  it('refreshes everything for an unknown message', async () => {
    const { handler, actions } = setup();

    await handler.handle(parsed({ token: null }));

    expect(actions.refreshAllocations).toHaveBeenCalledTimes(1);
  });

  it('applies standby advice when coordinates are present', async () => {
    const { handler, actions } = setup();
    const advice = { standbyLocationId: 'loc-1', latitude: 52, longitude: 5 };

    const outcome = await handler.handle(
      parsed({ token: 'StandbyLocationAdvice', standbyAdvice: advice }),
    );

    expect(actions.applyStandbyAdvice).toHaveBeenCalledWith(advice);
    expect(actions.expireStandbyAdvice).not.toHaveBeenCalled();
    expect(outcome.resolved).toBe(true);
  });

  it('does nothing for standby advice without coordinates', async () => {
    const { handler, actions } = setup();

    const outcome = await handler.handle(parsed({ token: 'StandbyLocationAdvice' }));

    expect(outcome.resolved).toBe(true);
    expect(actions.applyStandbyAdvice).not.toHaveBeenCalled();
  });

  it('expires standby when an allocation arrives', async () => {
    const { handler, actions } = setup();

    await handler.handle(parsed({ token: 'NewIncident', allocationId: 'a1' }));

    expect(actions.fetchAllocation).toHaveBeenCalledWith('a1');
    expect(actions.expireStandbyAdvice).toHaveBeenCalledTimes(1);
  });
});

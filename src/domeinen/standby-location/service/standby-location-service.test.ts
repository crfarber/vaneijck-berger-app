import { describe, expect, it } from 'vitest';
import { createFakeClock, createInMemoryStore } from '@/test/fakes';
import {
  createStandbyLocationService,
  STANDBY_LOCATION_STORAGE_KEY,
} from './standby-location-service';

const fields = {
  standbyLocationId: 'loc-1',
  latitude: 52.34,
  longitude: 4.95,
  street: 'Diemerkade',
  houseNo: '12',
  city: 'DIEMEN',
};

describe('createStandbyLocationService', () => {
  it('applies active advice and persists it', async () => {
    const store = createInMemoryStore();
    const clock = createFakeClock(1_700_000_000_000);
    const service = createStandbyLocationService({ store, clock });

    service.apply(fields, { hasBlockingItems: false });

    expect(service.getState().status).toBe('active');
    expect(service.getState().pendingAdvice?.receivedAt).toBe(
      new Date(1_700_000_000_000).toISOString(),
    );
    expect(await store.getItem(STANDBY_LOCATION_STORAGE_KEY)).toContain('loc-1');
  });

  it('applies as expired when blocking items exist', () => {
    const service = createStandbyLocationService({
      store: createInMemoryStore(),
      clock: createFakeClock(),
    });

    service.apply(fields, { hasBlockingItems: true });

    expect(service.getState().status).toBe('expired');
    expect(service.getState().pendingAdvice?.standbyLocationId).toBe('loc-1');
  });

  it('expires active advice and hydrates after restart', async () => {
    const store = createInMemoryStore();
    const clock = createFakeClock();
    const first = createStandbyLocationService({ store, clock });
    first.apply(fields, { hasBlockingItems: false });
    first.expire();
    expect(first.getState().status).toBe('expired');

    const second = createStandbyLocationService({ store, clock });
    await second.hydrate();
    expect(second.getState().status).toBe('expired');
    expect(second.getState().pendingAdvice?.latitude).toBe(52.34);
  });

  it('clears memory and storage', async () => {
    const store = createInMemoryStore();
    const service = createStandbyLocationService({ store, clock: createFakeClock() });
    service.apply(fields, { hasBlockingItems: false });

    await service.clear();

    expect(service.getState().pendingAdvice).toBeNull();
    expect(service.getState().status).toBeNull();
    expect(await store.getItem(STANDBY_LOCATION_STORAGE_KEY)).toBeNull();
  });

  it('can become active again after a new apply on expired', () => {
    const service = createStandbyLocationService({
      store: createInMemoryStore(),
      clock: createFakeClock(),
    });
    service.apply(fields, { hasBlockingItems: false });
    service.expire();

    service.apply({ ...fields, standbyLocationId: 'loc-2' }, { hasBlockingItems: false });

    expect(service.getState().status).toBe('active');
    expect(service.getState().pendingAdvice?.standbyLocationId).toBe('loc-2');
  });
});

import { describe, expect, it } from 'vitest';
import { resolvePreviewService, shouldBlockServicesRefresh } from './preview-service';
import type { Service } from './types';

const service = (overrides: Partial<Service> = {}): Service => ({
  statuscode: 1,
  statecode: 0,
  ...overrides,
});

describe('resolvePreviewService', () => {
  it('returns the requested service when it already has an id and hydrated has no better row', () => {
    const requested = service({ dn_serviceid: 'svc-1' });
    expect(resolvePreviewService(requested, [], [requested])).toEqual(requested);
  });

  it('prefers the hydrated row with the same id', () => {
    const requested = service({ dn_serviceid: 'svc-1', dn_vehiclebrand: 'list' });
    const hydrated = service({ dn_serviceid: 'svc-1', dn_vehiclebrand: 'full' });
    expect(resolvePreviewService(requested, [hydrated], [requested])).toEqual(hydrated);
  });

  it('maps an anonymous list row to the hydrated row at the same index', () => {
    const listed = [
      service({ statuscode: 1, dn_concatlicenseplate: 'AB-1' }),
      service({ statuscode: 1, dn_concatlicenseplate: 'CD-2' }),
    ];
    const hydrated = [
      service({ dn_serviceid: 'svc-a', statuscode: 1, dn_concatlicenseplate: 'AB-1' }),
      service({ dn_serviceid: 'svc-b', statuscode: 1, dn_concatlicenseplate: 'CD-2' }),
    ];
    expect(resolvePreviewService(listed[1]!, hydrated, listed)?.dn_serviceid).toBe('svc-b');
  });

  it('falls back to the only hydrated service when the list row has no id', () => {
    const requested = service({ statuscode: 1 });
    const hydrated = [service({ dn_serviceid: 'only', statuscode: 1 })];
    expect(resolvePreviewService(requested, hydrated, [requested])?.dn_serviceid).toBe('only');
  });

  it('returns null when hydrate produced nothing usable', () => {
    const requested = service({ statuscode: 1 });
    expect(resolvePreviewService(requested, [], [requested])).toBeNull();
    expect(resolvePreviewService(requested, [service({ statuscode: 1 })], [requested])).toBeNull();
  });
});

describe('shouldBlockServicesRefresh', () => {
  it('blocks only outside preview and outside a manual pull-to-refresh', () => {
    expect(shouldBlockServicesRefresh(false, false)).toBe(true);
    expect(shouldBlockServicesRefresh(true, false)).toBe(false);
    expect(shouldBlockServicesRefresh(false, true)).toBe(false);
    expect(shouldBlockServicesRefresh(true, true)).toBe(false);
  });
});

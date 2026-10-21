import { describe, expect, it } from 'vitest';
import { SERVICE_STATUS, SERVICE_TYPE } from '@/domeinen/services';
import { resolveProcessingService } from './processing-service';
import type { Allocation, Service, VehicleReleaseLocation } from './types';

const service = (overrides: Partial<Service> & { dn_serviceid: string }): Service => ({
  statuscode: 875920000,
  statecode: 0,
  ...overrides,
});

const allocation = (overrides: Partial<Allocation> = {}): Allocation => ({
  dn_allocationid: 'alloc-1',
  statuscode: 875920000,
  statecode: 0,
  incident: { dn_incidentid: 'inc-1', statuscode: 1 },
  services: [service({ dn_serviceid: 'svc-1', dn_servicetypecode: 1004 })],
  type: 1004,
  ...overrides,
});

describe('resolveProcessingService', () => {
  it('takes the service from fetched services and the incident id from the allocation', () => {
    const fetched = [service({ dn_serviceid: 'svc-1', dn_remarks: 'from fetch' })];
    const resolved = resolveProcessingService({
      allocations: [allocation()],
      fetchedServices: fetched,
      allocationId: 'alloc-1',
      serviceId: 'svc-1',
    });

    expect(resolved).toMatchObject({
      isReleaseItem: false,
      scopeId: 'alloc-1',
      incidentId: 'inc-1',
      service: { dn_serviceid: 'svc-1', dn_remarks: 'from fetch' },
    });
    expect(resolved.allocation?.dn_allocationid).toBe('alloc-1');
    expect(resolved.services).toBe(fetched);
  });

  it('falls back to allocation services when nothing was fetched yet', () => {
    const resolved = resolveProcessingService({
      allocations: [allocation()],
      fetchedServices: undefined,
      allocationId: 'alloc-1',
      serviceId: 'svc-1',
    });

    expect(resolved.service?.dn_serviceid).toBe('svc-1');
    expect(resolved.service?.dn_servicetypecode).toBe(1004);
  });

  it('returns undefined allocation and service when the allocation is missing', () => {
    const resolved = resolveProcessingService({
      allocations: [],
      fetchedServices: undefined,
      allocationId: 'missing',
      serviceId: 'svc-1',
    });

    expect(resolved.allocation).toBeUndefined();
    expect(resolved.service).toBeUndefined();
    expect(resolved.incidentId).toBe('');
    expect(resolved.scopeId).toBe('missing');
  });

  it('returns undefined service when the service id is not on the allocation', () => {
    const resolved = resolveProcessingService({
      allocations: [allocation()],
      fetchedServices: undefined,
      allocationId: 'alloc-1',
      serviceId: 'other',
    });

    expect(resolved.allocation?.dn_allocationid).toBe('alloc-1');
    expect(resolved.service).toBeUndefined();
    expect(resolved.incidentId).toBe('inc-1');
  });

  it('resolves a locatie-afgifte from vehicle releases', () => {
    const vehicleReleases: VehicleReleaseLocation[] = [
      {
        dn_locationId: 'loc-1',
        dn_name: 'Depot',
        releases: [
          {
            dn_serviceid: 'svc-r',
            _dn_locationid_value: 'loc-1',
            _dn_incidentid_value: 'inc-r',
            statuscode: SERVICE_STATUS.OPSLAG,
          },
        ],
      },
    ];
    const resolved = resolveProcessingService({
      allocations: [],
      vehicleReleases,
      fetchedServices: undefined,
      allocationId: '',
      serviceId: 'svc-r',
      locationId: 'loc-1',
    });

    expect(resolved).toMatchObject({
      isReleaseItem: true,
      scopeId: 'release:svc-r',
      incidentId: 'inc-r',
      services: [],
      service: {
        dn_serviceid: 'svc-r',
        dn_servicetypecode: SERVICE_TYPE.AFGIFTE,
        statuscode: SERVICE_STATUS.OPSLAG,
      },
    });
    expect(resolved.allocation).toBeUndefined();
  });

  it('returns undefined service when the release is not on the list', () => {
    const resolved = resolveProcessingService({
      allocations: [],
      vehicleReleases: [],
      fetchedServices: undefined,
      allocationId: '',
      serviceId: 'svc-r',
      locationId: 'loc-1',
    });

    expect(resolved.isReleaseItem).toBe(true);
    expect(resolved.service).toBeUndefined();
    expect(resolved.scopeId).toBe('release:svc-r');
  });
});

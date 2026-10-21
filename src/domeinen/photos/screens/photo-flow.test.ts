import { describe, expect, it } from 'vitest';
import { photoRouteParams } from './photo-flow';

describe('photoRouteParams', () => {
  it('always includes id, serviceId, incidentId and statuscode', () => {
    expect(
      photoRouteParams({
        allocationId: 'alloc-1',
        serviceId: 'svc-1',
        incidentId: 'inc-1',
        serviceStatuscode: 875920000,
      }),
    ).toEqual({
      id: 'alloc-1',
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      statuscode: '875920000',
    });
  });

  it('includes phaseNumbers only when they are non-empty', () => {
    expect(
      photoRouteParams({
        allocationId: 'alloc-1',
        serviceId: 'svc-1',
        incidentId: 'inc-1',
        serviceStatuscode: 0,
        phaseNumbers: [],
      }).phaseNumbers,
    ).toBeUndefined();

    expect(
      photoRouteParams({
        allocationId: 'alloc-1',
        serviceId: 'svc-1',
        incidentId: 'inc-1',
        serviceStatuscode: 0,
        phaseNumbers: [1, 2],
      }).phaseNumbers,
    ).toBe('1,2');
  });

  it('includes locationId only when set', () => {
    expect(
      photoRouteParams({
        allocationId: 'release:svc-1',
        serviceId: 'svc-1',
        incidentId: 'inc-1',
        serviceStatuscode: 875920009,
        locationId: 'loc-1',
      }).locationId,
    ).toBe('loc-1');

    expect(
      photoRouteParams({
        allocationId: 'alloc-1',
        serviceId: 'svc-1',
        incidentId: 'inc-1',
        serviceStatuscode: 0,
        locationId: '',
      }).locationId,
    ).toBeUndefined();
  });
});

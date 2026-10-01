import { describe, expect, it } from 'vitest';
import { getExitTarget, type ExitTargetInput } from './exit-target';
import { SERVICE_TYPE } from './service-types';
import { SERVICE_STATUS } from './status';

const open = (id: string) => ({ dn_serviceid: id, statuscode: SERVICE_STATUS.IN_UITVOERING });
const done = (id: string) => ({
  dn_serviceid: id,
  statuscode: SERVICE_STATUS.HULPVERLENING_AFGEROND,
});

function target(overrides: Partial<ExitTargetInput> = {}) {
  return getExitTarget({
    exitKind: 'terminal',
    allocationId: 'alloc-1',
    serviceId: 'svc-1',
    services: [],
    ...overrides,
  });
}

describe('processingFinish', () => {
  it('opens the closing screen for the service', () => {
    expect(target({ exitKind: 'processingFinish' })).toEqual({
      kind: 'processing-finish',
      allocationId: 'alloc-1',
      serviceId: 'svc-1',
      isPreview: false,
    });
  });

  it('passes the preview flag on', () => {
    expect(target({ exitKind: 'processingFinish', isPreview: true })).toMatchObject({
      isPreview: true,
    });
  });
});

describe('continueIncident', () => {
  it('opens the regular service list', () => {
    expect(target({ exitKind: 'continueIncident', serviceTypeCode: SERVICE_TYPE.BERGING })).toEqual(
      {
        kind: 'incident',
        allocationId: 'alloc-1',
        variant: 'services',
      },
    );
  });

  it('opens the PLTR variant for a PLTR service', () => {
    expect(
      target({ exitKind: 'continueIncident', serviceTypeCode: SERVICE_TYPE.PLANNED_TRANSPORT }),
    ).toMatchObject({ variant: 'pltr' });
  });
});

describe('blocked', () => {
  it('returns to the allocation overview', () => {
    expect(target({ exitKind: 'blocked' })).toEqual({ kind: 'allocation' });
  });
});

describe('terminal', () => {
  it('returns to the overview when no service is open any more', () => {
    expect(target({ services: [done('svc-1'), done('svc-2')] })).toEqual({ kind: 'allocation' });
    expect(target({ services: [] })).toEqual({ kind: 'allocation' });
  });

  it('goes back to the service list when other services are still open', () => {
    expect(target({ services: [open('svc-2')], serviceTypeCode: SERVICE_TYPE.BERGING })).toEqual({
      kind: 'incident',
      allocationId: 'alloc-1',
      variant: 'services',
    });
  });

  it('decides the variant by the service type when no service was excluded', () => {
    expect(
      target({ services: [open('svc-2')], serviceTypeCode: SERVICE_TYPE.PLANNED_TRANSPORT }),
    ).toMatchObject({ variant: 'pltr' });
  });

  describe('with an excluded service', () => {
    it('does not count the excluded service as open work', () => {
      expect(
        target({
          excludeServiceId: 'svc-1',
          hadOtherOpenServicesBeforeExit: true,
          services: [open('svc-1')],
        }),
      ).toEqual({ kind: 'allocation' });
    });

    it('returns to the overview when there was no other open service before', () => {
      expect(
        target({
          excludeServiceId: 'svc-1',
          hadOtherOpenServicesBeforeExit: false,
          services: [open('svc-1'), open('svc-2')],
        }),
      ).toEqual({ kind: 'allocation' });
    });

    it('goes back to the list when another service is open before and after', () => {
      expect(
        target({
          excludeServiceId: 'svc-1',
          hadOtherOpenServicesBeforeExit: true,
          services: [open('svc-1'), open('svc-2')],
          allocationTypeCode: SERVICE_TYPE.BERGING,
        }),
      ).toMatchObject({ kind: 'incident', variant: 'services' });
    });

    it('decides the variant by the allocation type, not by the excluded service', () => {
      expect(
        target({
          excludeServiceId: 'svc-1',
          hadOtherOpenServicesBeforeExit: true,
          services: [open('svc-2')],
          serviceTypeCode: SERVICE_TYPE.BERGING,
          allocationTypeCode: SERVICE_TYPE.PLANNED_TRANSPORT,
        }),
      ).toMatchObject({ variant: 'pltr' });
    });
  });

  it('sends a PLTR service that finished on the closing screen to the overview', () => {
    expect(
      target({
        fromProcessingFinish: true,
        serviceTypeCode: SERVICE_TYPE.PLANNED_TRANSPORT,
        services: [open('svc-2')],
      }),
    ).toEqual({ kind: 'allocation' });
  });

  it('lets other services finished on the closing screen go back to the list', () => {
    expect(
      target({
        fromProcessingFinish: true,
        serviceTypeCode: SERVICE_TYPE.BERGING,
        services: [open('svc-2')],
      }),
    ).toMatchObject({ kind: 'incident' });
  });
});

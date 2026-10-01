import { describe, expect, it } from 'vitest';
import { areAllServicesCompleted, isAllocationFinished } from './finished';
import type { Incident, Service } from './types';

const service = (statuscode: number): Service => ({ statuscode, statecode: 0 });
const incident = (statuscode: number): Incident => ({ dn_incidentid: 'inc-1', statuscode });

describe('areAllServicesCompleted', () => {
  it('is true when every service is finished or has sent its last message', () => {
    expect(areAllServicesCompleted([service(875920005), service(875920003)])).toBe(true);
  });

  it('is false when one service is still open', () => {
    expect(areAllServicesCompleted([service(875920005), service(875920000)])).toBe(false);
  });

  it('is false without services (regression: the old app offered "finish" on fresh allocations)', () => {
    expect(areAllServicesCompleted([])).toBe(false);
    expect(areAllServicesCompleted(null)).toBe(false);
    expect(areAllServicesCompleted(undefined)).toBe(false);
  });
});

describe('isAllocationFinished', () => {
  it('is true after the last departure of the incident', () => {
    expect(
      isAllocationFinished({ incident: incident(875920003), services: [service(875920000)] }),
    ).toBe(true);
  });

  it('is true when all services are done', () => {
    expect(
      isAllocationFinished({ incident: incident(875920001), services: [service(875920005)] }),
    ).toBe(true);
  });

  it('is false for a fresh allocation without loaded services', () => {
    expect(isAllocationFinished({ incident: incident(875920001), services: null })).toBe(false);
  });

  it('is false while a service is open', () => {
    expect(
      isAllocationFinished({ incident: incident(875920001), services: [service(875920000)] }),
    ).toBe(false);
  });
});

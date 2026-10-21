import { describe, expect, it } from 'vitest';
import { SERVICE_STATUS, SERVICE_TYPE } from '@/domeinen/services';
import { findReleaseAssignment, releaseScopeId, toReleaseService } from './release-service';

describe('releaseScopeId', () => {
  it('prefixes the service id for draft and photo scopes', () => {
    expect(releaseScopeId('svc-1')).toBe('release:svc-1');
  });
});

describe('toReleaseService', () => {
  it('forces Afgifte typecode and defaults status to OPSLAG when absent', () => {
    const service = toReleaseService({
      dn_serviceid: 'svc-1',
      _dn_locationid_value: 'loc-1',
      _dn_incidentid_value: 'inc-1',
      dn_concatlicenseplate: 'AB-12-CD',
    });

    expect(service).toMatchObject({
      dn_serviceid: 'svc-1',
      dn_servicetypecode: SERVICE_TYPE.AFGIFTE,
      statuscode: SERVICE_STATUS.OPSLAG,
      statecode: 0,
      _dn_incidentid_value: 'inc-1',
      dn_concatlicenseplate: 'AB-12-CD',
    });
  });

  it('keeps an explicit typecode and status from the assignment', () => {
    const service = toReleaseService({
      dn_serviceid: 'svc-2',
      dn_servicetypecode: SERVICE_TYPE.AFGIFTE,
      statuscode: 875920001,
      statecode: 1,
    });

    expect(service.dn_servicetypecode).toBe(SERVICE_TYPE.AFGIFTE);
    expect(service.statuscode).toBe(875920001);
    expect(service.statecode).toBe(1);
  });
});

describe('findReleaseAssignment', () => {
  it('finds the assignment on the matching location', () => {
    const assignment = findReleaseAssignment(
      [
        {
          dn_locationId: 'loc-a',
          dn_name: 'A',
          releases: [{ dn_serviceid: 'other' }],
        },
        {
          dn_locationId: 'loc-b',
          dn_name: 'B',
          releases: [{ dn_serviceid: 'wanted', dn_vehiclebrand: 'VW' }],
        },
      ],
      'loc-b',
      'wanted',
    );

    expect(assignment).toMatchObject({ dn_serviceid: 'wanted', dn_vehiclebrand: 'VW' });
  });

  it('returns undefined when location or service is missing', () => {
    expect(findReleaseAssignment([], 'loc', 'svc')).toBeUndefined();
    expect(
      findReleaseAssignment(
        [{ dn_locationId: 'loc', dn_name: null, releases: [{ dn_serviceid: 'other' }] }],
        'loc',
        'svc',
      ),
    ).toBeUndefined();
  });
});

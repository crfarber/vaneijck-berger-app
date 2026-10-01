import { describe, expect, it } from 'vitest';
import {
  parseAllocationRows,
  parseColleagueRows,
  parseDeclineReasonRows,
  parseVehicleReleaseLocationRows,
  toAllocation,
  toVehicleReleaseAssignments,
  toVehicleReleaseLocation,
  allocationRowSchema,
  zipCodeCheckSchema,
} from './schemas';

const service = (overrides: Record<string, unknown> = {}) => ({
  dn_serviceid: 'svc-1',
  statuscode: 875920000,
  statecode: 0,
  dn_servicetypecode: 1004,
  dn_concatlicenseplate: 'AB-12-CD',
  dn_unknown_crm_field: 'kept',
  ...overrides,
});

const row = (overrides: Record<string, unknown> = {}) => ({
  dn_allocationid: 'alloc-1',
  statuscode: 875920000,
  statecode: 0,
  dn_IncidentId: {
    dn_incidentid: 'inc-1',
    statuscode: 875920001,
    dn_name: 'A2 Utrecht',
    dn_dn_incident_dn_service_IncidentId: [service()],
  },
  ...overrides,
});

describe('toAllocation', () => {
  it('maps a CRM row to an allocation', () => {
    const allocation = toAllocation(allocationRowSchema.parse(row()));

    expect(allocation).toMatchObject({
      dn_allocationid: 'alloc-1',
      statuscode: 875920000,
      statecode: 0,
      type: 1004,
      incident: { dn_incidentid: 'inc-1', dn_name: 'A2 Utrecht' },
    });
    expect(allocation.services).toHaveLength(1);
  });

  it('takes the type from the first service', () => {
    const parsed = allocationRowSchema.parse(
      row({
        dn_IncidentId: {
          dn_incidentid: 'inc-1',
          statuscode: 1,
          dn_dn_incident_dn_service_IncidentId: [
            service({ dn_servicetypecode: 1012 }),
            service({ dn_serviceid: 'svc-2', dn_servicetypecode: 1004 }),
          ],
        },
      }),
    );

    expect(toAllocation(parsed).type).toBe(1012);
  });

  it('keeps the services in one place only', () => {
    const allocation = toAllocation(allocationRowSchema.parse(row()));
    expect(allocation.incident).not.toHaveProperty('dn_dn_incident_dn_service_IncidentId');
  });

  it('passes unknown CRM fields through', () => {
    const allocation = toAllocation(allocationRowSchema.parse(row()));
    expect(allocation.services?.[0]?.dn_unknown_crm_field).toBe('kept');
  });

  it('keeps the optional fields the card models display', () => {
    const allocation = toAllocation(
      allocationRowSchema.parse(
        row({
          dn_IncidentId: {
            dn_incidentid: 'inc-1',
            statuscode: 1,
            dn_lcmnumber_vhd: 'LCM-10',
            dn_concatlocation: 'Havenweg 12, Rotterdam',
            dn_dn_incident_dn_service_IncidentId: [
              service({
                dn_vehiclebrand: 'DAF',
                dn_registrationownertelephonenumber1: '0612345678',
                '_dn_clientid_value@OData.Community.Display.V1.FormattedValue': 'Van Eijck',
              }),
            ],
          },
        }),
      ),
    );

    expect(allocation.incident.dn_lcmnumber_vhd).toBe('LCM-10');
    expect(allocation.incident.dn_concatlocation).toBe('Havenweg 12, Rotterdam');
    expect(allocation.services?.[0]).toMatchObject({
      dn_vehiclebrand: 'DAF',
      dn_registrationownertelephonenumber1: '0612345678',
      '_dn_clientid_value@OData.Community.Display.V1.FormattedValue': 'Van Eijck',
    });
  });

  it('reports missing services as not loaded, not as empty', () => {
    const missing = row({ dn_IncidentId: { dn_incidentid: 'inc-1', statuscode: 1 } });
    const nulled = row({
      dn_IncidentId: {
        dn_incidentid: 'inc-1',
        statuscode: 1,
        dn_dn_incident_dn_service_IncidentId: null,
      },
    });
    const empty = row({
      dn_IncidentId: {
        dn_incidentid: 'inc-1',
        statuscode: 1,
        dn_dn_incident_dn_service_IncidentId: [],
      },
    });

    expect(toAllocation(allocationRowSchema.parse(missing)).services).toBeNull();
    expect(toAllocation(allocationRowSchema.parse(nulled)).services).toBeNull();
    expect(toAllocation(allocationRowSchema.parse(empty)).services).toEqual([]);
  });

  it('has no type without services', () => {
    const noServices = row({ dn_IncidentId: { dn_incidentid: 'inc-1', statuscode: 1 } });
    expect(toAllocation(allocationRowSchema.parse(noServices)).type).toBeUndefined();
  });

  it('accepts a null type code on the first service', () => {
    const parsed = allocationRowSchema.parse(
      row({
        dn_IncidentId: {
          dn_incidentid: 'inc-1',
          statuscode: 1,
          dn_dn_incident_dn_service_IncidentId: [service({ dn_servicetypecode: null })],
        },
      }),
    );
    expect(toAllocation(parsed).type).toBeUndefined();
  });

  it('keeps an allocation when a nested list-summary service omits statecode', () => {
    const { statecode: _omit, ...withoutStatecode } = service();
    const allocation = toAllocation(
      allocationRowSchema.parse(
        row({
          dn_IncidentId: {
            dn_incidentid: 'inc-1',
            statuscode: 1,
            dn_dn_incident_dn_service_IncidentId: [withoutStatecode],
          },
        }),
      ),
    );

    expect(allocation.dn_allocationid).toBe('alloc-1');
    expect(allocation.services?.[0]?.statecode).toBe(0);
    expect(allocation.type).toBe(1004);
  });

  it('keeps the allocation when one nested service is unusable, dropping only that service', () => {
    const allocation = toAllocation(
      allocationRowSchema.parse(
        row({
          dn_IncidentId: {
            dn_incidentid: 'inc-1',
            statuscode: 1,
            dn_dn_incident_dn_service_IncidentId: [
              { not: 'a service' },
              service({ dn_servicetypecode: 1012 }),
            ],
          },
        }),
      ),
    );

    expect(allocation.services).toHaveLength(1);
    expect(allocation.type).toBe(1012);
  });
});

describe('parseAllocationRows', () => {
  it('parses every valid row', () => {
    const { allocations, rejected } = parseAllocationRows([
      row(),
      row({ dn_allocationid: 'alloc-2' }),
    ]);

    expect(allocations.map((entry) => entry.dn_allocationid)).toEqual(['alloc-1', 'alloc-2']);
    expect(rejected).toEqual([]);
  });

  it('does not reject a row whose nested service omitted statecode', () => {
    const { statecode: _omit, ...withoutStatecode } = service();
    const { allocations, rejected } = parseAllocationRows([
      row({
        dn_IncidentId: {
          dn_incidentid: 'inc-1',
          statuscode: 1,
          dn_name: 'A2',
          dn_dn_incident_dn_service_IncidentId: [withoutStatecode],
        },
      }),
    ]);

    expect(rejected).toEqual([]);
    expect(allocations).toHaveLength(1);
    expect(allocations[0]?.type).toBe(1004);
  });

  it('skips a broken row and reports why, without losing the others', () => {
    const { allocations, rejected } = parseAllocationRows([
      row(),
      { dn_allocationid: 'alloc-bad', statuscode: 'not a number', statecode: 0 },
      row({ dn_allocationid: 'alloc-3' }),
    ]);

    expect(allocations.map((entry) => entry.dn_allocationid)).toEqual(['alloc-1', 'alloc-3']);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.index).toBe(1);
    expect(rejected[0]?.issues.join(' ')).toContain('statuscode');
  });

  it('rejects rows that are not objects', () => {
    const { allocations, rejected } = parseAllocationRows([null, 'text', 5]);
    expect(allocations).toEqual([]);
    expect(rejected.map((entry) => entry.index)).toEqual([0, 1, 2]);
  });

  it('rejects a row without an incident', () => {
    const { rejected } = parseAllocationRows([
      { dn_allocationid: 'a', statuscode: 1, statecode: 0 },
    ]);
    expect(rejected[0]?.issues.join(' ')).toContain('dn_IncidentId');
  });

  it('returns nothing for no rows', () => {
    expect(parseAllocationRows([])).toEqual({ allocations: [], rejected: [] });
  });
});

describe('parseDeclineReasonRows', () => {
  it('maps the PascalCase reference-data shape to value/text', () => {
    const { reasons, rejected } = parseDeclineReasonRows([
      { Value: 875920006, Text: 'Medewerker niet beschikbaar' },
    ]);
    expect(reasons).toEqual([{ value: 875920006, text: 'Medewerker niet beschikbaar' }]);
    expect(rejected).toEqual([]);
  });

  it('rejects a row missing Value or Text without losing the others', () => {
    const { reasons, rejected } = parseDeclineReasonRows([
      { Value: 1, Text: 'ok' },
      { Text: 'no value' },
    ]);
    expect(reasons).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.index).toBe(1);
  });
});

describe('parseVehicleReleaseLocationRows', () => {
  it('parses a valid location', () => {
    const { locations, rejected } = parseVehicleReleaseLocationRows([
      { dn_locationId: 'loc-1', dn_name: 'Utrecht' },
    ]);
    expect(locations).toEqual([{ dn_locationId: 'loc-1', dn_name: 'Utrecht' }]);
    expect(rejected).toEqual([]);
  });

  it('rejects a location without an id: it cannot be matched to its assignments', () => {
    const { locations, rejected } = parseVehicleReleaseLocationRows([{ dn_name: 'no id' }]);
    expect(locations).toEqual([]);
    expect(rejected).toHaveLength(1);
  });
});

describe('toVehicleReleaseAssignments', () => {
  it('keeps every field the app displays, and unknown ones alongside them', () => {
    const [assignment] = toVehicleReleaseAssignments([
      {
        dn_serviceid: 'svc-1',
        dn_vehiclebrand: 'DAF',
        dn_vehicletradename: 'XF',
        dn_concatlicenseplate: '82-LTF-P',
        dn_vwe_vehicleinformationid: { vwe_rdw_kleur1: 'Grijs' },
      },
    ]);
    expect(assignment?.dn_vehiclebrand).toBe('DAF');
    expect(assignment?.dn_vwe_vehicleinformationid?.vwe_rdw_kleur1).toBe('Grijs');
  });

  it('accepts a bare object: nothing is required', () => {
    expect(toVehicleReleaseAssignments([{}])).toEqual([{}]);
  });
});

describe('toVehicleReleaseLocation', () => {
  it('combines a location with its assignments', () => {
    const location = toVehicleReleaseLocation({ dn_locationId: 'loc-1', dn_name: 'Utrecht' }, [
      { dn_serviceid: 'svc-1' },
    ]);
    expect(location).toEqual({
      dn_locationId: 'loc-1',
      dn_name: 'Utrecht',
      releases: [{ dn_serviceid: 'svc-1' }],
    });
  });
});

describe('parseColleagueRows', () => {
  it('maps a dn_collegues row to a colleague, using the worker id as the row id', () => {
    const { colleagues, rejected } = parseColleagueRows([
      {
        '@odata.etag': 'W/"1"',
        dn_workerid: 'w1',
        dn_name: 'Jan de Vries',
        modifiedon: '2026-09-01T00:00:00Z',
      },
    ]);
    expect(colleagues).toEqual([{ id: 'w1', workerId: 'w1', name: 'Jan de Vries' }]);
    expect(rejected).toEqual([]);
  });

  it('rejects a row missing a name without losing the others', () => {
    const { colleagues, rejected } = parseColleagueRows([
      { dn_workerid: 'w1', dn_name: 'ok' },
      { dn_workerid: 'w2' },
    ]);
    expect(colleagues).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.index).toBe(1);
  });
});

describe('zipCodeCheckSchema', () => {
  it('accepts the plain formatted-address string the endpoint answers with', () => {
    expect(zipCodeCheckSchema.parse('Dorpsstraat 1, 1234 AB Voorbeeld')).toBe(
      'Dorpsstraat 1, 1234 AB Voorbeeld',
    );
  });
});

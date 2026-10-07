import { describe, expect, it } from 'vitest';
import { parseFleetRows, parseHomebaseLocationRows } from './schemas';

describe('parseFleetRows', () => {
  it('parses valid rows', () => {
    const { vehicles, rejected } = parseFleetRows([
      { dn_fleetid: 'a', dn_name: 'VE-01', dn_vehiclenumber: '82-LTF-P', dn_vehicletypecode: 1001 },
    ]);

    expect(vehicles).toEqual([
      { id: 'a', name: 'VE-01', vehicleNumber: '82-LTF-P', typeCode: 1001 },
    ]);
    expect(rejected).toEqual([]);
  });

  it('treats a missing vehicle number as null, not a rejection', () => {
    const { vehicles, rejected } = parseFleetRows([
      { dn_fleetid: 'a', dn_name: 'VE-A1', dn_vehicletypecode: 1002 },
    ]);

    expect(vehicles).toEqual([{ id: 'a', name: 'VE-A1', vehicleNumber: null, typeCode: 1002 }]);
    expect(rejected).toEqual([]);
  });

  it('rejects one bad row without losing the others', () => {
    const { vehicles, rejected } = parseFleetRows([
      { dn_fleetid: 'a', dn_name: 'VE-01', dn_vehicletypecode: 1001 },
      { dn_name: 'no id' },
    ]);

    expect(vehicles).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.index).toBe(1);
    expect(rejected[0]?.issues.join(' ')).toContain('dn_fleetid');
  });

  it('rejects rows that are not objects at all', () => {
    const { vehicles, rejected } = parseFleetRows([null, 'text', 5]);

    expect(vehicles).toEqual([]);
    expect(rejected.map((entry) => entry.index)).toEqual([0, 1, 2]);
  });

  it('returns empty results for an empty list', () => {
    expect(parseFleetRows([])).toEqual({ vehicles: [], rejected: [] });
  });
});

describe('parseHomebaseLocationRows', () => {
  it('parses a full row and swaps a CRM coordinate stored the wrong way round', () => {
    const { locations, rejected } = parseHomebaseLocationRows([
      {
        dn_companylocationid: 'loc-1',
        dn_name: 'Van Eijck Utrecht',
        dn_street: 'Stationsplein',
        dn_housenumber: 1,
        dn_housenumberaddition: 'A',
        dn_postalcode: '3511 ED',
        dn_city: 'Utrecht',
        dn_latitude: 5.11,
        dn_longitude: 52.09,
        dn_other: 'ignored',
      },
    ]);

    expect(locations).toEqual([
      {
        id: 'loc-1',
        name: 'Van Eijck Utrecht',
        street: 'Stationsplein',
        houseNumber: '1',
        houseNumberAddition: 'A',
        postalCode: '3511 ED',
        city: 'Utrecht',
        coordinate: { latitude: 52.09, longitude: 5.11 },
      },
    ]);
    expect(rejected).toEqual([]);
  });

  it('treats missing address and coordinate fields as null', () => {
    const { locations } = parseHomebaseLocationRows([
      { dn_companylocationid: 'loc-2', dn_name: 'Breda', dn_city: null },
    ]);

    expect(locations).toEqual([
      {
        id: 'loc-2',
        name: 'Breda',
        street: null,
        houseNumber: null,
        houseNumberAddition: null,
        postalCode: null,
        city: null,
        coordinate: null,
      },
    ]);
  });

  it('rejects rows without an id or name and keeps the others', () => {
    const { locations, rejected } = parseHomebaseLocationRows([
      { dn_companylocationid: 'loc-1', dn_name: 'Utrecht' },
      { dn_name: 'no id' },
      { dn_companylocationid: 'loc-3' },
    ]);

    expect(locations.map((location) => location.id)).toEqual(['loc-1']);
    expect(rejected.map((entry) => entry.index)).toEqual([1, 2]);
    expect(rejected[0]?.issues.join(' ')).toContain('dn_companylocationid');
  });
});

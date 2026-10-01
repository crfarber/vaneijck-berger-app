import { describe, expect, it } from 'vitest';
import { toCurrentUnitOverview } from './current-unit-overview';

const fleet = [
  { id: 'truck-1', name: 'Truck 12', vehicleNumber: 'BX-LZ-42', typeCode: 1001 },
  { id: 'trailer-1', name: 'Aanhanger 8', vehicleNumber: 'OL-12-RT', typeCode: 1002 },
];

describe('toCurrentUnitOverview', () => {
  it('shows an external registration number without fleet data', () => {
    expect(
      toCurrentUnitOverview(
        {
          alternateVehicleRegistrationNumber: 'ab-12-cd',
          validUntil: '2026-09-24T18:30:00.000Z',
        },
        [],
      ),
    ).toEqual({
      vehicleName: 'AB-12-CD',
      vehicleNumber: null,
      trailerName: null,
      trailerNumber: null,
      validUntil: '2026-09-24T18:30:00.000Z',
      restrictions: [],
    });
  });

  it('resolves an internal vehicle and trailer and lists active restrictions', () => {
    expect(
      toCurrentUnitOverview(
        {
          vehicleId: 'truck-1',
          trailerId: 'trailer-1',
          validUntil: '2026-09-24T20:00:00.000Z',
          notAvailableForIM: true,
          onlyAvailableForBreakdown: true,
        },
        fleet,
      ),
    ).toEqual({
      vehicleName: 'Truck 12',
      vehicleNumber: 'BX-LZ-42',
      trailerName: 'Aanhanger 8',
      trailerNumber: 'OL-12-RT',
      validUntil: '2026-09-24T20:00:00.000Z',
      restrictions: ['notAvailableForIM', 'onlyAvailableForBreakdown'],
    });
  });
});

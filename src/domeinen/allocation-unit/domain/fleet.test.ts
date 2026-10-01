import { describe, expect, it } from 'vitest';
import {
  filterFleetByType,
  searchFleet,
  VEHICLE_TYPE_CODE_TRAILER,
  VEHICLE_TYPE_CODE_TRUCK,
  type FleetVehicle,
} from './fleet';

const truck: FleetVehicle = {
  id: 'truck-1',
  name: 'VE-01',
  vehicleNumber: '82-LTF-P',
  typeCode: VEHICLE_TYPE_CODE_TRUCK,
};
const trailer: FleetVehicle = {
  id: 'trailer-1',
  name: 'VE-A1',
  vehicleNumber: null,
  typeCode: VEHICLE_TYPE_CODE_TRAILER,
};
const fleet = [truck, trailer];

describe('filterFleetByType', () => {
  it('keeps only trucks', () => {
    expect(filterFleetByType(fleet, VEHICLE_TYPE_CODE_TRUCK)).toEqual([truck]);
  });

  it('keeps only trailers', () => {
    expect(filterFleetByType(fleet, VEHICLE_TYPE_CODE_TRAILER)).toEqual([trailer]);
  });

  it('returns nothing for an unknown type code', () => {
    expect(filterFleetByType(fleet, 9999)).toEqual([]);
  });
});

describe('searchFleet', () => {
  it('returns everything for an empty query', () => {
    expect(searchFleet(fleet, '')).toEqual(fleet);
    expect(searchFleet(fleet, '   ')).toEqual(fleet);
  });

  it('matches the name case-insensitively', () => {
    expect(searchFleet(fleet, 've-01')).toEqual([truck]);
  });

  it('matches the vehicle number case-insensitively', () => {
    expect(searchFleet(fleet, '82-ltf-p')).toEqual([truck]);
  });

  it('does not crash on a vehicle without a vehicle number', () => {
    expect(searchFleet(fleet, 've-a1')).toEqual([trailer]);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchFleet(fleet, 'zz-99-zz')).toEqual([]);
  });
});

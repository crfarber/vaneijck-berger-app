import { describe, expect, it } from 'vitest';
import { findTruckByQrCode } from './qr-truck';

const trucks = [
  { id: 'truck-1', name: '12-VEX-3', vehicleNumber: 'VE-12', typeCode: 1001 },
  { id: 'truck-2', name: 'TRUCK 2', vehicleNumber: '82-LTF-P', typeCode: 1001 },
];

describe('findTruckByQrCode', () => {
  it('finds a truck by its QR licence plate regardless of casing and separators', () => {
    expect(findTruckByQrCode(trucks, '12 vex 3')).toEqual(trucks[0]);
  });

  it('also matches the fleet vehicle number', () => {
    expect(findTruckByQrCode(trucks, '82ltfp')).toEqual(trucks[1]);
  });

  it('does not select a truck for an unknown or blank QR value', () => {
    expect(findTruckByQrCode(trucks, 'ZZ-99-ZZ')).toBeNull();
    expect(findTruckByQrCode(trucks, '   ')).toBeNull();
  });
});

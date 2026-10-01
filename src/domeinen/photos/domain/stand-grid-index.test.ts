import { describe, expect, it } from 'vitest';
import { isOnVehicleSubject, standGridIndex } from './stand-grid-index';

describe('standGridIndex', () => {
  it('maps exterior angles around the car, leaving the center for the vehicle', () => {
    expect(standGridIndex({ category: 'EXTERIOR', angle: 'links-voor' })).toBe(0);
    expect(standGridIndex({ category: 'EXTERIOR', angle: 'voor' })).toBe(1);
    expect(standGridIndex({ category: 'EXTERIOR', angle: 'rechts-voor' })).toBe(2);
    expect(standGridIndex({ category: 'EXTERIOR', angle: 'links' })).toBe(3);
    expect(standGridIndex({ category: 'EXTERIOR', angle: 'rechts' })).toBe(5);
    expect(standGridIndex({ category: 'EXTERIOR', angle: 'links-achter' })).toBe(6);
    expect(standGridIndex({ category: 'EXTERIOR', angle: 'achter' })).toBe(7);
    expect(standGridIndex({ category: 'EXTERIOR', angle: 'rechts-achter' })).toBe(8);
  });

  it('maps tyre slots to the four corners', () => {
    expect(standGridIndex({ category: 'TYRES', tyre: 'links-voor' })).toBe(0);
    expect(standGridIndex({ category: 'TYRES', tyre: 'rechts-achter' })).toBe(8);
  });

  it('maps on-vehicle subjects to the center cell', () => {
    expect(standGridIndex({ category: 'OVERVIEW' })).toBe(4);
    expect(standGridIndex({ category: 'ROOF' })).toBe(4);
    expect(standGridIndex({ category: 'INTERIOR' })).toBe(4);
    expect(standGridIndex({ category: 'DASHBOARD' })).toBe(4);
  });

  it('maps engine to the front and trailer/cargo to the rear', () => {
    expect(standGridIndex({ category: 'ENGINE' })).toBe(1);
    expect(standGridIndex({ category: 'TRAILER' })).toBe(7);
    expect(standGridIndex({ category: 'CARGO' })).toBe(7);
  });
});

describe('isOnVehicleSubject', () => {
  it('is true only when the highlight is the vehicle center', () => {
    expect(isOnVehicleSubject({ category: 'ROOF' })).toBe(true);
    expect(isOnVehicleSubject({ category: 'INTERIOR' })).toBe(true);
    expect(isOnVehicleSubject({ category: 'ENGINE' })).toBe(false);
    expect(isOnVehicleSubject({ category: 'EXTERIOR', angle: 'links-voor' })).toBe(false);
  });
});

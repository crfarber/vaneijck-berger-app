import { describe, expect, it } from 'vitest';
import { SERVICE_TYPE } from '@/domeinen/services';
import {
  ALLOCATION_MAP_MARKER_KIND,
  allocationMapCoordinate,
  cameraForFocusedAllocation,
  markerSequenceLabel,
  toAllocationMapMarkers,
} from './map-markers';
import type { Allocation } from './types';

function allocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    dn_allocationid: 'alloc-1',
    statuscode: 1,
    statecode: 0,
    type: 1004,
    incident: {
      dn_incidentid: 'incident-1',
      statuscode: 1,
      dn_name: 'A2 Utrecht',
      dn_lcmnumber_vhd: '12345',
      dn_latitude: 52.09,
      dn_longtitude: 5.12,
    },
    services: null,
    ...overrides,
  };
}

describe('toAllocationMapMarkers', () => {
  it('builds a standard marker from a usable incident coordinate', () => {
    expect(toAllocationMapMarkers([allocation()])).toEqual([
      {
        id: 'alloc-1',
        allocationId: 'alloc-1',
        coordinate: { latitude: 52.09, longitude: 5.12 },
        title: 'A2 Utrecht',
        kind: ALLOCATION_MAP_MARKER_KIND.STANDARD,
        sequence: 1,
      },
    ]);
  });

  it('marks planned transport allocations as PLTR so the map can use a purple pin', () => {
    expect(
      toAllocationMapMarkers([
        allocation({ type: SERVICE_TYPE.PLANNED_TRANSPORT }),
        allocation({
          dn_allocationid: 'third-party',
          type: SERVICE_TYPE.PLANNED_TRANSPORT_THIRD_PARTY,
        }),
      ]),
    ).toEqual([
      expect.objectContaining({
        id: 'alloc-1',
        kind: ALLOCATION_MAP_MARKER_KIND.PLTR,
        sequence: 1,
      }),
      expect.objectContaining({
        id: 'third-party',
        kind: ALLOCATION_MAP_MARKER_KIND.PLTR,
        sequence: 2,
      }),
    ]);
  });

  it('numbers markers in input order and skips rows without coordinates', () => {
    expect(
      toAllocationMapMarkers([
        allocation({
          dn_allocationid: 'no-coords',
          incident: { dn_incidentid: 'i1', statuscode: 1, dn_name: 'A' },
        }),
        allocation({ dn_allocationid: 'first' }),
        allocation({
          dn_allocationid: 'second',
          incident: {
            dn_incidentid: 'i2',
            statuscode: 1,
            dn_name: 'A12',
            dn_latitude: 52.2,
            dn_longtitude: 5.3,
          },
        }),
      ]),
    ).toEqual([
      expect.objectContaining({ id: 'first', sequence: 1 }),
      expect.objectContaining({ id: 'second', sequence: 2 }),
    ]);
  });

  it('falls back to the LCM reference when the incident name is blank', () => {
    expect(
      toAllocationMapMarkers([
        allocation({
          incident: {
            dn_incidentid: 'incident-1',
            statuscode: 1,
            dn_name: '  ',
            dn_lcmnumber_vhd: '12345',
            dn_latitude: 52.09,
            dn_longtitude: 5.12,
          },
        }),
      ]),
    ).toEqual([expect.objectContaining({ title: '12345' })]);
  });

  it('falls back to the allocation id when name and reference are missing', () => {
    expect(
      toAllocationMapMarkers([
        allocation({
          incident: {
            dn_incidentid: 'incident-1',
            statuscode: 1,
            dn_latitude: 52.09,
            dn_longtitude: 5.12,
          },
        }),
      ]),
    ).toEqual([expect.objectContaining({ title: 'alloc-1' })]);
  });

  it('skips allocations without coordinates, with (0, 0), or with out-of-range values', () => {
    expect(
      toAllocationMapMarkers([
        allocation({
          dn_allocationid: 'no-coords',
          incident: { dn_incidentid: 'i1', statuscode: 1, dn_name: 'A' },
        }),
        allocation({
          dn_allocationid: 'zero',
          incident: {
            dn_incidentid: 'i2',
            statuscode: 1,
            dn_name: 'B',
            dn_latitude: 0,
            dn_longtitude: 0,
          },
        }),
        allocation({
          dn_allocationid: 'invalid',
          incident: {
            dn_incidentid: 'i3',
            statuscode: 1,
            dn_name: 'C',
            dn_latitude: 99,
            dn_longtitude: 5,
          },
        }),
        allocation({ dn_allocationid: 'ok' }),
      ]),
    ).toEqual([
      {
        id: 'ok',
        allocationId: 'ok',
        coordinate: { latitude: 52.09, longitude: 5.12 },
        title: 'A2 Utrecht',
        kind: ALLOCATION_MAP_MARKER_KIND.STANDARD,
        sequence: 1,
      },
    ]);
  });
});

describe('allocationMapCoordinate', () => {
  it('returns the incident coordinate when it is usable', () => {
    expect(allocationMapCoordinate(allocation())).toEqual({ latitude: 52.09, longitude: 5.12 });
  });

  it('returns null when the incident has no usable coordinate', () => {
    expect(
      allocationMapCoordinate(
        allocation({
          incident: {
            dn_incidentid: 'i1',
            statuscode: 1,
            dn_latitude: 0,
            dn_longtitude: 0,
          },
        }),
      ),
    ).toBeNull();
  });
});

describe('cameraForFocusedAllocation', () => {
  const markers = toAllocationMapMarkers([
    allocation({ dn_allocationid: 'first' }),
    allocation({
      dn_allocationid: 'second',
      incident: {
        dn_incidentid: 'i2',
        statuscode: 1,
        dn_latitude: 52.2,
        dn_longtitude: 5.3,
      },
    }),
  ]);

  it('zooms in on the marker of the requested allocation', () => {
    expect(cameraForFocusedAllocation(markers, 'second')).toEqual({
      coordinates: { latitude: 52.2, longitude: 5.3 },
      zoom: 16,
    });
  });

  it('returns null without a focus id so the map frames all markers', () => {
    expect(cameraForFocusedAllocation(markers, undefined)).toBeNull();
    expect(cameraForFocusedAllocation(markers, '')).toBeNull();
  });

  it('returns null when the allocation has no marker (gone or without coordinates)', () => {
    expect(cameraForFocusedAllocation(markers, 'unknown')).toBeNull();
  });
});

describe('markerSequenceLabel', () => {
  it('shows 1–99 as decimal text for Apple Maps monograms', () => {
    expect(markerSequenceLabel(1)).toBe('1');
    expect(markerSequenceLabel(12)).toBe('12');
    expect(markerSequenceLabel(99)).toBe('99');
    expect(markerSequenceLabel(100)).toBe('99');
  });
});

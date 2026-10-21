import {
  cameraForFocus,
  toCoordinate,
  type Coordinate,
  type MapCameraPosition,
} from '@/domeinen/location';
import { isPltrType } from '@/domeinen/services';
import type { Allocation } from './types';

export const ALLOCATION_MAP_MARKER_KIND = {
  PLTR: 'pltr',
  STANDARD: 'standard',
} as const;

export type AllocationMapMarkerKind =
  (typeof ALLOCATION_MAP_MARKER_KIND)[keyof typeof ALLOCATION_MAP_MARKER_KIND];

export type AllocationMapMarker = {
  readonly id: string;
  readonly allocationId: string;
  readonly coordinate: Coordinate;
  readonly title: string;
  readonly kind: AllocationMapMarkerKind;
  /** 1-based order on the map (same order as the caller passes allocations). */
  readonly sequence: number;
};

function markerTitle(allocation: Allocation): string {
  const name = allocation.incident.dn_name?.trim();
  if (name !== undefined && name !== '') {
    return name;
  }
  const reference = allocation.incident.dn_lcmnumber_vhd?.trim();
  if (reference !== undefined && reference !== '') {
    return reference;
  }
  return allocation.dn_allocationid;
}

/** Incident coordinate used for the map pin, or `null` when the allocation gets no pin. */
export function allocationMapCoordinate(allocation: Allocation): Coordinate | null {
  return toCoordinate(allocation.incident.dn_latitude, allocation.incident.dn_longtitude);
}

/**
 * Starting camera when the map opens for one allocation ("show on map" from the list). `null`
 * when there is no focus or the allocation has no pin; the map then frames all markers.
 */
export function cameraForFocusedAllocation(
  markers: readonly AllocationMapMarker[],
  allocationId: string | undefined,
): MapCameraPosition | null {
  if (allocationId === undefined || allocationId === '') {
    return null;
  }
  const marker = markers.find((entry) => entry.allocationId === allocationId);
  return marker === undefined ? null : cameraForFocus(marker.coordinate);
}

/**
 * One map pin per allocation that has a usable incident coordinate. Invalid, missing and (0, 0)
 * pairs are dropped via `toCoordinate`. Load/delivery service coordinates are out of scope.
 * PLTR allocations get `kind: 'pltr'` so the map can use a purple pin.
 * `sequence` counts only markers that are kept (1, 2, 3, …) in input order.
 */
export function toAllocationMapMarkers(
  allocations: readonly Allocation[],
): readonly AllocationMapMarker[] {
  const markers: AllocationMapMarker[] = [];
  for (const allocation of allocations) {
    const coordinate = allocationMapCoordinate(allocation);
    if (coordinate === null) {
      continue;
    }
    markers.push({
      id: allocation.dn_allocationid,
      allocationId: allocation.dn_allocationid,
      coordinate,
      title: markerTitle(allocation),
      kind: isPltrType(allocation.type)
        ? ALLOCATION_MAP_MARKER_KIND.PLTR
        : ALLOCATION_MAP_MARKER_KIND.STANDARD,
      sequence: markers.length + 1,
    });
  }
  return markers;
}

/** Apple Maps monogram is 1–2 characters; bergers rarely have 100+ pins. */
export function markerSequenceLabel(sequence: number): string {
  if (sequence < 1) {
    return '1';
  }
  if (sequence > 99) {
    return '99';
  }
  return String(sequence);
}

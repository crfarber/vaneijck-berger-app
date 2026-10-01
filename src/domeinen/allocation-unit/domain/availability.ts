/**
 * Restrictions a berger sets on their own unit: what it will *not* do, not what it does. All
 * false means fully available. Names match the API fields exactly (`AllocationUnitUpdateInfo`).
 */
export type UnitAvailability = {
  notAvailableForIM: boolean;
  onlyAvailableForTransport: boolean;
  onlyAvailableForBreakdown: boolean;
  notAvailableForAllocation: boolean;
};

export const DEFAULT_AVAILABILITY: UnitAvailability = {
  notAvailableForIM: false,
  onlyAvailableForTransport: false,
  onlyAvailableForBreakdown: false,
  notAvailableForAllocation: false,
};

export const AVAILABILITY_OPTIONS = Object.keys(
  DEFAULT_AVAILABILITY,
) as readonly (keyof UnitAvailability)[];

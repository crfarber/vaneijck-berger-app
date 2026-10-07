export const allocationKeys = {
  all: ['allocations'] as const,
  list: () => [...allocationKeys.all, 'list'] as const,
};

export const allocationQueryStaleTime = 5 * 60_000;

export const vehicleReleaseKeys = {
  all: ['vehicle-releases'] as const,
  list: () => [...vehicleReleaseKeys.all, 'list'] as const,
};

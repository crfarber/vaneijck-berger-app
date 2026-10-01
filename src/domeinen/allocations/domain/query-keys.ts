export const allocationKeys = {
  all: ['allocations'] as const,
  list: () => [...allocationKeys.all, 'list'] as const,
};

export const vehicleReleaseKeys = {
  all: ['vehicle-releases'] as const,
  list: () => [...vehicleReleaseKeys.all, 'list'] as const,
};

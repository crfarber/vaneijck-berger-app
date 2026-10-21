export type ServiceFormLoadState =
  'loading' | 'not-found' | 'missing-definition' | 'failed' | 'ready';

export function resolveServiceFormLoadState(input: {
  allocationsPending: boolean;
  allocationFound: boolean;
  servicesPending: boolean;
  serviceFound: boolean;
  definitionStatus: 'loading' | 'ready' | 'missing' | 'failed';
  draftPending: boolean;
  /** Locatie-afgifte: no allocation; service comes from vehicle_releases. */
  isReleaseItem?: boolean;
}): ServiceFormLoadState {
  const needsAllocation = input.isReleaseItem !== true;
  if (
    input.allocationsPending ||
    (needsAllocation && input.allocationFound && input.servicesPending)
  ) {
    return 'loading';
  }
  if ((needsAllocation && !input.allocationFound) || !input.serviceFound) {
    return 'not-found';
  }
  if (input.definitionStatus === 'loading' || input.draftPending) {
    return 'loading';
  }
  if (input.definitionStatus === 'missing') {
    return 'missing-definition';
  }
  if (input.definitionStatus === 'failed') {
    return 'failed';
  }
  return 'ready';
}

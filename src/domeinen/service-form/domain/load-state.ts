export type ServiceFormLoadState =
  'loading' | 'not-found' | 'missing-definition' | 'failed' | 'ready';

export function resolveServiceFormLoadState(input: {
  allocationsPending: boolean;
  allocationFound: boolean;
  servicesPending: boolean;
  serviceFound: boolean;
  definitionStatus: 'loading' | 'ready' | 'missing' | 'failed';
  draftPending: boolean;
}): ServiceFormLoadState {
  if (input.allocationsPending || (input.allocationFound && input.servicesPending)) {
    return 'loading';
  }
  if (!input.allocationFound || !input.serviceFound) {
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

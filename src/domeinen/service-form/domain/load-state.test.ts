import { describe, expect, it } from 'vitest';
import { resolveServiceFormLoadState } from './load-state';

describe('resolveServiceFormLoadState', () => {
  it('keeps loading while allocation or service data is pending', () => {
    expect(
      resolveServiceFormLoadState({
        allocationsPending: true,
        allocationFound: false,
        servicesPending: false,
        serviceFound: false,
        definitionStatus: 'missing',
        draftPending: false,
      }),
    ).toBe('loading');
  });

  it('does not keep loading when the allocation or service is absent from completed data', () => {
    expect(
      resolveServiceFormLoadState({
        allocationsPending: false,
        allocationFound: false,
        servicesPending: false,
        serviceFound: false,
        definitionStatus: 'missing',
        draftPending: false,
      }),
    ).toBe('not-found');

    expect(
      resolveServiceFormLoadState({
        allocationsPending: false,
        allocationFound: true,
        servicesPending: false,
        serviceFound: false,
        definitionStatus: 'missing',
        draftPending: false,
      }),
    ).toBe('not-found');
  });

  it('distinguishes a missing definition from a failed definition read', () => {
    const input = {
      allocationsPending: false,
      allocationFound: true,
      servicesPending: false,
      serviceFound: true,
      draftPending: false,
    } as const;

    expect(resolveServiceFormLoadState({ ...input, definitionStatus: 'missing' })).toBe(
      'missing-definition',
    );
    expect(resolveServiceFormLoadState({ ...input, definitionStatus: 'failed' })).toBe('failed');
  });

  it('is ready only after the definition and draft are ready', () => {
    const input = {
      allocationsPending: false,
      allocationFound: true,
      servicesPending: false,
      serviceFound: true,
      definitionStatus: 'ready' as const,
    };

    expect(resolveServiceFormLoadState({ ...input, draftPending: true })).toBe('loading');
    expect(resolveServiceFormLoadState({ ...input, draftPending: false })).toBe('ready');
  });
});

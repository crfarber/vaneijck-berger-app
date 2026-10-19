import { describe, expect, it } from 'vitest';
import { createFakeClock, createInMemoryStore } from '@/test/fakes';
import {
  createServiceFormDraft,
  createServiceFormDraftStore,
  hasServiceFormDraftProgress,
  parseServiceFormDraft,
  SERVICE_FORM_DRAFTS_KEY,
} from './draft-storage';

describe('createServiceFormDraft', () => {
  it('keeps all user-controlled form state for automatic saving', () => {
    expect(
      createServiceFormDraft({
        answers: draft.answers,
        hideSignature: { signature: true },
        noEmailConfirmation: { signature: true },
        acceptedTermsAndConditions: false,
        recommendedFieldId: 'field-2',
        expandedSections: { 'section-1': true },
      }),
    ).toEqual({
      answers: draft.answers,
      hideSignature: { signature: true },
      noEmailConfirmation: { signature: true },
      acceptedTermsAndConditions: false,
      recommendedFieldId: 'field-2',
      expandedSections: { 'section-1': true },
    });
  });
});

const draft = {
  answers: { dn_name: { value: 'A', displayValue: 'A' } },
  hideSignature: {},
  noEmailConfirmation: {},
  acceptedTermsAndConditions: true,
  recommendedFieldId: 'field-2',
  expandedSections: { 'section-1': true as const },
};

describe('createServiceFormDraftStore', () => {
  it('round-trips a saved draft under one shared key', async () => {
    const kv = createInMemoryStore();
    const clock = createFakeClock(1_000);
    const store = createServiceFormDraftStore(kv, clock);

    await store.save('alloc-1', 'svc-1', draft);
    const loaded = await store.load('alloc-1', 'svc-1');

    expect(loaded).toMatchObject({
      answers: draft.answers,
      recommendedFieldId: 'field-2',
      timestamp: 1_000,
    });
    expect(await kv.getItem(SERVICE_FORM_DRAFTS_KEY)).not.toBeNull();
  });

  it('keeps drafts of different services apart', async () => {
    const store = createServiceFormDraftStore(createInMemoryStore(), createFakeClock());
    await store.save('alloc-1', 'svc-1', draft);

    expect(await store.load('alloc-1', 'svc-2')).toBeNull();
  });

  it('keeps the finished phase-one snapshot separate from an editable draft', async () => {
    const store = createServiceFormDraftStore(createInMemoryStore(), createFakeClock());
    await store.savePhaseOneSnapshot('alloc-1', 'svc-1', draft.answers);

    expect(await store.loadPhaseOneSnapshot('alloc-1', 'svc-1')).toEqual(draft.answers);
    expect(await store.load('alloc-1', 'svc-1')).toBeNull();
  });

  it('clears the phase-one snapshot for one service only', async () => {
    const store = createServiceFormDraftStore(createInMemoryStore(), createFakeClock());
    await store.savePhaseOneSnapshot('alloc-1', 'svc-1', draft.answers);
    await store.savePhaseOneSnapshot('alloc-1', 'svc-2', draft.answers);

    await store.clearPhaseOneSnapshot('alloc-1', 'svc-1');

    expect(await store.loadPhaseOneSnapshot('alloc-1', 'svc-1')).toBeNull();
    expect(await store.loadPhaseOneSnapshot('alloc-1', 'svc-2')).toEqual(draft.answers);
  });

  it('clears a draft', async () => {
    const store = createServiceFormDraftStore(createInMemoryStore(), createFakeClock());
    await store.save('alloc-1', 'svc-1', draft);

    await store.clear('alloc-1', 'svc-1');

    expect(await store.load('alloc-1', 'svc-1')).toBeNull();
  });

  it('clears all drafts of one finished allocation without touching another', async () => {
    const store = createServiceFormDraftStore(createInMemoryStore(), createFakeClock());
    await store.save('alloc-1', 'svc-1', draft);
    await store.save('alloc-1', 'svc-2', draft);
    await store.save('alloc-2', 'svc-3', draft);
    await store.savePhaseOneSnapshot('alloc-1', 'svc-1', draft.answers);
    await store.savePhaseOneSnapshot('alloc-2', 'svc-3', draft.answers);

    await store.clearForAllocation('alloc-1');

    expect(await store.load('alloc-1', 'svc-1')).toBeNull();
    expect(await store.load('alloc-1', 'svc-2')).toBeNull();
    expect(await store.load('alloc-2', 'svc-3')).not.toBeNull();
    expect(await store.loadPhaseOneSnapshot('alloc-1', 'svc-1')).toBeNull();
    expect(await store.loadPhaseOneSnapshot('alloc-2', 'svc-3')).toEqual(draft.answers);
  });

  it('clearAll drops every draft (sign-out)', async () => {
    const kv = createInMemoryStore();
    const store = createServiceFormDraftStore(kv, createFakeClock());
    await store.save('alloc-1', 'svc-1', draft);
    await store.save('alloc-2', 'svc-2', draft);
    await store.savePhaseOneSnapshot('alloc-1', 'svc-1', draft.answers);

    await store.clearAll();

    expect(await store.load('alloc-1', 'svc-1')).toBeNull();
    expect(await store.load('alloc-2', 'svc-2')).toBeNull();
    expect(await kv.getItem(SERVICE_FORM_DRAFTS_KEY)).toBeNull();
    expect(await store.loadPhaseOneSnapshot('alloc-1', 'svc-1')).toBeNull();
  });

  it('returns null for anything that is not a valid draft', () => {
    expect(parseServiceFormDraft(null)).toBeNull();
    expect(parseServiceFormDraft('not json')).toBeNull();
    expect(parseServiceFormDraft(JSON.stringify({ answers: 'not an object' }))).toBeNull();
  });
});

describe('hasServiceFormDraftProgress', () => {
  it('is false for no draft, or a draft with nothing filled in', () => {
    expect(hasServiceFormDraftProgress(null)).toBe(false);
    expect(
      hasServiceFormDraftProgress({
        answers: {},
        hideSignature: {},
        noEmailConfirmation: {},
        acceptedTermsAndConditions: true,
        recommendedFieldId: null,
        expandedSections: {},
        timestamp: 0,
      }),
    ).toBe(false);
  });

  it('is true once there are answers, a recommended field, or an expanded section', () => {
    expect(
      hasServiceFormDraftProgress({
        answers: { dn_name: { value: 'A', displayValue: 'A' } },
        hideSignature: {},
        noEmailConfirmation: {},
        acceptedTermsAndConditions: true,
        recommendedFieldId: null,
        expandedSections: {},
        timestamp: 0,
      }),
    ).toBe(true);
  });
});

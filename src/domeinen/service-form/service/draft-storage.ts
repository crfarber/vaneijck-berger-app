import type { Clock, KeyValueStore } from '@/shared/platform/ports';
import { cloneServiceFormAnswers } from '../domain/values';
import type { ServiceFormAnswers } from '../domain/types';

/**
 * Autosaves a form-in-progress so a berger who leaves mid-service does not lose their answers.
 * All drafts live under one key so sign-out can clear them in one go (ADR 0024).
 */
export type ServiceFormDraft = {
  answers: ServiceFormAnswers;
  hideSignature: Record<string, true>;
  noEmailConfirmation: Record<string, true>;
  acceptedTermsAndConditions: boolean;
  recommendedFieldId: string | null;
  expandedSections: Record<string, true>;
  timestamp: number;
};

export type ServiceFormDraftData = Omit<ServiceFormDraft, 'timestamp'>;

export function createServiceFormDraft(state: ServiceFormDraftData): ServiceFormDraftData {
  return {
    answers: cloneServiceFormAnswers(state.answers),
    hideSignature: { ...state.hideSignature },
    noEmailConfirmation: { ...state.noEmailConfirmation },
    acceptedTermsAndConditions: state.acceptedTermsAndConditions,
    recommendedFieldId: state.recommendedFieldId,
    expandedSections: { ...state.expandedSections },
  };
}

export type ServiceFormDraftStore = {
  load(allocationId: string, serviceId: string): Promise<ServiceFormDraft | null>;
  save(allocationId: string, serviceId: string, draft: ServiceFormDraftData): Promise<void>;
  clear(allocationId: string, serviceId: string): Promise<void>;
  clearForAllocation(allocationId: string): Promise<void>;
  /** Drops every draft. Called on sign-out so the next user never sees the previous one's answers. */
  clearAll(): Promise<void>;
};

export const SERVICE_FORM_DRAFTS_KEY = 'serviceForm.drafts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function draftEntryKey(allocationId: string, serviceId: string): string {
  return `${allocationId}.${serviceId}`;
}

export function parseServiceFormDraft(raw: unknown): ServiceFormDraft | null {
  if (typeof raw === 'string') {
    try {
      return parseServiceFormDraft(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }
  if (!isRecord(raw) || !isRecord(raw.answers)) {
    return null;
  }

  return {
    answers: raw.answers as ServiceFormAnswers,
    hideSignature: isRecord(raw.hideSignature) ? (raw.hideSignature as Record<string, true>) : {},
    noEmailConfirmation: isRecord(raw.noEmailConfirmation)
      ? (raw.noEmailConfirmation as Record<string, true>)
      : {},
    acceptedTermsAndConditions:
      typeof raw.acceptedTermsAndConditions === 'boolean' ? raw.acceptedTermsAndConditions : true,
    recommendedFieldId: typeof raw.recommendedFieldId === 'string' ? raw.recommendedFieldId : null,
    expandedSections: isRecord(raw.expandedSections)
      ? (raw.expandedSections as Record<string, true>)
      : {},
    timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : 0,
  };
}

async function loadAll(store: KeyValueStore): Promise<Record<string, ServiceFormDraft>> {
  const raw = await store.getItem(SERVICE_FORM_DRAFTS_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }
    const result: Record<string, ServiceFormDraft> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const draft = parseServiceFormDraft(value);
      if (draft !== null) {
        result[key] = draft;
      }
    }
    return result;
  } catch {
    return {};
  }
}

async function writeAll(
  store: KeyValueStore,
  drafts: Record<string, ServiceFormDraft>,
): Promise<void> {
  if (Object.keys(drafts).length === 0) {
    await store.removeItem(SERVICE_FORM_DRAFTS_KEY);
    return;
  }
  await store.setItem(SERVICE_FORM_DRAFTS_KEY, JSON.stringify(drafts));
}

/** Whether a draft actually holds anything worth resuming (an untouched, freshly opened form
 * still produces a draft-shaped object once saved, but with nothing in it). */
export function hasServiceFormDraftProgress(draft: ServiceFormDraft | null | undefined): boolean {
  if (!draft) {
    return false;
  }

  return (
    Object.keys(draft.answers).length > 0 ||
    draft.recommendedFieldId !== null ||
    Object.keys(draft.expandedSections).length > 0
  );
}

export function createServiceFormDraftStore(
  store: KeyValueStore,
  clock: Clock,
): ServiceFormDraftStore {
  return {
    async load(allocationId, serviceId) {
      const drafts = await loadAll(store);
      return drafts[draftEntryKey(allocationId, serviceId)] ?? null;
    },

    async save(allocationId, serviceId, draft) {
      const drafts = await loadAll(store);
      drafts[draftEntryKey(allocationId, serviceId)] = {
        ...draft,
        answers: cloneServiceFormAnswers(draft.answers),
        timestamp: clock.now(),
      };
      await writeAll(store, drafts);
    },

    async clear(allocationId, serviceId) {
      const drafts = await loadAll(store);
      delete drafts[draftEntryKey(allocationId, serviceId)];
      await writeAll(store, drafts);
    },

    async clearForAllocation(allocationId) {
      const drafts = await loadAll(store);
      for (const key of Object.keys(drafts)) {
        if (key.startsWith(`${allocationId}.`)) {
          delete drafts[key];
        }
      }
      await writeAll(store, drafts);
    },

    async clearAll() {
      await store.removeItem(SERVICE_FORM_DRAFTS_KEY);
    },
  };
}

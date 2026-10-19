import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { useStore } from 'zustand';
import {
  createServiceFormStore,
  type ServiceFormState,
  type ServiceFormStore,
} from './create-service-form-store';
import type { ServiceFormDraft } from '../service/draft-storage';
import type { ServiceFormAnswers } from '../domain/types';

const ServiceFormStoreContext = createContext<ServiceFormStore | null>(null);

type ServiceFormStoreProviderProps = PropsWithChildren<{
  initialAnswers: ServiceFormAnswers;
  initialExpandedSectionIds?: readonly string[];
  requiresTermsAcceptance?: boolean;
  persistedDraft?: ServiceFormDraft | null;
}>;

/** One store per mount, created once and never replaced for the lifetime of this provider —
 * remount (a new `key`) to start a fresh session, exactly like `ServicesFormStoreProvider`.
 * `useState`'s lazy initializer (not a ref checked during render) creates and seeds it exactly
 * once. */
export function ServiceFormStoreProvider({
  children,
  initialAnswers,
  initialExpandedSectionIds,
  requiresTermsAcceptance,
  persistedDraft = null,
}: ServiceFormStoreProviderProps) {
  const [store] = useState<ServiceFormStore>(() => {
    const created = createServiceFormStore();
    created
      .getState()
      .initialize(
        initialAnswers,
        initialExpandedSectionIds,
        requiresTermsAcceptance,
        persistedDraft,
      );
    return created;
  });

  return (
    <ServiceFormStoreContext.Provider value={store}>{children}</ServiceFormStoreContext.Provider>
  );
}

export function useServiceFormStoreApi(): ServiceFormStore {
  const store = useContext(ServiceFormStoreContext);
  if (!store) {
    throw new Error('useServiceFormStore must be used inside <ServiceFormStoreProvider>');
  }
  return store;
}

export function useServiceFormStore<T>(selector: (state: ServiceFormState) => T): T {
  return useStore(useServiceFormStoreApi(), selector);
}

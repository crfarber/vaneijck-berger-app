import { createContext, useContext, type ReactNode } from 'react';
import type { RdwInfo } from '@/domeinen/rdw';
import type { SignaturesApi } from '@/domeinen/signatures';
import type { ServiceFormDraftStore } from '../service/draft-storage';
import type { ServiceFormService } from '../service/service-form-service';

export type FetchRdwInfo = (registrationNumber: string) => Promise<RdwInfo | null>;

export type ServiceFormContextValue = {
  service: ServiceFormService;
  drafts: ServiceFormDraftStore;
  /** Injected from the `rdw` domain so the form (and later other screens) share one client. */
  fetchRdwInfo?: FetchRdwInfo;
  signaturesApi: SignaturesApi;
};

const ServiceFormContext = createContext<ServiceFormContextValue | null>(null);

export function ServiceFormProvider({
  value,
  children,
}: {
  value: ServiceFormContextValue;
  children: ReactNode;
}) {
  return <ServiceFormContext.Provider value={value}>{children}</ServiceFormContext.Provider>;
}

export function useServiceFormService(): ServiceFormService {
  const value = useContext(ServiceFormContext);
  if (value === null) {
    throw new Error('ServiceFormProvider is missing');
  }
  return value.service;
}

export function useServiceFormDrafts(): ServiceFormDraftStore {
  const value = useContext(ServiceFormContext);
  if (value === null) {
    throw new Error('ServiceFormProvider is missing');
  }
  return value.drafts;
}

export function useFetchRdwInfo(): FetchRdwInfo | undefined {
  const value = useContext(ServiceFormContext);
  if (value === null) {
    throw new Error('ServiceFormProvider is missing');
  }
  return value.fetchRdwInfo;
}

export function useSignaturesApi(): SignaturesApi {
  const value = useContext(ServiceFormContext);
  if (value === null) {
    throw new Error('ServiceFormProvider is missing');
  }
  return value.signaturesApi;
}

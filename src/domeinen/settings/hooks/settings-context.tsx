import { createContext, useContext, type ReactNode } from 'react';
import type { ReferenceDataService } from '@/domeinen/reference-data';
import type { PushRuntime } from '@/domeinen/notifications';
import type {
  AllocationUnitManagement,
  DevicePermissions,
  LanguageSettings,
  PermissionDisclosurePreference,
  SignOutGuard,
} from '../index';

type SettingsContextValue = {
  permissions: DevicePermissions;
  languageSettings: LanguageSettings;
  permissionDisclosurePreference: PermissionDisclosurePreference;
  /** Restart after the disclosure screen grants notification permission. */
  pushRuntime: PushRuntime;
  signOutGuard: SignOutGuard;
  allocationUnitManagement: AllocationUnitManagement;
  referenceDataService: ReferenceDataService;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  value,
  children,
}: {
  value: SettingsContextValue;
  children: ReactNode;
}) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (value === null) {
    throw new Error('SettingsProvider is missing');
  }
  return value;
}

export function useDevicePermissions(): DevicePermissions {
  return useSettings().permissions;
}

export function useLanguageSettings(): LanguageSettings {
  return useSettings().languageSettings;
}

export function usePermissionDisclosurePreference(): PermissionDisclosurePreference {
  return useSettings().permissionDisclosurePreference;
}

export function usePushRuntime(): PushRuntime {
  return useSettings().pushRuntime;
}

export function useSignOutGuard(): SignOutGuard {
  return useSettings().signOutGuard;
}

export function useAllocationUnitManagement(): AllocationUnitManagement {
  return useSettings().allocationUnitManagement;
}

export function useReferenceDataService(): ReferenceDataService {
  return useSettings().referenceDataService;
}

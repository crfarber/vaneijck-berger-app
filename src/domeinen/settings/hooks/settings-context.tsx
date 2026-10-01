import { createContext, useContext, type ReactNode } from 'react';
import type { ReferenceDataService } from '@/domeinen/reference-data';
import type { DevicePermissions, LanguageSettings, SignOutGuard } from '../index';

type SettingsContextValue = {
  permissions: DevicePermissions;
  languageSettings: LanguageSettings;
  signOutGuard: SignOutGuard;
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

export function useSignOutGuard(): SignOutGuard {
  return useSettings().signOutGuard;
}

export function useReferenceDataService(): ReferenceDataService {
  return useSettings().referenceDataService;
}

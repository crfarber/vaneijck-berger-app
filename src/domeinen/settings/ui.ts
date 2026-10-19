/** The React Native side of settings. Only routes and bootstrap import this file. */
export { createExpoDevicePermissions } from './platform/rn/expo-device-permissions';
export {
  SettingsProvider,
  useDevicePermissions,
  useLanguageSettings,
  usePermissionDisclosurePreference,
  usePushRuntime,
  useReferenceDataService,
  useAllocationUnitManagement,
  useSignOutGuard,
} from './hooks/settings-context';
export { usePermissionDisclosureGate } from './hooks/use-permission-disclosure-gate';
export { LanguageScreen } from './screens/language-screen';
export { PermissionDisclosureScreen } from './screens/permission-disclosure-screen';
export { PermissionsScreen } from './screens/permissions-screen';
export { ReferenceDataSyncScreen } from './screens/reference-data-sync-screen';
export { SettingsHeaderButton, SettingsScreen } from './screens/settings-screen';

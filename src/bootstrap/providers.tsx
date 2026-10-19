import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { AppState } from 'react-native';
import { AllocationUnitProvider } from '@/domeinen/allocation-unit/ui';
import { AllocationsApiProvider } from '@/domeinen/allocations/ui';
import { AuthProvider } from '@/domeinen/auth/ui';
import { LocationProvider } from '@/domeinen/location/ui';
import { NotificationHistoryProvider } from '@/domeinen/notifications/ui';
import { StandbyLocationProvider } from '@/domeinen/standby-location/ui';
import { PhotosProvider } from '@/domeinen/photos/ui';
import { PlacesProvider } from '@/domeinen/places/ui';
import { ServiceFormProvider } from '@/domeinen/service-form/ui';
import { SettingsProvider } from '@/domeinen/settings/ui';
import { SupportProvider } from '@/domeinen/support/ui';
import { WorkerApiProvider } from '@/domeinen/worker/ui';
import { OutboxProvider } from '@/domeinen/outbox/ui';
import { HapticsProvider } from '@/shared/ui/haptics-context';
import { StatusOverlayProvider } from '@/shared/ui/status-overlay-host';
import { FeedbackProvider } from '@/shared/ui/toast-host';
import { SchedulerProvider } from '@/shared/ui/scheduler-context';
import {
  allocationKeys,
  createAllocationSections,
  vehicleReleaseKeys,
  type Allocation,
  type VehicleReleaseLocation,
} from '@/domeinen/allocations';
import { hasBlockingAllocationItems, isStandbyBannerVisible } from '@/domeinen/standby-location';
import type { Container } from './container';
import { copyAccessTokenToClipboard } from './dev/copy-access-token';
import { DevToolsProvider, type FakeStandbyInput } from './dev/dev-tools-context';
import {
  DEFAULT_FAKE_STANDBY_ADDRESS,
  fakeStandbyLocationMessage,
} from './dev/fake-standby-notification';
import { resolveStandbyAddressFromPostal } from './dev/resolve-standby-address';
import { createPostalAddressLookup } from './postal-address-lookup';

/** Tells the session when the app returns to the foreground, so an expired token is renewed at once. */
function useForegroundRefresh(container: Container): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void container.lifecycle.onForeground();
      }
    });
    return () => subscription.remove();
  }, [container]);
}

/** Hands the parts of the container to the React tree. This is the only place that does so. */
export function AppProviders({
  container,
  children,
}: {
  container: Container;
  children: ReactNode;
}) {
  useForegroundRefresh(container);

  const devTools = useMemo(
    () => ({
      loadDebugSnapshot: () => container.loadDebugSnapshot(),
      copyAccessToken: () =>
        copyAccessTokenToClipboard({
          tokenProvider: container.tokenProvider,
          clipboard: Clipboard,
        }),
      async fakeStandbyLocationAdvice(input?: FakeStandbyInput) {
        const postalCode = input?.postalCode?.trim() ?? '';
        const houseNumber = input?.houseNumber?.trim() ?? '';
        const useLookup = postalCode.length > 0 || houseNumber.length > 0;
        let address = DEFAULT_FAKE_STANDBY_ADDRESS;
        if (useLookup) {
          const resolved = await resolveStandbyAddressFromPostal(
            { postalCode, houseNumber },
            {
              lookupPostalAddress: createPostalAddressLookup((code, number) =>
                container.allocationsApi.checkZipcode(code, number),
              ),
              places: container.placesClient,
            },
          );
          if (!resolved.ok) {
            return {
              status: null,
              hasBlockingItems: false,
              bannerVisible: false,
              label: '',
              resolveError: resolved.reason,
            };
          }
          address = resolved.address;
        }
        await container.pushRuntime.inject(
          fakeStandbyLocationMessage(container.clock.now(), address),
          'foreground',
        );
        const state = container.standbyLocation.getState();
        const allocations =
          container.queryClient.getQueryData<Allocation[]>(allocationKeys.list()) ?? [];
        const releases =
          container.queryClient.getQueryData<VehicleReleaseLocation[]>(vehicleReleaseKeys.list()) ??
          [];
        const [active, pending, vehicleReleases] = createAllocationSections(allocations, releases);
        const hasBlockingItems = hasBlockingAllocationItems({
          activeCount: active.count,
          pendingCount: pending.count,
          vehicleReleaseCount: vehicleReleases.count,
        });
        return {
          status: state.status,
          hasBlockingItems,
          bannerVisible: isStandbyBannerVisible({
            status: state.status,
            pendingAdvice: state.pendingAdvice,
            hasBlockingItems,
          }),
          label: `${address.street} ${address.houseNo}, ${address.city}`,
        };
      },
      clearStandbyLocationAdvice: () => container.standbyLocation.clear(),
    }),
    [container],
  );
  const settings = useMemo(
    () => ({
      permissions: container.devicePermissions,
      languageSettings: container.languageSettings,
      permissionDisclosurePreference: container.permissionDisclosurePreference,
      pushRuntime: container.pushRuntime,
      signOutGuard: container.signOutGuard,
      allocationUnitManagement: container.allocationUnitManagement,
      referenceDataService: container.referenceDataService,
    }),
    [container],
  );
  const location = useMemo(
    () => ({
      reader: container.locationReader,
      clock: container.clock,
    }),
    [container],
  );

  return (
    <QueryClientProvider client={container.queryClient}>
      <I18nextProvider i18n={container.i18n}>
        <FeedbackProvider value={container.feedback}>
          <StatusOverlayProvider value={container.statusOverlay}>
            <SchedulerProvider value={container.scheduler}>
              <HapticsProvider value={container.haptics}>
                <OutboxProvider value={container.outbox}>
                  <AuthProvider
                    value={{
                      authService: container.authService,
                      sessionStore: container.sessionStore,
                    }}
                  >
                    <DevToolsProvider value={devTools}>
                      <AllocationsApiProvider
                        value={{
                          api: container.allocationsApi,
                          rdwApi: container.rdwApi,
                          actionsService: container.allocationActionsService,
                          acceptFlow: container.allocationAcceptFlow,
                          serviceActionsService: container.serviceActionsService,
                          reassignService: container.reassignService,
                        }}
                      >
                        <WorkerApiProvider
                          value={{
                            api: container.workerApi,
                            availabilityService: container.workerAvailabilityService,
                          }}
                        >
                          <PhotosProvider value={container.photoService} logger={container.logger}>
                            <PlacesProvider value={container.placesClient}>
                              <ServiceFormProvider
                                value={{
                                  service: container.serviceFormService,
                                  drafts: container.serviceFormDrafts,
                                  logger: container.logger,
                                  fetchRdwInfo: (registrationNumber) =>
                                    container.rdwApi.lookupByRegistrationNumber(registrationNumber),
                                  lookupPostalAddress: createPostalAddressLookup(
                                    (postalCode, houseNumber) =>
                                      container.allocationsApi.checkZipcode(
                                        postalCode,
                                        houseNumber,
                                      ),
                                  ),
                                  signaturesApi: container.signaturesApi,
                                }}
                              >
                                <SettingsProvider value={settings}>
                                  <LocationProvider value={location}>
                                    <NotificationHistoryProvider
                                      value={container.notificationHistory}
                                    >
                                      <StandbyLocationProvider value={container.standbyLocation}>
                                        <SupportProvider value={container.supportLog}>
                                          <AllocationUnitProvider
                                            value={{
                                              service: container.allocationUnitService,
                                              clock: container.clock,
                                              endDatePreference: container.endDatePreference,
                                              recentTruckPreference:
                                                container.recentTruckPreference,
                                              homebasePreference: container.homebasePreference,
                                              lastUnitPreference: container.lastUnitPreference,
                                            }}
                                          >
                                            {children}
                                          </AllocationUnitProvider>
                                        </SupportProvider>
                                      </StandbyLocationProvider>
                                    </NotificationHistoryProvider>
                                  </LocationProvider>
                                </SettingsProvider>
                              </ServiceFormProvider>
                            </PlacesProvider>
                          </PhotosProvider>
                        </WorkerApiProvider>
                      </AllocationsApiProvider>
                    </DevToolsProvider>
                  </AuthProvider>
                </OutboxProvider>
              </HapticsProvider>
            </SchedulerProvider>
          </StatusOverlayProvider>
        </FeedbackProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

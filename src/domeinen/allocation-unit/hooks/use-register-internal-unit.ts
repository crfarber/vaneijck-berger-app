import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { DEFAULT_AVAILABILITY, type UnitAvailability } from '../domain/availability';
import {
  filterFleetByType,
  VEHICLE_TYPE_CODE_TRAILER,
  VEHICLE_TYPE_CODE_TRUCK,
  type FleetVehicle,
} from '../domain/fleet';
import { validateEndDate } from '../domain/working-hours';
import {
  useAllocationUnitService,
  useEndDatePreference,
  useRecentTruckPreference,
} from './allocation-unit-context';
import { noUnitDispatchAlertTexts, showNoUnitDispatchAlert } from './show-no-unit-dispatch-alert';
import { useHomebasePicker } from './use-homebase-picker';

export type InternalFleetSheet = 'truck' | 'trailer';

/**
 * Form state for an internal berger: pick a truck and optionally a trailer from the synced
 * fleet, then set availability and end of shift on the same screen. Sheets open on the plates.
 */
export function useRegisterInternalUnit(
  options: { isOnboarding?: boolean; onOpenWork?: () => void; isInternal?: boolean } = {},
) {
  const isOnboarding = options.isOnboarding ?? true;
  const onOpenWork = options.onOpenWork;
  const { t } = useTranslation();
  const service = useAllocationUnitService();
  const endDatePreference = useEndDatePreference();
  const recentTruckPreference = useRecentTruckPreference();
  const statusOverlay = useStatusOverlay();
  const homebase = useHomebasePicker({ enabled: options.isInternal ?? true });

  const [loading, setLoading] = useState(true);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [recentTruckIds, setRecentTruckIds] = useState<readonly string[]>([]);
  const [truck, setTruck] = useState<FleetVehicle | null>(null);
  const [trailer, setTrailer] = useState<FleetVehicle | null>(null);
  const [sheet, setSheet] = useState<InternalFleetSheet | null>(null);
  const [availability, setAvailability] = useState<UnitAvailability>(DEFAULT_AVAILABILITY);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      service.getFleet(),
      endDatePreference.getProposedEndDate({ isOnboarding, now: new Date() }),
      recentTruckPreference.load(),
    ]).then(([loadedFleet, proposedEndDate, loadedRecentTruckIds]) => {
      if (cancelled) {
        return;
      }
      setFleet(loadedFleet);
      setRecentTruckIds(loadedRecentTruckIds);
      setEndDate(proposedEndDate);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [service, endDatePreference, recentTruckPreference, isOnboarding]);

  const selectTruck = (vehicle: FleetVehicle): void => {
    setTruck(vehicle);
    setSheet(null);
    setMessage(null);
  };

  const selectTrailer = (vehicle: FleetVehicle | null): void => {
    setTrailer(vehicle);
    setSheet(null);
  };

  const openSheet = (next: InternalFleetSheet): void => setSheet(next);
  const closeSheet = (): void => setSheet(null);

  const toggleAvailability = (key: keyof UnitAvailability, value: boolean): void => {
    setAvailability((previous) => ({ ...previous, [key]: value }));
  };

  const setFullyAvailable = (): void => setAvailability(DEFAULT_AVAILABILITY);

  /** Applies a candidate end date from a picker. Returns false (and shows why) when it is not allowed. */
  const changeEndDate = (candidate: Date): boolean => {
    const validation = validateEndDate(candidate, new Date());
    if (!validation.valid) {
      setMessage(
        t(validation.error === 'inPast' ? 'unit.errors.endInPast' : 'unit.errors.endBeyond24'),
      );
      return false;
    }
    setMessage(null);
    setEndDate(candidate);
    return true;
  };

  const submit = async (): Promise<void> => {
    if (truck === null) {
      setMessage(t('unit.errors.truckRequired'));
      return;
    }
    if (endDate === null) {
      return;
    }
    const homebaseLocation = homebase.selected;
    if (!homebase.ensureSelected() || homebaseLocation === null) {
      return;
    }
    setBusy(true);
    setMessage(null);
    let dialog: 'active-incident' | null = null;
    try {
      await statusOverlay.run(t('feedback.processing.registerUnit'), async () => {
        const result = await service.registerInternal({
          vehicleId: truck.id,
          trailerId: trailer?.id ?? null,
          endDate,
          availability,
          homebaseLocationId: homebaseLocation.id,
        });
        if (!result.ok) {
          if (result.error === 'active-incident') {
            dialog = 'active-incident';
            return { tone: 'none' as const };
          }
          return { tone: 'error' as const, message: t('unit.errors.submitFailed') };
        }
        await Promise.all([
          endDatePreference.remember(endDate),
          recentTruckPreference.remember(truck.id),
          homebase.remember(),
        ]);
        setDone(true);
        return { tone: 'none' as const };
      });
    } finally {
      setBusy(false);
    }
    if (dialog === 'active-incident') {
      // Onboarding: escape to the list. Voluntary /unit change: keep the dispatch alert.
      if (onOpenWork !== undefined) {
        onOpenWork();
      } else {
        showNoUnitDispatchAlert(noUnitDispatchAlertTexts(t));
      }
    }
  };

  return {
    loading,
    trucks: filterFleetByType(fleet, VEHICLE_TYPE_CODE_TRUCK),
    recentTrucks: recentTruckIds
      .map((id) => fleet.find((vehicle) => vehicle.id === id))
      .filter((vehicle): vehicle is FleetVehicle => vehicle?.typeCode === VEHICLE_TYPE_CODE_TRUCK),
    trailers: filterFleetByType(fleet, VEHICLE_TYPE_CODE_TRAILER),
    truck,
    trailer,
    sheet,
    openSheet,
    closeSheet,
    selectTruck,
    selectTrailer,
    availability,
    toggleAvailability,
    setFullyAvailable,
    endDate,
    changeEndDate,
    homebase,
    busy,
    message,
    done,
    submit,
  };
}

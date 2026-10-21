import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkerApi } from '@/domeinen/worker/ui';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { DEFAULT_AVAILABILITY, type UnitAvailability } from '../domain/availability';
import {
  filterFleetByType,
  VEHICLE_TYPE_CODE_TRAILER,
  VEHICLE_TYPE_CODE_TRUCK,
  type FleetVehicle,
} from '../domain/fleet';
import type { UnitReuseIntent } from '../domain/last-unit-snapshot';
import { validateEndDate } from '../domain/working-hours';
import {
  useAllocationUnitService,
  useEndDatePreference,
  useLastUnitPreference,
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
  options: {
    isOnboarding?: boolean;
    onOpenWork?: () => void;
    isInternal?: boolean;
    reuse?: UnitReuseIntent | null;
  } = {},
) {
  const isOnboarding = options.isOnboarding ?? true;
  const onOpenWork = options.onOpenWork;
  const reuse = options.reuse ?? null;
  const { t } = useTranslation();
  const service = useAllocationUnitService();
  const endDatePreference = useEndDatePreference();
  const recentTruckPreference = useRecentTruckPreference();
  const lastUnitPreference = useLastUnitPreference();
  const workerApi = useWorkerApi();
  const statusOverlay = useStatusOverlay();
  const homebase = useHomebasePicker({ enabled: options.isInternal ?? true });
  const appliedReuse = useRef(false);

  const [loading, setLoading] = useState(true);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [fleetEmpty, setFleetEmpty] = useState(false);
  const [recentTruckIds, setRecentTruckIds] = useState<readonly string[]>([]);
  const [truck, setTruck] = useState<FleetVehicle | null>(null);
  const [trailer, setTrailer] = useState<FleetVehicle | null>(null);
  const [sheet, setSheet] = useState<InternalFleetSheet | null>(null);
  const [availability, setAvailability] = useState<UnitAvailability>(DEFAULT_AVAILABILITY);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fleetReloadToken, setFleetReloadToken] = useState(0);

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
      setFleetEmpty(loadedFleet.length === 0);
      setRecentTruckIds(loadedRecentTruckIds);
      setEndDate(proposedEndDate);
      if (!appliedReuse.current && reuse?.kind === 'internal') {
        appliedReuse.current = true;
        const reusedTruck = loadedFleet.find((vehicle) => vehicle.id === reuse.truckId);
        if (reusedTruck !== undefined && reusedTruck.typeCode === VEHICLE_TYPE_CODE_TRUCK) {
          setTruck(reusedTruck);
          if (reuse.trailerId !== null) {
            const reusedTrailer = loadedFleet.find((vehicle) => vehicle.id === reuse.trailerId);
            if (
              reusedTrailer !== undefined &&
              reusedTrailer.typeCode === VEHICLE_TYPE_CODE_TRAILER
            ) {
              setTrailer(reusedTrailer);
            }
          }
        }
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [service, endDatePreference, recentTruckPreference, isOnboarding, reuse, fleetReloadToken]);

  const reloadFleet = (): void => {
    setLoading(true);
    setFleetEmpty(false);
    setFleetReloadToken((token) => token + 1);
  };

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
    let saved = false;
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
        const worker = await workerApi.get();
        if (worker !== null) {
          await lastUnitPreference.remember({
            kind: 'internal',
            workerId: worker.dn_workerid,
            userType: 'internal',
            truckId: truck.id,
            trailerId: trailer?.id ?? null,
            vehicleName: truck.name,
            vehicleNumber: truck.vehicleNumber,
            trailerName: trailer?.name ?? null,
            trailerNumber: trailer?.vehicleNumber ?? null,
          });
        }
        saved = true;
        return { tone: 'none' as const };
      });
      if (saved) {
        setDone(true);
      }
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
    fleetEmpty,
    reloadFleet,
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

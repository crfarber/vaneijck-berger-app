import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { resolveCurrentPosition } from '@/domeinen/location';
import { useLocationReader } from '@/domeinen/location/ui';
import {
  pickInitialHomebase,
  sortHomebaseLocations,
  type HomebaseLocation,
  type SortedHomebaseLocation,
} from '../domain/homebase';
import { useAllocationUnitService, useHomebasePreference } from './allocation-unit-context';

/**
 * Homebase (uitvoerlocatie) choice for an internal berger: synced locations nearest first,
 * prefilled with the remembered one or else the nearest. Does nothing while `enabled` is false.
 */
export function useHomebasePicker({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const service = useAllocationUnitService();
  const preference = useHomebasePreference();
  const locationReader = useLocationReader();

  const [locations, setLocations] = useState<SortedHomebaseLocation[]>([]);
  const [selected, setSelected] = useState<HomebaseLocation | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void Promise.all([
      service.getHomebaseLocations(),
      preference.load(),
      locationReader.getCurrent(),
    ]).then(([loaded, rememberedId, current]) => {
      if (cancelled) {
        return;
      }
      const sorted = sortHomebaseLocations(loaded, resolveCurrentPosition(current));
      setLocations(sorted);
      setSelected((previous) => previous ?? pickInitialHomebase(sorted, rememberedId));
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, service, preference, locationReader]);

  const select = (location: HomebaseLocation): void => {
    setSelected(location);
    setSheetOpen(false);
  };

  /** Blocks saving with an alert when an internal berger has not chosen a homebase. */
  const ensureSelected = (): boolean => {
    if (!enabled || selected !== null) {
      return true;
    }
    Alert.alert(t('unit.homebase.required'));
    return false;
  };

  const remember = async (): Promise<void> => {
    if (enabled && selected !== null) {
      await preference.remember(selected.id);
    }
  };

  return {
    enabled,
    locations,
    selected,
    select,
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    ensureSelected,
    remember,
  };
}

export type HomebasePicker = ReturnType<typeof useHomebasePicker>;

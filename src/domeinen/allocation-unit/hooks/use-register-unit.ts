import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { applyLicensePlateInput, type LicensePlateInput } from '../domain/license-plate';
import { validateEndDate } from '../domain/working-hours';
import { DEFAULT_AVAILABILITY, type UnitAvailability } from '../domain/availability';
import { useAllocationUnitService, useEndDatePreference } from './allocation-unit-context';
import { noUnitDispatchAlertTexts, showNoUnitDispatchAlert } from './show-no-unit-dispatch-alert';

export function useRegisterUnit(options: { isOnboarding?: boolean; onOpenWork?: () => void } = {}) {
  const isOnboarding = options.isOnboarding ?? true;
  const onOpenWork = options.onOpenWork;
  const { t } = useTranslation();
  const service = useAllocationUnitService();
  const endDatePreference = useEndDatePreference();
  const statusOverlay = useStatusOverlay();

  const [plate, setPlate] = useState<LicensePlateInput>(() => applyLicensePlateInput(''));
  const [availability, setAvailability] = useState<UnitAvailability>(DEFAULT_AVAILABILITY);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void endDatePreference
      .getProposedEndDate({ isOnboarding, now: new Date() })
      .then((proposed) => {
        if (!cancelled) {
          setEndDate(proposed);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [endDatePreference, isOnboarding]);

  const changePlate = (text: string): void => {
    setPlate(applyLicensePlateInput(text));
  };

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
    if (plate.isValid !== true) {
      setMessage(t('unit.errors.invalidPlate'));
      return;
    }
    if (endDate === null) {
      return;
    }
    setBusy(true);
    setMessage(null);
    let dialog: 'active-incident' | null = null;
    try {
      await statusOverlay.run(t('feedback.processing.registerUnit'), async () => {
        const result = await service.registerExternal({
          plateNumber: plate.raw,
          endDate,
          availability,
        });
        if (!result.ok) {
          if (result.error === 'active-incident') {
            dialog = 'active-incident';
            return { tone: 'none' as const };
          }
          return { tone: 'error' as const, message: t('unit.errors.submitFailed') };
        }
        await endDatePreference.remember(endDate);
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
    plate,
    changePlate,
    availability,
    toggleAvailability,
    setFullyAvailable,
    endDate,
    changeEndDate,
    busy,
    message,
    done,
    submit,
  };
}

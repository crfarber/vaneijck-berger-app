import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { validateEndDate } from '../domain/working-hours';
import { useAllocationUnitService, useEndDatePreference } from './allocation-unit-context';
import { noUnitDispatchAlertTexts, showNoUnitDispatchAlert } from './show-no-unit-dispatch-alert';
import { useHomebasePicker } from './use-homebase-picker';

/**
 * Only refreshes the shift end time on an existing unit — old app `SetWorkingHours`.
 * Plate / vehicle / availability stay as they are on the server; an internal berger also
 * confirms the homebase.
 */
export function useExtendShift(
  options: { isOnboarding?: boolean; onOpenWork?: () => void; isInternal?: boolean } = {},
) {
  const isOnboarding = options.isOnboarding ?? true;
  const onOpenWork = options.onOpenWork;
  const { t } = useTranslation();
  const service = useAllocationUnitService();
  const endDatePreference = useEndDatePreference();
  const statusOverlay = useStatusOverlay();
  const homebase = useHomebasePicker({ enabled: options.isInternal ?? false });

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
    if (endDate === null) {
      return;
    }
    if (!homebase.ensureSelected()) {
      return;
    }
    const homebaseLocationId = homebase.enabled ? homebase.selected?.id : undefined;
    setBusy(true);
    setMessage(null);
    let dialog: 'active-incident' | null = null;
    try {
      await statusOverlay.run(t('feedback.processing.extendShift'), async () => {
        const result = await service.extendShift(endDate, { homebaseLocationId });
        if (!result.ok) {
          if (result.error === 'active-incident') {
            dialog = 'active-incident';
            return { tone: 'none' as const };
          }
          return {
            tone: 'error' as const,
            message: t(
              result.error === 'no-unit'
                ? 'unit.errors.noUnitToExtend'
                : 'unit.errors.submitFailed',
            ),
          };
        }
        await Promise.all([endDatePreference.remember(endDate), homebase.remember()]);
        setDone(true);
        return { tone: 'none' as const };
      });
    } finally {
      setBusy(false);
    }
    if (dialog === 'active-incident') {
      if (onOpenWork !== undefined) {
        onOpenWork();
      } else {
        showNoUnitDispatchAlert(noUnitDispatchAlertTexts(t));
      }
    }
  };

  return {
    endDate,
    changeEndDate,
    homebase,
    busy,
    message,
    done,
    submit,
  };
}

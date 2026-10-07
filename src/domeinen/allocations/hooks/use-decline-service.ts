import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { hasActiveServices } from '@/domeinen/services';
import { useStatusOverlay } from '@/shared/ui/status-overlay-host';
import { feedbackForDeclineService } from '../domain/action-feedback';
import {
  canReturnToDispatch,
  reduceServiceDecline,
  SERVICE_DECLINE_ACTION,
  statuscodeForDeclineAction,
  type ServiceDeclineAction,
  type ServiceDeclineStep,
} from '../domain/service-decline';
import type { Service } from '../domain/types';
import { useServiceActionsService } from './allocations-context';
import { useProcessingExit, type ExitContext } from './use-processing-exit';

/**
 * Opens the service-decline sheet, confirms, sends, then exits processing the same way the old
 * `ProcessingServiceWrapper` did after `executeServiceDecline`.
 */
export function useDeclineService(
  exitContext: ExitContext & { services: readonly Service[]; serviceStatuscode: number },
) {
  const { t } = useTranslation();
  const service = useServiceActionsService();
  const statusOverlay = useStatusOverlay();
  const { exit } = useProcessingExit();
  const [state, dispatch] = useReducer(reduceServiceDecline, {
    step: 'closed',
  } satisfies ServiceDeclineStep);

  const open = (): void => {
    dispatch({ type: 'open' });
  };

  const close = (): void => {
    if (state.step === 'submitting') {
      return;
    }
    dispatch({ type: 'close' });
  };

  const select = (action: ServiceDeclineAction): void => {
    if (
      action === SERVICE_DECLINE_ACTION.returnToDispatch &&
      !canReturnToDispatch(exitContext.serviceStatuscode)
    ) {
      return;
    }
    dispatch({ type: 'select', action });
  };

  const back = (): void => {
    dispatch({ type: 'back' });
  };

  const confirm = async (): Promise<void> => {
    if (state.step !== 'confirm') {
      return;
    }
    const action = state.action;
    if (
      action === SERVICE_DECLINE_ACTION.returnToDispatch &&
      !canReturnToDispatch(exitContext.serviceStatuscode)
    ) {
      dispatch({ type: 'close' });
      return;
    }
    dispatch({ type: 'confirm' });
    // Close the sheet before the status overlay — a View cannot sit above the sheet Modal.
    dispatch({ type: 'done' });
    const statuscode = statuscodeForDeclineAction(action);
    const hadOtherOpenServicesBeforeExit = hasActiveServices(
      exitContext.services.filter((item) => item.dn_serviceid !== exitContext.serviceId),
    );
    let shouldExit = false;
    await statusOverlay.run(t('feedback.processing.declineService'), async () => {
      const result = await service.declineService(exitContext.serviceId, statuscode);
      const mapped = feedbackForDeclineService(result);
      if (!result.ok && result.error === 'request-failed') {
        if (mapped.kind === 'status') {
          return { tone: mapped.tone, message: t(mapped.messageKey) };
        }
        return { tone: 'error' as const, message: t('common.somethingWrong') };
      }
      shouldExit = true;
      if (mapped.kind === 'none') {
        return { tone: 'none' as const };
      }
      return { tone: mapped.tone, message: t(mapped.messageKey) };
    });
    if (!shouldExit) {
      return;
    }
    exit({
      ...exitContext,
      trigger: 'decline',
      declineStatusCode: statuscode,
      hadOtherOpenServicesBeforeExit,
      excludeServiceId: exitContext.serviceId,
    });
  };

  return { state, open, close, select, back, confirm };
}

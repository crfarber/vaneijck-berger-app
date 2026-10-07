import { getEarlyCompleteFlags, hasEarlyCompleteTerminal } from './early-complete';
import { LCMH_IM_ACTION_STATUS_CODES } from './service-types';
import { isSubmitAllowed, SERVICE_STATUS } from './status';

/**
 * Where the flow goes after the berger sent (or declined, or finished) a service:
 * - `terminal`: this service is done; go back to the allocation (or the next open service).
 * - `continueIncident`: stay in the incident and pick the next step.
 * - `processingFinish`: show the closing screen after the last phase of a multi-phase service.
 * - `blocked`: nothing was sent; return to the allocation.
 */
export type ProcessingExitKind = 'terminal' | 'continueIncident' | 'processingFinish' | 'blocked';

export type ProcessingExitInput =
  | { trigger: 'decline'; declineStatusCode: number }
  | {
      trigger: 'submit';
      currentStatuscode?: number;
      postedBody: Readonly<Record<string, unknown>>;
      serviceTypeCode?: number;
      isReleaseItem?: boolean;
      locationId?: string;
    }
  | { trigger: 'finish' }
  | { trigger: 'blocked' | 'serviceGone' };

export type ProcessingExitResult = {
  exitKind: ProcessingExitKind;
  isEarlyComplete: boolean;
  isLcmh: boolean;
};

const result = (
  exitKind: ProcessingExitKind,
  flags: { isEarlyComplete?: boolean; isLcmh?: boolean } = {},
): ProcessingExitResult => ({
  exitKind,
  isEarlyComplete: flags.isEarlyComplete ?? false,
  isLcmh: flags.isLcmh ?? false,
});

function isLcmh(body: Readonly<Record<string, unknown>>): boolean {
  const code = body.dn_imactionstatuscode;
  return typeof code === 'number' && LCMH_IM_ACTION_STATUS_CODES.includes(code);
}

export function resolveProcessingExit(input: ProcessingExitInput): ProcessingExitResult {
  switch (input.trigger) {
    case 'blocked':
    case 'serviceGone':
      return result('blocked');

    case 'finish':
      return result('terminal');

    case 'decline':
      // A futile trip ends the service; any other decline leaves the incident open.
      return input.declineStatusCode === SERVICE_STATUS.VERGEEFSE_RIT
        ? result('terminal')
        : result('continueIncident');

    case 'submit': {
      const { currentStatuscode, postedBody, serviceTypeCode, isReleaseItem, locationId } = input;

      if (currentStatuscode !== undefined && !isSubmitAllowed(currentStatuscode)) {
        return result('blocked');
      }

      const lcmh = isLcmh(postedBody);
      const postedStatus =
        typeof postedBody.statuscode === 'number' ? postedBody.statuscode : undefined;

      if (hasEarlyCompleteTerminal(getEarlyCompleteFlags(serviceTypeCode, postedBody))) {
        return result('terminal', { isEarlyComplete: true, isLcmh: lcmh });
      }
      if (postedStatus === SERVICE_STATUS.NACONTROLE) {
        return result('terminal', { isLcmh: lcmh });
      }
      if (isReleaseItem && locationId) {
        return result('terminal', { isLcmh: lcmh });
      }
      if (postedStatus === SERVICE_STATUS.HULPVERLENING_AFGEROND) {
        // Last phase of a multi-phase service was already at akkoord; show the closing screen.
        // A one-phase definition posts afgerond from an earlier status and ends immediately.
        return currentStatuscode === SERVICE_STATUS.HULPVERLENING_AKKOORD
          ? result('processingFinish', { isLcmh: lcmh })
          : result('terminal', { isLcmh: lcmh });
      }
      return result('continueIncident', { isLcmh: lcmh });
    }
  }
}

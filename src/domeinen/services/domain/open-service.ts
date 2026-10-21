import { isSubmitAllowed, SERVICE_STATUS } from './status';

/**
 * Where opening a service should land, based only on its CRM status.
 * - `blocked`: no longer submittable; leave processing.
 * - `finish`: already at HULPVERLENING_AFGEROND; open the closing screen.
 * - `form`: open the processing form.
 */
export type OpenServiceRoute = 'blocked' | 'finish' | 'form';

export function resolveOpenServiceRoute(statuscode: number | undefined): OpenServiceRoute {
  if (!isSubmitAllowed(statuscode)) {
    return 'blocked';
  }
  if (statuscode === SERVICE_STATUS.HULPVERLENING_AFGEROND) {
    return 'finish';
  }
  return 'form';
}

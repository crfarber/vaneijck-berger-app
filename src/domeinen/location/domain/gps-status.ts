import { nextPermissionStep, PERMISSION_STEP, type PermissionSnapshot } from '@/domeinen/settings';
import { resolveCurrentPosition, type CurrentLocation } from './proximity';

/**
 * What the GPS toolbar button and sheet should show.
 * - `active`: permission granted and a usable fix
 * - `no-fix`: permission granted but no position yet
 * - `ask`: the system dialog can still appear
 * - `open-settings`: refused and the dialog will not come back
 */
export const GPS_STATUS = {
  active: 'active',
  noFix: 'no-fix',
  ask: 'ask',
  openSettings: 'open-settings',
} as const;

export type GpsStatus = (typeof GPS_STATUS)[keyof typeof GPS_STATUS];

/** Toolbar tint: green when permission is granted (even without a fix), red otherwise — same as the old NavigationBar. */
export function gpsButtonVariant(status: GpsStatus): 'success' | 'alert' {
  return status === GPS_STATUS.active || status === GPS_STATUS.noFix ? 'success' : 'alert';
}

export function resolveGpsStatus(
  permission: PermissionSnapshot,
  position: CurrentLocation,
): GpsStatus {
  const step = nextPermissionStep(permission);
  if (step === PERMISSION_STEP.ask) {
    return GPS_STATUS.ask;
  }
  if (step === PERMISSION_STEP.openSettings) {
    return GPS_STATUS.openSettings;
  }
  return resolveCurrentPosition(position) !== null ? GPS_STATUS.active : GPS_STATUS.noFix;
}

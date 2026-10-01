export const PERMISSION_KIND = {
  location: 'location',
  notifications: 'notifications',
  camera: 'camera',
} as const;

export type PermissionKind = (typeof PERMISSION_KIND)[keyof typeof PERMISSION_KIND];

export const PERMISSION_STATUS = {
  granted: 'granted',
  denied: 'denied',
  undetermined: 'undetermined',
} as const;

export type PermissionStatus = (typeof PERMISSION_STATUS)[keyof typeof PERMISSION_STATUS];

/** What the device reported, without having asked again. */
export type PermissionSnapshot = {
  status: PermissionStatus;
  /** False once the system will not show the dialog again (iOS after a refusal). */
  canAskAgain: boolean;
};

export const PERMISSION_STEP = {
  /** Already allowed. Nothing to ask. */
  ready: 'ready',
  /** The system dialog can still appear. */
  ask: 'ask',
  /** The dialog will not appear. The berger has to change it in the system settings. */
  openSettings: 'open-settings',
} as const;

export type PermissionStep = (typeof PERMISSION_STEP)[keyof typeof PERMISSION_STEP];

/**
 * What the settings row (and the camera screen) should offer. A refused permission that cannot be
 * asked again must not show another request: the system dialog will not come back.
 */
export function nextPermissionStep(snapshot: PermissionSnapshot): PermissionStep {
  if (snapshot.status === PERMISSION_STATUS.granted) {
    return PERMISSION_STEP.ready;
  }
  if (snapshot.canAskAgain) {
    return PERMISSION_STEP.ask;
  }
  return PERMISSION_STEP.openSettings;
}

import { Camera } from 'expo-camera';
import type { PermissionResponse } from 'expo';
import * as Location from 'expo-location';
import notifee, { AuthorizationStatus as NotifeeAuthorizationStatus } from '@notifee/react-native';
import { Linking } from 'react-native';
import {
  PERMISSION_KIND,
  PERMISSION_STATUS,
  type PermissionKind,
  type PermissionSnapshot,
  type PermissionStatus,
} from '../../domain/permission-step';
import type { DevicePermissions } from '../../service/device-permissions';

function fromExpo(response: PermissionResponse): PermissionSnapshot {
  const status: PermissionStatus =
    response.granted || response.status === 'granted'
      ? PERMISSION_STATUS.granted
      : response.status === 'undetermined'
        ? PERMISSION_STATUS.undetermined
        : PERMISSION_STATUS.denied;
  return { status, canAskAgain: response.canAskAgain };
}

/** Authorized and provisional grants still count: the app can deliver a banner. */
function fromNotifee(authorizationStatus: number): PermissionSnapshot {
  if (
    authorizationStatus === NotifeeAuthorizationStatus.AUTHORIZED ||
    authorizationStatus === NotifeeAuthorizationStatus.PROVISIONAL
  ) {
    return { status: PERMISSION_STATUS.granted, canAskAgain: false };
  }
  if (authorizationStatus === NotifeeAuthorizationStatus.NOT_DETERMINED) {
    return { status: PERMISSION_STATUS.undetermined, canAskAgain: true };
  }
  return { status: PERMISSION_STATUS.denied, canAskAgain: false };
}

async function readKind(kind: PermissionKind): Promise<PermissionSnapshot> {
  switch (kind) {
    case PERMISSION_KIND.location:
      return fromExpo(await Location.getForegroundPermissionsAsync());
    case PERMISSION_KIND.notifications: {
      const settings = await notifee.getNotificationSettings();
      return fromNotifee(settings.authorizationStatus);
    }
    case PERMISSION_KIND.camera:
      return fromExpo(await Camera.getCameraPermissionsAsync());
  }
}

async function requestKind(kind: PermissionKind): Promise<PermissionSnapshot> {
  switch (kind) {
    case PERMISSION_KIND.location:
      return fromExpo(await Location.requestForegroundPermissionsAsync());
    case PERMISSION_KIND.notifications: {
      const settings = await notifee.requestPermission({
        alert: true,
        badge: true,
        sound: true,
      });
      return fromNotifee(settings.authorizationStatus);
    }
    case PERMISSION_KIND.camera:
      return fromExpo(await Camera.requestCameraPermissionsAsync());
  }
}

/** Foreground location, notifications and camera. No background location, no microphone. */
export function createExpoDevicePermissions(): DevicePermissions {
  return {
    read: readKind,
    request: requestKind,
    openSystemSettings() {
      return Linking.openSettings();
    },
  };
}

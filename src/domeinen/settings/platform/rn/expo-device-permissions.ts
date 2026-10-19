import { Camera } from 'expo-camera';
import type { PermissionResponse } from 'expo';
import * as Location from 'expo-location';
import notifee, { AuthorizationStatus as NotifeeAuthorizationStatus } from '@notifee/react-native';
import { Linking, Platform } from 'react-native';
import {
  NOTIFICATION_AUTHORIZATION,
  notificationPermissionSnapshot,
  PERMISSION_KIND,
  PERMISSION_STATUS,
  type NotificationAuthorization,
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

function notifeeAuthorization(authorizationStatus: number): NotificationAuthorization {
  switch (authorizationStatus) {
    case NotifeeAuthorizationStatus.AUTHORIZED:
      return NOTIFICATION_AUTHORIZATION.authorized;
    case NotifeeAuthorizationStatus.PROVISIONAL:
      return NOTIFICATION_AUTHORIZATION.provisional;
    case NotifeeAuthorizationStatus.NOT_DETERMINED:
      return NOTIFICATION_AUTHORIZATION.notDetermined;
    default:
      return NOTIFICATION_AUTHORIZATION.denied;
  }
}

function fromNotifee(authorizationStatus: number, afterRequest: boolean): PermissionSnapshot {
  return notificationPermissionSnapshot({
    authorization: notifeeAuthorization(authorizationStatus),
    platform: Platform.OS === 'android' ? 'android' : 'ios',
    afterRequest,
  });
}

async function readKind(kind: PermissionKind): Promise<PermissionSnapshot> {
  switch (kind) {
    case PERMISSION_KIND.location:
      return fromExpo(await Location.getForegroundPermissionsAsync());
    case PERMISSION_KIND.notifications: {
      const settings = await notifee.getNotificationSettings();
      return fromNotifee(settings.authorizationStatus, false);
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
      return fromNotifee(settings.authorizationStatus, true);
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
